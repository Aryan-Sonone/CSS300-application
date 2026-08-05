# Development Guide

## Building from Source

### Prerequisites

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y \
  libwebkit2gtk-4.1-dev libssl-dev libayatana-appindicator3-dev \
  librsvg2-dev libsecret-1-dev \
  nodejs npm \
  python3.11 python3.11-venv \
  cargo rustc  # via rustup

# Arch
sudo pacman -S webkit2gtk-4.1 openssl libayatana-appindicator librsvg libsecret \
  nodejs npm python python-virtualenv rustup
rustup default stable
```

### Full Build Process

```bash
# 1. Clone
git clone https://github.com/your-org/css300-desktop.git
cd css300-desktop

# 2. Frontend dependencies
npm ci

# 3. Build Python sidecar (required before Tauri build)
cd sidecar
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pyinstaller --onefile --name engine engine.py
cp dist/engine ../src-tauri/binaries/engine-x86_64-unknown-linux-gnu
deactivate
cd ..

# 4. Build Tauri app (includes frontend build via beforeBuildCommand)
npm run tauri build

# 5. Artifacts
ls -la src-tauri/target/release/bundle/deb/
# CSS-300_1.0.0_amd64.deb
```

### Sidecar Build Details

```bash
cd sidear
source venv/bin/activate

# Debug build (no compression, faster startup)
pyinstaller --onefile --name engine --debug engine.py

# Release build (compressed, smaller)
pyinstaller --onefile --name engine --strip --optimize=2 engine.py

# Verify
./dist/engine <<'EOF'
{"runId":"test","testModel":{"provider":"nvidia_nim","modelId":"gpt-4o","apiKey":"test"},"scoringModel":{"provider":"nvidia_nim","modelId":"gpt-4o-mini","apiKey":"test"},"datasetMode":"sample","sampleSize":1,"seed":42,"phases":{"phase1":true,"phase2":false,"phase3":false,"phase4":false},"modelType":"standard","datasetPath":"/path/to/CSS300_Dataset.json","outputDir":"/tmp/test"}
EOF

deactivate
```

### Development Mode (Hot Reload)

```bash
# Terminal 1: Frontend dev server
npm run dev  # Vite on http://localhost:1420

# Terminal 2: Tauri dev (connects to Vite)
npm run tauri dev

# Terminal 3 (optional): Sidecar changes
cd sidecar
source venv/bin/activate
# Edit runner.py, engine.py, etc.
# Rebuild sidecar when Python changes:
pyinstaller --onefile --name engine engine.py
cp dist/engine ../src-tauri/binaries/engine-x86_64-unknown-linux-gnu
# Tauri will re-spawn sidecar on next benchmark run
```

### Testing Checklist

| Layer | Command | What It Tests |
|-------|---------|---------------|
| Frontend | `npm run test` | Components, hooks, types |
| Frontend | `npm run lint` | ESLint + Prettier |
| Frontend | `npm run typecheck` | TypeScript compilation |
| Rust | `cd src-tauri && cargo test` | Unit tests, command logic |
| Rust | `cargo clippy` | Lints |
| Python | `cd sidecar && pytest` | Benchmark logic, scorers |
| Python | `ruff check .` | Python lints |
| Integration | `npm run tauri build` | Full pipeline, .deb output |

### Common Tasks

#### Add a Tauri Command

1. Edit `src-tauri/src/commands.rs` — add `#[command]` function
2. Register in `main.rs` `invoke_handler![]`
3. Add TypeScript types in `src/lib/types.ts` (if needed)
4. Call from frontend: `await invoke('command_name', { arg: value })`

#### Modify Sidecar Protocol

1. Update `sidecar/engine.py` input parsing / output emission
2. Update `src-tauri/src/sidecar.rs` `BenchmarkConfig` struct (must match JSON)
3. Update `src/engine/TauriEngine.ts` event parsing
4. Document in `docs/ARCHITECTURE.md`

#### Add a Provider

See [Adding a Provider](docs/ARCHITECTURE.md#adding-a-provider) in ARCHITECTURE.md

#### Debug Sidecar

```bash
# Run sidecar directly with test config
cd sidecar
source venv/bin/activate
cat > test_config.json <<'EOF'
{"runId":"debug","testModel":{"provider":"nvidia_nim","modelId":"gpt-4o","apiKey":"YOUR_KEY"},"scoringModel":{"provider":"nvidia_nim","modelId":"gpt-4o-mini","apiKey":"YOUR_KEY"},"datasetMode":"sample","sampleSize":3,"seed":42,"phases":{"phase1":true,"phase2":false,"phase3":false,"phase4":false},"modelType":"standard","datasetPath":"../nvidia/CSS300_Dataset.json","outputDir":"/tmp/debug"}
EOF
python engine.py < test_config.json 2>&1 | head -50
```

### Release Process

```bash
# 1. Update versions
# - src-tauri/Cargo.toml: version
# - src-tauri/tauri.conf.json: version
# - package.json: version

# 2. Tag and push
git tag v1.0.1
git push origin v1.0.1

# 3. CI builds .deb + AppImage, creates GitHub Release
# 4. Verify .deb installs: sudo dpkg -i CSS-300_1.0.1_amd64.deb
```

### Troubleshooting

| Issue | Fix |
|-------|-----|
| `Sidecar binary not found` | Rebuild sidecar: `cd sidecar && pyinstaller --onefile --name engine engine.py && cp dist/engine ../src-tauri/binaries/engine-x86_64-unknown-linux-gnu` |
| `libsecret-1 not found` | `sudo apt install libsecret-1-dev` |
| `keyring error` | Ensure `libsecret-1-0` installed; on headless CI, use `cargo test -- --test-threads=1` |
| `NVIDIA API rate limit` | Add delay in MODELS config; implement retry in `call_nvidia()` |
| `Frontend types out of sync` | Run `npm run typecheck`; ensure Rust `serde` derives match TS interfaces |