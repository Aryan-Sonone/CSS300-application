use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// Shared config types matching Python sidecar's schema
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProviderConfig {
    pub provider: String,
    pub model_id: String,
    pub api_key: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PhaseSelection {
    pub phase1: bool,
    pub phase2: bool,
    pub phase3: bool,
    pub phase4: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BenchmarkConfig {
    pub run_id: String,
    pub test_model: ProviderConfig,
    pub scoring_model: Option<ProviderConfig>,
    pub use_same_provider: bool,
    pub dataset_mode: String,
    pub sample_size: u32,
    pub seed: u64,
    pub phases: PhaseSelection,
    pub model_type: String,
    pub output_dir: String,
    pub dataset_path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DatasetPath(pub PathBuf);

#[derive(Debug, Serialize)]
pub struct ProgressEvent {
    pub phase: Option<u8>,
    pub done: u32,
    pub total: u32,
    pub message: Option<String>,
    pub log: Option<String>,
}

// Running state shared across async operations — maps run_id to child PID
#[derive(Debug, Default, Clone)]
pub struct RunningState(pub Arc<std::sync::Mutex<HashMap<String, u32>>>);

pub struct SidecarManager {
    pub app_handle: AppHandle,
    pub running: Arc<std::sync::Mutex<HashMap<String, u32>>>,
}

impl SidecarManager {
    pub fn new(app_handle: AppHandle, state: &RunningState) -> Self {
        Self {
            app_handle,
            running: state.0.clone(),
        }
    }

    pub async fn spawn(
        &self,
        config: BenchmarkConfig,
        _dataset_path: PathBuf,
        sidecar_binary: String,
    ) -> anyhow::Result<String> {
        let run_id = config.run_id.clone();

        let mut child = Command::new(&sidecar_binary)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;

        // Write config to stdin
        if let Some(mut stdin) = child.stdin.take() {
            let config_json = serde_json::to_string(&config)?;
            stdin.write_all(config_json.as_bytes())?;
            stdin.write_all(b"\n")?;
        }

        // Track running process by PID
        let child_pid = child.id();
        {
            let mut running = self.running.lock().unwrap();
            running.insert(run_id.clone(), child_pid);
        }

        // Read stdout for progress events
        let stdout = child.stdout.take().expect("stdout not captured");
        let app_handle = self.app_handle.clone();
        let run_id_clone = run_id.clone();

        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                match line {
                    Ok(line) if !line.trim().is_empty() => {
                        let _ = app_handle.emit(
                            format!("benchmark://progress/{}", run_id_clone).as_str(),
                            line,
                        );
                    }
                    Ok(_) => {}
                    Err(e) => {
                        let _ = app_handle.emit(
                            format!("benchmark://progress/{}", run_id_clone).as_str(),
                            serde_json::json!({
                                "type": "error",
                                "message": format!("Failed to read sidecar output: {}", e)
                            }).to_string(),
                        );
                        break;
                    }
                }
            }
        });

        // Read stderr for logging
        let stderr = child.stderr.take().expect("stderr not captured");
        let app_handle = self.app_handle.clone();
        let run_id_clone = run_id.clone();

        std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                match line {
                    Ok(line) if !line.trim().is_empty() => {
                        println!("[sidecar {}] {}", run_id_clone, line);
                        let _ = app_handle.emit(
                            format!("benchmark://progress/{}", run_id_clone).as_str(),
                            serde_json::json!({
                                "type": "log",
                                "message": line
                            }).to_string(),
                        );
                    }
                    _ => {}
                }
            }
        });

        Ok(run_id)
    }

    pub async fn pause(&self, run_id: &str) -> Result<(), String> {
        let running = self.running.lock().unwrap();
        if let Some(&pid) = running.get(run_id) {
            // Send SIGTERM so the sidecar can save a checkpoint before exiting
            #[cfg(unix)]
            {
                unsafe {
                    libc::kill(pid as i32, libc::SIGTERM);
                }
            }
            #[cfg(windows)]
            {
                // On Windows, terminate the process (no graceful SIGTERM equivalent)
                let _ = Command::new("taskkill")
                    .args(["/PID", &pid.to_string()])
                    .spawn();
            }
        }
        Ok(())
    }

    pub async fn cancel(&self, run_id: &str) -> Result<(), String> {
        let mut running = self.running.lock().unwrap();
        if let Some(pid) = running.remove(run_id) {
            // Send SIGKILL to force-stop the sidecar
            #[cfg(unix)]
            {
                unsafe {
                    libc::kill(pid as i32, libc::SIGKILL);
                }
            }
            #[cfg(windows)]
            {
                let _ = Command::new("taskkill")
                    .args(["/F", "/PID", &pid.to_string()])
                    .spawn();
            }
        }
        Ok(())
    }

    pub fn get_sidecar_path(&self, app: &AppHandle) -> anyhow::Result<String> {
        let resource_dir = app.path().resource_dir()?;

        let bin_name = if cfg!(target_os = "windows") {
            "engine.exe"
        } else {
            "engine"
        };

        // Check bundled location first
        let bundled = resource_dir.join("binaries").join(bin_name);
        if bundled.exists() {
            return Ok(bundled.to_string_lossy().to_string());
        }

        // Fallback to development location
        let dev = std::env::current_dir()?.join("sidecar").join("dist").join(bin_name);
        if dev.exists() {
            return Ok(dev.to_string_lossy().to_string());
        }

        anyhow::bail!("Sidecar binary not found at {} or {}", bundled.display(), dev.display())
    }
}

pub async fn get_dataset_path(app_handle: &AppHandle) -> anyhow::Result<String> {
    let resource_dir = app_handle.path().resource_dir()?;
    let dataset_path = resource_dir.join("CSS300_Dataset.json");

    if dataset_path.exists() {
        return Ok(dataset_path.to_string_lossy().to_string());
    }

    // Fallback for development
    let dev_path = std::env::current_dir()?.join("nvidia").join("CSS300_Dataset.json");
    if dev_path.exists() {
        return Ok(dev_path.to_string_lossy().to_string());
    }

    anyhow::bail!("CSS300_Dataset.json not found in resources or dev location")
}