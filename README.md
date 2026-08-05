# CSS-300 Desktop Benchmark App

An open-source desktop application for evaluating Large Language Models against the CSS-300 Benchmark (Sycophancy, RAG resilience, and behavioral safety). Built using **Tauri v2**, **Rust**, **React**, and an execution engine powered by a **Python sidecar process**.

---

# Architecture Overview

The application operates using a hybrid architecture:

- **Frontend:** React, TypeScript, Tailwind CSS, and Vite running inside Tauri's webview.
- **Tauri / Rust Core:** Handles application IPC, native OS key storage (`keyring` crate / `libsecret`), process management, and dataset resource mapping.
- **Python Sidecar:** Executable process spawned by Rust that executes benchmark runs, interfaces with model APIs, calculates scores, and emits JSONL stream progress back to the UI.

```text
+-------------------------------------------------------------+
|                      React Frontend                         |
|             (Setup, Progress, Report UI)                    |
+------------------------------+------------------------------+
                               | IPC (Invoke & Events)
                               v
+-------------------------------------------------------------+
|                  Tauri v2 Core (Rust)                       |
|   - Native Keyring Storage  - Sidecar Process Manager       |
|   - App Config & Paths      - Event Relay                   |
+------------------------------+------------------------------+
                               | Stdin / Stdout (JSONL Stream)
                               v
+-------------------------------------------------------------+
|                Python Sidecar Executable                    |
|   - NVIDIA NIM Runner       - Phase Execution Engine        |
|   - GPT-4o-mini Scorer      - Local JSON Checkpointing      |
+-------------------------------------------------------------+
```

---

# Features

- **Desktop Native:** High-performance cross-platform application packaging (`.deb` / `AppImage`).
- **Secure Key Management:** Hardware/OS-backed API key storage using system keychains (GNOME Keyring / KWallet via `libsecret`).
- **Real-time Monitoring:** Live JSONL progress tracking per phase with real-time score calculation.
- **Checkpointing & Resumption:** Automatic per-phase checkpoint saving for seamless pause and resume capabilities.
- **Bundled Benchmark Dataset:** Ships with `CSS300_Dataset.json` pre-configured.

---

# Prerequisites

Before building from source, ensure your environment satisfies the following dependencies.

## System Requirements

| Component | Version |
|-----------|---------|
| OS | Linux (Debian/Ubuntu 22.04+ recommended) |
| Node.js | v18.0 or higher |
| Rust | v1.75 or higher (`rustup stable`) |
| Python | v3.10 or higher |
| PyInstaller | Latest |

---

## System Libraries (Debian/Ubuntu)

```bash
sudo apt-get update && sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libsecret-1-dev
```

---

# Building from Source

## 1. Clone the Repository

```bash
git clone https://github.com/YOUR-ORG/CSS300.git
cd CSS300
```

---

## 2. Install Frontend Dependencies

```bash
npm install
```

---

## 3. Build the Python Sidecar

The Tauri application requires a compiled Python sidecar binary placed in `src-tauri/binaries/`.

```bash
cd sidecar

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Bundle into single executable using PyInstaller
pyinstaller --onefile --name engine engine.py

# Return to repository root
cd ..

# Create target binary directory
mkdir -p src-tauri/binaries/

# Copy binary with target triple extension
cp sidecar/dist/engine \
src-tauri/binaries/engine-x86_64-unknown-linux-gnu
```

> **Note:** Replace `x86_64-unknown-linux-gnu` with your target host triple if building for a different architecture.

---

## 4. Build Desktop Package

```bash
npm run tauri build
```

The generated Debian package will be located at:

```text
src-tauri/target/release/bundle/deb/CSS-300_1.0.0_amd64.deb
```

---

# Installation & Running

## Install Debian Package

```bash
sudo dpkg -i src-tauri/target/release/bundle/deb/CSS-300_1.0.0_amd64.deb

# Fix any missing dependencies
sudo apt-get install -f
```

---

## Run Installed Application

```bash
css300-app
```

---

# Development Mode

Ensure the Python sidecar executable has already been built and copied into:

```text
src-tauri/binaries/
```

Then start development mode:

```bash
npm run tauri dev
```

---

# Project Structure

```text
├── docs/
│   ├── ARCHITECTURE.md
│   └── BUILD.md
├── nvidia/
│   └── CSS300_Dataset.json
├── sidecar/
│   ├── engine.py
│   ├── runner.py
│   ├── scorer.py
│   ├── checkpointing.py
│   └── requirements.txt
├── src/
│   ├── engine/
│   ├── hooks/
│   ├── pages/
│   └── lib/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands.rs
│   │   ├── sidecar.rs
│   │   └── keyring.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
└── README.md
```

---

# Citation

If you use the CSS-300 benchmark or desktop application in your research, please cite:

```bibtex
@article{css300_2025,
  title={CSS-300: A Comprehensive Benchmark for Model Sycophancy and Behavioral Evaluation},
  author={CSS-300 Research Team},
  journal={arXiv preprint arXiv:XXXX.XXXXX},
  year={2025}
}
```

---

# License

- **Codebase:** MIT License
- **Dataset (`nvidia/CSS300_Dataset.json`):** Creative Commons Attribution 4.0 International (CC BY 4.0)
