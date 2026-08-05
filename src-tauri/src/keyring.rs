// Keyring module - uses system keyring crate for OS credential storage
// Commands are defined in commands.rs to avoid duplication

pub mod commands_keyring {
    use keyring::Entry;

    pub async fn save_api_key(provider: String, key: String) -> Result<(), String> {
        let entry = Entry::new("css300", &provider).map_err(|e| e.to_string())?;
        entry.set_password(&key).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn load_api_key(provider: String) -> Result<Option<String>, String> {
        let entry = Entry::new("css300", &provider).map_err(|e| e.to_string())?;
        match entry.get_password() {
            Ok(key) => Ok(Some(key)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub async fn delete_api_key(provider: String) -> Result<(), String> {
        let entry = Entry::new("css300", &provider).map_err(|e| e.to_string())?;
        entry.delete_credential().map_err(|e| e.to_string())?;
        Ok(())
    }
}