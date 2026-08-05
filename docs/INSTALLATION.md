# Installation

## System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| OS | Ubuntu 20.04+ / Debian 11+ | Ubuntu 22.04+ / Debian 12+ |
| glibc | ≥ 2.31 | ≥ 2.35 |
| CPU | x86_64 (AVX2) | x86_64 (AVX2, 8+ cores) |
| RAM | 4 GB | 16 GB |
| Disk | 2 GB free | 10 GB free |
| GPU | — | NVIDIA GPU (for local models) |
| Network | HTTPS to `integrate.api.nvidia.com` | Low latency to NVIDIA endpoints |

### Required System Packages (Ubuntu/Debian)

```bash
sudo apt update && sudo apt install -y \
  libwebkit2gtk-4.1-0 \
  libssl3 \
  libayatana-appindicator3-1 \
  librsvg2-common \
  libsecret-1-0 \
  libgtk-3-0 \
  libgdk-pixbuf-2.0-0
```

## Install .deb Package

```bash
# Download latest release
wget https://github.com/your-org/css300-desktop/releases/latest/download/CSS-300_1.0.0_amd64.deb

# Install
sudo dpkg -i CSS-300_1.0.0_amd64.deb

# Fix any missing deps
sudo apt install -f

# Launch
css300
# or find "CSS-300" in application menu
```

### Uninstall

```bash
sudo dpkg -r css300-app
# Config/results preserved in ~/.config/CSS-300/ and ~/css300-results/
```

## AppImage (Not Yet Available)

AppImage build currently blocked on `linuxdeploy` plugin. See [DEVELOPMENT.md](DEVELOPMENT.md#appimage) for status.

When ready:
```bash
wget https://github.com/.../CSS-300_1.0.0_amd64.AppImage
chmod +x CSS-300_1.0.0_amd64.AppImage
./CSS-300_1.0.0_amd64.AppImage
```

## First Launch Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Welcome Screen                                            │
│    "CSS-300 Benchmark — Configure NVIDIA API Key to begin"  │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Setup Page (Setup.tsx)                                    │
│    ├─ NVIDIA API Key: [____________________]  (saved to     │
│    │   OS keyring — never written to disk)                   │
│    ├─ [Test Connection] ──► validates key via NVIDIA API    │
│    ├─ [Refresh Models] ──► fetches model list from NVIDIA   │
│    ├─ Model Dropdown: [deepseek-ai/deepseek-r1 ▼]           │
│    ├─ Phases: ☑ Phase 1  ☑ Phase 2  ☑ Phase 3  ☑ Phase 4    │
│    └─ [Start Benchmark]                                      │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Progress Panel                                            │
│    Real-time per-phase progress bars + log tail             │
│    [Pause] [Cancel]                                         │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Report Page (auto-navigate on complete)                   │
│    CSS Score, ASR, MAS, SAG, RDR metrics + charts           │
│    [Export JSON] [View Raw Results]                         │
└─────────────────────────────────────────────────────────────┘
```

## Obtaining an NVIDIA API Key

1. Go to [NVIDIA NGC](https://ngc.nvidia.com/)
2. Sign in / create account
3. Navigate to **Setup → Get API Key**
4. Generate key (scoped to NIM access)
5. Copy key (starts with `nvapi-`)

## Data Locations

| Data | Location |
|------|----------|
| API Key | OS keyring (service: `css300`, account: `nvidia_nim`) |
| Dataset | Bundled in app (read-only) |
| Results | `~/css300-results/run_<model>_<timestamp>/` |
| Config | `~/.config/CSS-300/` (Tauri store plugin) |
| Logs | `~/.cache/CSS-300/` / journalctl |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "libwebkit2gtk not found" | `sudo apt install libwebkit2gtk-4.1-0` |
| "Sidecar binary not found" | Rebuild with `npm run tauri build` (bundles sidecar) |
| "Keyring access denied" | Ensure `libsecret-1-0` installed; check keyring daemon running |
| "Connection test failed" | Verify NVIDIA API key valid; check network/firewall |
| "No models listed" | API key may lack NIM permissions; use key from NGC |
| App won't launch | Run from terminal: `css300` → check stderr |