// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod sidecar;
mod keyring;
mod api_client;
mod checkpoint;
mod dataset;
mod providers;
mod runner;
mod scorer;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard::init())
        .plugin(tauri_plugin_keyring::init())
        .invoke_handler(tauri::generate_handler![
            commands::start_benchmark,
            commands::pause_benchmark,
            commands::resume_benchmark,
            commands::cancel_benchmark,
            commands::get_dataset_path,
            commands::get_output_dir,
            commands::save_api_key,
            commands::load_api_key,
            commands::test_connection,
            commands::get_available_models,
        ])
        .setup(|app| {
            // Resolve the dataset. Bundled builds ship it at the resource dir root
            // (see tauri.conf.json `resources`); running the binary straight out of
            // target/ has no resource dir, so fall back to the repo copy.
            let resource_dir = app.path().resource_dir()?;
            let exe_dir = std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|d| d.to_path_buf()));

            let mut candidates = vec![
                resource_dir.join("CSS300_Dataset.json"),
                // legacy `resources: ["../nvidia/..."]` layout
                resource_dir.join("_up_/nvidia/CSS300_Dataset.json"),
            ];
            if let Some(dir) = exe_dir {
                // target/release/<exe> -> repo root is three levels up
                candidates.push(dir.join("CSS300_Dataset.json"));
                candidates.push(dir.join("../../../nvidia/CSS300_Dataset.json"));
            }

            let dataset_path = candidates
                .iter()
                .find(|p| p.exists())
                .cloned()
                // keep the canonical path so the error message names the expected location
                .unwrap_or_else(|| resource_dir.join("CSS300_Dataset.json"));

            // Store dataset path in state for sidecar access
            app.manage(sidecar::DatasetPath(dataset_path));

            Ok(())
        })
        .manage(commands::BenchmarkState::default())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}