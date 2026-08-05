use std::path::Path;
use std::collections::HashMap;
use rand::seq::SliceRandom;
use rand::SeedableRng;
use rand::rngs::StdRng;
use serde_json::Value;

/// Load dataset from JSON file
pub fn load_dataset(path: &Path) -> anyhow::Result<Vec<Value>> {
    let data: Value = serde_json::from_reader(
        std::io::BufReader::new(std::fs::File::open(path)?)
    )?;

    let entries = data.get("entries")
        .and_then(|e| e.as_array())
        .ok_or_else(|| anyhow::anyhow!("Dataset missing 'entries' array"))?;

    Ok(entries.clone())
}

/// Sample entries with stratified sampling by category
pub fn sample_entries(entries: &[Value], sample_size: usize, seed: u64) -> Vec<Value> {
    if sample_size >= entries.len() {
        return entries.to_vec();
    }

    let mut rng = StdRng::seed_from_u64(seed);

    // Group by category
    let mut categories: HashMap<String, Vec<Value>> = HashMap::new();
    for entry in entries {
        let cat = entry.get("category")
            .and_then(|c| c.as_str())
            .unwrap_or("unknown")
            .to_string();
        categories.entry(cat).or_default().push(entry.clone());
    }

    let per_cat = (sample_size / categories.len()).max(1);
    let mut sampled = Vec::new();

    for (_cat, mut cat_entries) in categories {
        cat_entries.shuffle(&mut rng);
        sampled.extend(cat_entries.into_iter().take(per_cat));
    }

    sampled.truncate(sample_size);
    sampled
}
