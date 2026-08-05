use std::path::Path;
use serde_json::Value;

/// Load checkpoint from file. Returns {"results": {}} if not found or invalid.
pub fn load_checkpoint(path: &Path) -> Value {
    let empty = serde_json::json!({"results": {}});

    if !path.exists() {
        return empty;
    }

    match std::fs::read(path) {
        Ok(bytes) => {
            // Try UTF-8 first, then fallback encodings
            let text = String::from_utf8(bytes.clone())
                .unwrap_or_else(|_| {
                    // Try as latin1 (cp1252 approximation)
                    bytes.iter().map(|&b| b as char).collect()
                });

            match serde_json::from_str::<Value>(&text) {
                Ok(data) => {
                    let done = data.get("results")
                        .and_then(|r| r.as_object())
                        .map(|o| o.len())
                        .unwrap_or(0);
                    if done > 0 {
                        eprintln!("  Resuming checkpoint ({} done)", done);
                    }
                    data
                }
                Err(_) => {
                    eprintln!("  Warning: could not parse checkpoint {:?} — starting fresh", path);
                    empty
                }
            }
        }
        Err(_) => empty,
    }
}

/// Save checkpoint to file as UTF-8 JSON.
pub fn save_checkpoint(path: &Path, data: &Value) -> Result<(), std::io::Error> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let json = serde_json::to_string_pretty(data)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
    std::fs::write(path, json)
}
