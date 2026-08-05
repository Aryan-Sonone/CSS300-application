use tauri::{AppHandle, Emitter, State, command};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use reqwest::Client;
use chrono;
use std::collections::HashMap;
use std::sync::Arc;

use crate::runner::{self, RunConfig, PhaseSelection as RunnerPhases};
use crate::sidecar::{DatasetPath, ProviderConfig, PhaseSelection};
use crate::providers;

use keyring::Entry;

// Running state — maps run_id to a cancellation token
#[derive(Debug, Default, Clone)]
pub struct BenchmarkState(pub Arc<std::sync::Mutex<HashMap<String, tokio_util::sync::CancellationToken>>>);

#[command]
pub async fn save_api_key(provider: String, key: String) -> Result<(), String> {
    let entry = Entry::new("css300", &provider).map_err(|e| e.to_string())?;
    entry.set_password(&key).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn load_api_key(provider: String) -> Result<Option<String>, String> {
    let entry = Entry::new("css300", &provider).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FrontendRunConfig {
    pub name: String,
    pub test_model: ProviderConfig,
    pub use_same_provider: bool,
    pub scoring_model: Option<ProviderConfig>,
    pub dataset_mode: String,
    pub sample_size: u32,
    pub seed: u64,
    pub phases: PhaseSelection,
    pub model_type: String,
}

#[command]
pub async fn start_benchmark(
    app: AppHandle,
    config: FrontendRunConfig,
    state: State<'_, BenchmarkState>,
    dataset_path: State<'_, DatasetPath>,
) -> Result<String, String> {
    let run_id = Uuid::new_v4().to_string();

    // Build output directory path
    let output_dir = dirs::home_dir()
        .ok_or("Could not determine home directory")?
        .join("css300-results");

    // Determine scoring model
    let scoring_model = if config.use_same_provider {
        config.test_model.clone()
    } else {
        config.scoring_model.clone().unwrap_or_else(|| config.test_model.clone())
    };

    // Resolve scoring base URL from provider catalog
    let provider_catalog = providers::get_providers();
    let scoring_base_url = provider_catalog
        .get(&scoring_model.provider)
        .map(|p| p.base_url.clone())
        .unwrap_or_else(|| "https://api.openai.com/v1".into());

    // Build runner config
    let run_config = RunConfig {
        run_id: run_id.clone(),
        test_model_provider: config.test_model.provider.clone(),
        test_model_id: config.test_model.model_id.clone(),
        test_api_key: config.test_model.api_key.clone(),
        scoring_model_id: scoring_model.model_id.clone(),
        scoring_api_key: scoring_model.api_key.clone(),
        scoring_base_url,
        dataset_mode: config.dataset_mode,
        sample_size: config.sample_size,
        seed: config.seed,
        phases: RunnerPhases {
            phase1: config.phases.phase1,
            phase2: config.phases.phase2,
            phase3: config.phases.phase3,
            phase4: config.phases.phase4,
        },
        model_type: config.model_type,
        output_dir: output_dir.to_string_lossy().to_string(),
        dataset_path: dataset_path.0.to_string_lossy().to_string(),
    };

    // Create cancellation token
    let cancel = tokio_util::sync::CancellationToken::new();
    {
        let mut running = state.0.lock().unwrap();
        running.insert(run_id.clone(), cancel.clone());
    }

    // Create channel for progress events
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<serde_json::Value>();

    // Spawn event forwarder — reads from channel, emits to frontend
    let app_clone = app.clone();
    let run_id_clone = run_id.clone();
    tokio::spawn(async move {
        while let Some(mut event) = rx.recv().await {
            // Stamp the run id into the payload so a single global listener can
            // route events. The frontend cannot subscribe to the per-run channel
            // until `start_benchmark` returns, by which time the runner has
            // already emitted — Tauri events do not buffer, so those were lost.
            if let Some(obj) = event.as_object_mut() {
                obj.insert("runId".into(), serde_json::json!(run_id_clone));
            }
            let event_str = serde_json::to_string(&event).unwrap_or_default();
            let _ = app_clone.emit("benchmark://progress", event_str);
        }
    });

    // Spawn benchmark runner
    let state_clone = state.0.clone();
    let run_id_clone2 = run_id.clone();
    tokio::spawn(async move {
        tokio::select! {
            result = runner::run_benchmark(run_config, tx.clone()) => {
                if let Err(e) = result {
                    let _ = tx.send(serde_json::json!({
                        "type": "error",
                        "message": format!("Benchmark failed: {}", e),
                    }));
                }
            }
            _ = cancel.cancelled() => {
                let _ = tx.send(serde_json::json!({
                    "type": "cancelled",
                    "message": "Benchmark cancelled by user",
                }));
            }
        }
        // Clean up running state
        let mut running = state_clone.lock().unwrap();
        running.remove(&run_id_clone2);
    });

    Ok(run_id)
}

#[command]
pub async fn pause_benchmark(
    _app: AppHandle,
    run_id: String,
    state: State<'_, BenchmarkState>,
) -> Result<(), String> {
    // For pause, we cancel current run — checkpoint allows resume
    let running = state.0.lock().unwrap();
    if let Some(token) = running.get(&run_id) {
        token.cancel();
    }
    Ok(())
}

#[command]
pub async fn resume_benchmark(
    app: AppHandle,
    _run_id: String,
    config: FrontendRunConfig,
    state: State<'_, BenchmarkState>,
    dataset_path: State<'_, DatasetPath>,
) -> Result<String, String> {
    // Resume is a new start — checkpoints handle continuation
    start_benchmark(app, config, state, dataset_path).await
}

#[command]
pub async fn cancel_benchmark(
    _app: AppHandle,
    run_id: String,
    state: State<'_, BenchmarkState>,
) -> Result<(), String> {
    let mut running = state.0.lock().unwrap();
    if let Some(token) = running.remove(&run_id) {
        token.cancel();
    }
    Ok(())
}

#[command]
pub async fn get_dataset_path(
    dataset_path: State<'_, DatasetPath>,
) -> Result<String, String> {
    Ok(dataset_path.0.to_string_lossy().to_string())
}

#[command]
pub async fn get_output_dir() -> Result<String, String> {
    let output_dir = dirs::home_dir()
        .ok_or("Could not determine home directory")?
        .join("css300-results");
    Ok(output_dir.to_string_lossy().to_string())
}

#[command]
pub async fn test_connection(
    provider: String,
    model_id: String,
    api_key: String,
) -> Result<ConnectionResult, String> {
    let provider_catalog = providers::get_providers();
    let provider_entry = provider_catalog.get(&provider)
        .ok_or_else(|| format!("Unsupported provider: {}", provider))?;

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let start = std::time::Instant::now();
    let response = client
        .get(format!("{}/models", provider_entry.base_url))
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    let latency_ms = start.elapsed().as_millis() as u64;

    if response.status().is_success() {
        Ok(ConnectionResult {
            status: "connected".to_string(),
            latency_ms: Some(latency_ms),
            message: format!("Successfully connected to {} API", provider),
        })
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Ok(ConnectionResult {
            status: "invalid".to_string(),
            latency_ms: Some(latency_ms),
            message: format!("API error ({}): {}", status, error_text),
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionResult {
    pub status: String,
    pub latency_ms: Option<u64>,
    pub message: String,
}

#[command]
pub async fn get_available_models(
    provider: String,
    api_key: String,
) -> Result<Vec<String>, String> {
    let provider_catalog = providers::get_providers();
    let provider_entry = provider_catalog.get(&provider)
        .ok_or_else(|| format!("Unsupported provider: {}", provider))?;

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(format!("{}/models", provider_entry.base_url))
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API error: {}", response.status()));
    }

    #[derive(Deserialize)]
    struct ModelsResponse {
        data: Vec<ModelInfo>,
    }

    #[derive(Deserialize)]
    struct ModelInfo {
        id: String,
    }

    let models: ModelsResponse = response.json().await.map_err(|e| e.to_string())?;

    Ok(models.data.into_iter().map(|m| m.id).collect())
}
