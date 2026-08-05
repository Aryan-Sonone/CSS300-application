# CSS-300 Desktop Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     Tauri v2 Application                                         │
│                                                                                                  │
│  ┌────────────────────────┐         ┌────────────────────────┐        ┌───────────────────────┐  │
│  │   Frontend             │         │   Rust Backend         │        │   Python Sidecar      │  │
│  │   (React / TypeScript) │  IPC    │   (Commands Engine)    │  STD   │   (engine.py)         │  │
│  │                        │ ◄─────► │                        │ ◄────► │                       │  │
│  │   • Setup.tsx          │ Event   │   • commands.rs        │ IO /   │   • runner.py         │  │
│  │   • Report.tsx         │ Stream  │   • sidecar.rs         │ JSONL  │   • scorer.py         │  │
│  │   • useEngine.tsx      │         │   • keyring.rs         │        │   • checkpointing.py  │  │
│  └────────────────────────┘         └────────────────────────┘        └───────────────────────┘  │
│              ▲                                  ▲                                 ▲              │
│              │                                  │                                 │              │
│              │                        ┌─────────┴─────────┐                       │              │
│              │                        │   OS Keyring      │                       │              │
│              │                        │   (libsecret /    │                       │              │
│              │                        │    Keychain /     │                       │              │
│              │                        │    CredMan)       │                       │              │
│              └────────────────────────┴───────────────────┴───────────────────────┘              │
│                                                   ▲                                              │
│                                                   │ HTTPS                                        │
│                                         ┌─────────┴─────────┐                                    │
│                                         │   External APIs   │                                    │
│                                         │                   │                                    │
│                                         │  • NVIDIA NIM API │                                    │
│                                         │  • OpenAI API     │                                    │
│                                         └───────────────────┘                                    │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

```

---

## Component Responsibilities

| Layer | Language / Tech | Primary Responsibilities |
| --- | --- | --- |
| **Frontend** | TypeScript, React | User interface, configuration forms, real-time progress displays, report visualizers. |
| **Tauri Commands** | Rust | Serves as the primary IPC boundary (10 public commands), handles credential persistence, manages sidecar execution. |
| **Sidecar Manager** | Rust | Manages sidecar binary lifecycle, pipes `stdin`/`stdout` JSONL streams, converts output into Tauri events. |
| **Keyring Service** | Rust | Interacts directly with platform-native secret stores via the `keyring` crate. |
| **Sidecar Entry** | Python (`engine.py`) | Processes `stdin` runtime configurations and streams structured `stdout` JSONL events. |
| **Benchmark Runner** | Python (`runner.py`) | Coordinates and executes the 5-phase evaluation workflow. |
| **Scorer Engine** | Python (`scorer.py`) | Evaluates model responses via OpenAI API integrations (e.g., GPT-4o-mini). |
| **State Persistence** | Python (`checkpointing.py`) | Handles stage-by-stage JSON checkpointing for job pausing and resilience. |
| **Provider Catalog** | Python (`providers.py`) | Manages model configurations, catalog state, and dynamic API client construction. |

---

## Tauri IPC API Surface

Commands are defined in `src-tauri/src/commands.rs` and registered inside `main.rs`.

| Command | Input Parameters | Return Type | Functional Description |
| --- | --- | --- | --- |
| `save_api_key` | `provider: string`, `key: string` | `Result<(), Error>` | Securely stores provider credentials in the host system's OS keyring. |
| `load_api_key` | `provider: string` | `Option<string>` | Fetches provider credentials from the host system's OS keyring. |
| `start_benchmark` | `config: FrontendRunConfig` | `run_id: string` | Initializes sidecar subprocess with passed parameters and yields a execution UUID. |
| `pause_benchmark` | `run_id: string` | `Result<(), Error>` | Dispatches a `SIGTERM` signal to the active sidecar, prompting a final checkpoint dump. |
| `resume_benchmark` | `run_id: string`, `config: FrontendRunConfig` | `run_id: string` | Re-spawns sidecar utilizing stored state checkpoints. |
| `cancel_benchmark` | `run_id: string` | `Result<(), Error>` | Forces a `SIGKILL` termination to shut down active sidecar jobs instantly. |
| `get_dataset_path` | *None* | `string` | Resolves absolute host system path to the bundled `CSS300_Dataset.json`. |
| `get_output_dir` | *None* | `string` | Resolves output destination path (`~/css300-results/`). |
| `test_connection` | `provider: string`, `model_id: string`, `api_key: string` | `ConnectionResult` | Conducts a smoke test against target provider endpoint via sidecar. |
| `get_available_models` | `provider: string`, `api_key: string` | `string[]` | Fetches registered dynamic model list (e.g. via NVIDIA `/v1/models`). |

### Rust Type Specifications

#### `FrontendRunConfig` (`commands.rs`)

```rust
pub struct FrontendRunConfig {
    pub name: String,
    pub test_model: ProviderConfig,
    pub use_same_provider: bool,
    pub scoring_model: Option<ProviderConfig>,
    pub dataset_mode: String,      // "sample" | "full"
    pub sample_size: u32,
    pub seed: u64,
    pub phases: PhaseSelection,    // Phase selection map
    pub model_type: String,        // "standard" | "thinking"
}

```

#### `ProviderConfig` (`sidecar.rs`)

```rust
pub struct ProviderConfig {
    pub provider: String,   // e.g., "nvidia_nim"
    pub model_id: String,   // e.g., "deepseek-ai/deepseek-r1"
    pub api_key: String,
}

```

#### `PhaseSelection` (`sidecar.rs`)

```rust
pub struct PhaseSelection {
    pub phase1: bool,
    pub phase2: bool,
    pub phase3: bool,
    pub phase4: bool,
}

```

---

## Sidecar Protocol Specifications

### Process Sequence Lifecycle

```
Tauri Backend (Rust)                         Python Sidecar Process
      │                                                │
      ├────── Spawns `engine.bin` Subprocess ─────────►│
      │                                                │
      ├────── Pass JSON Configuration via STDIN ──────►│
      │                                                ├─► Parse JSON runtime config
      │                                                ├─► Instantiate API client handlers
      │                                                ├─► Load local dataset into memory
      │                                                ├─► Emit {"type": "config"}
      │                                                ├─► Emit {"type": "dataset"}
      │                                                │
      │                                                ├─► Phase 1 Execution Loop
      │ ◄──── STDOUT Stream (JSONL Formatted) ─────────┼───► Emit {"type": "progress", "phase": 1}
      │                                                ┼───► Emit {"type": "checkpoint"}
      │                                                │
      │                                                ├─► Phase 2-4 Loops (If Applicable)
      │                                                │     ...
      │                                                │
      │                                                ├─► Phase 5 Execution (CSS Summary)
      │ ◄──── Final Completion Signal (JSONL) ─────────┼───► Emit {"type": "complete"}
      │                                                │
      ├────── Intercepts JSONL Lines ──────────────────┤
      │                                                │
      ▼ Emit Event Channel                             ▼
  "benchmark://progress/{runId}"

```

### Protocol Payloads

#### Input Interface (`stdin` — Single JSON Envelope)

```json
{
  "runId": "550e8400-e29b-41d4-a716-446655440000",
  "testModel": {
    "provider": "nvidia_nim",
    "modelId": "deepseek-ai/deepseek-r1",
    "apiKey": "nvapi-xxxxxxxxxxxxxxxxxxxxxxxx"
  },
  "scoringModel": {
    "provider": "nvidia_nim",
    "modelId": "gpt-4o-mini",
    "apiKey": "nvapi-xxxxxxxxxxxxxxxxxxxxxxxx"
  },
  "datasetMode": "sample",
  "sampleSize": 50,
  "seed": 42,
  "phases": {
    "phase1": true,
    "phase2": true,
    "phase3": true,
    "phase4": true
  },
  "modelType": "standard",
  "datasetPath": "/app/resources/CSS300_Dataset.json",
  "outputDir": "/home/user/css300-results"
}

```

#### Output Stream Schema (`stdout` — JSONL)

| Message Type | Emitted Properties | Event Trigger Condition |
| --- | --- | --- |
| `config` | `runId`, `model`, `modelType`, `phases`, `datasetMode`, `sampleSize` | Immediately following task initialization. |
| `dataset` | `total`, `mode` | Immediately after parsing dataset file into memory. |
| `progress` | `phase`, `stage`, `done`, `total`, `message`, `remaining` | Periodic update batching (every ~10 items). |
| `checkpoint` | `phase`, `path` | Output payload after completing each phase. |
| `complete` | `runId`, `resultsDir`, `summary{CSS, ASR, MAS, SAG, RDR}` | Successful benchmark completion. |
| `error` | `message` | Unhandled failure state or exception catch. |
| `log` | `message` | Internal application logging / `stderr` passthrough. |

#### JSONL Message Examples

```json
{"type":"progress","phase":1,"stage":"progress","done":50,"total":300,"message":"Phase 1: 50/300"}
{"type":"checkpoint","phase":1,"path":"/tmp/p1_checkpoint.json"}
{"type":"complete","runId":"550e8400-e29b-41d4-a716-446655440000","resultsDir":"/home/user/css300-results/run_deepseek-r1_2026-07-24_143022","summary":{"CSS":0.0123,"ASR":1.2,"MAS":0.5,"SAG":2.1}}

```

### Tauri Event Channel Interface

The frontend subscribes to real-time events via topic pattern: `benchmark://progress/{runId}`.

```typescript
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen<string>(`benchmark://progress/${runId}`, (event) => {
  const payload = JSON.parse(event.payload);
  // Payload structured according to Sidecar JSONL spec
});

```

---

## End-to-End Execution Flow

```
 [1. Initialization]
       │
       ├──► User fills out parameters in `Setup.tsx`
       ├──► Key Submission   ──► `save_api_key("nvidia_nim", key)`
       ├──► Network Test     ──► `test_connection()`
       └──► Provider Query   ──► `get_available_models()` ──► Populate select menu
       │
 [2. Execution Trigger]
       │
       ├──► User clicks "Start Benchmark"
       ├──► Client constructs `FrontendRunConfig` payload
       └──► Client invokes `start_benchmark(config)`
             │
             ├──► Rust resolves resource paths (`dataset_path`, `output_dir`)
             ├──► Subprocess spawned with JSON initialization payload piped to stdin
             └──► Returns generated `run_id` immediately to client
       │
 [3. Sidecar Engine Processing]
       │
       ├──► Phase 1: 300 baseline queries evaluated ──► Scored ──► State Checkpointed
       ├──► Phase 2: Conflict prompt testing (if thinking model) ──► Compute CI / SRD metrics
       ├──► Phase 3: Authority testing across 4 tiers ──► Compute ASR
       ├──► Phase 4: Temporal evaluation (3 distinct frames) ──► Compute MAS
       └──► Phase 5: Calculate overall metric score:
                          CSS = 0.5 * (ASR / 100) + 0.5 * (MAS / 100)
                    Outputs `css_summary.json` and phase log files.
       │
 [4. Client Event Monitoring]
       │
       ├──► Streams live execution state back to progress UI indicators
       └──► Pipes system activity log directly into execution terminal viewer
       │
 [5. Final Completion Step]
       │
       ├──► Captures `"type": "complete"` payload
       ├──► Routes view state to `Report.tsx`
       └──► Decodes output directory `css_summary.json` for dashboard visualization

```

---

## Provider Abstraction Interface

### Sidecar Provider Catalog (`sidecar/providers.py`)

```python
PROVIDERS = {
    "nvidia_nim": {
        "base_url": "https://integrate.api.nvidia.com/v1",
        "default_model": "deepseek-ai/deepseek-r1",
        "kind": "openai",  # OpenAI-compatible client integration
        "cors": "unconfirmed",
    },
    "openai": { ... },
    "anthropic": { ... },
    # Local providers (Ollama, LM Studio, llama.cpp, etc.)
}

```

### Model Configuration Registry

```python
MODELS = {
    "gpt-4o": {
        "id": "gpt-4o",
        "provider": "nvidia_nim",
        "has_cot": False,
        "max_tokens": 1024,
        "delay": 2.7,
        "score_model": "gpt-4o-mini",
        "score_provider": "openai",
    },
    # ...
}

```

### Client Constructor (`providers.py`)

```python
def get_clients(nvidia_key: str, openai_key: str) -> tuple[OpenAI, OpenAI]:
    """Instantiates base target client along with dedicated evaluator client."""
    nv_client = OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key=nvidia_key)
    oa_client = OpenAI(api_key=openai_key)
    return nv_client, oa_client

```

### Steps to Implement a New Provider

1. **Register Provider** in `sidecar/providers.py`:
```python
"my_provider": {
    "base_url": "https://api.myprovider.com/v1",
    "default_model": "my-model",
    "kind": "openai",  # or "anthropic"
    "cors": "blocked",
}

```


2. **Register Target Models** inside `MODELS` dict (defines throttle rates, reasoning capability, evaluator model mappings).
3. **Extend Client Handlers** in `get_clients()` if non-standard authentication methods are required.
4. **Extend Command Route** inside `commands.rs::get_available_models` if the endpoint supports automated `/v1/models` discovery:
```rust
if provider == "my_provider" {
    let url = format!("{}/models", base_url);
    // Dispatch HTTP request and return parsed array of Model ID strings
}

```


5. **Update Frontend Definitions** inside `src/lib/types.ts`:
```typescript
export interface ProviderConfig {
  provider: string;
  modelId: string;
  apiKey: string;
  customParameters?: Record<string, unknown>;
}

```


6. Update this document (`ARCHITECTURE.md`) to reflect newly added provider support.

---

## Source Directory Index

| Subpath / File | Module Category | Technical Responsibility |
| --- | --- | --- |
| `src-tauri/src/main.rs` | Tauri / Rust Entry | App bootstrap, plugin registry, state management init, command wiring. |
| `src-tauri/src/commands.rs` | Tauri / Rust Core | Public IPC surface API implementations. |
| `src-tauri/src/sidecar.rs` | Tauri / Rust Process | Subprocess lifecycle engine (Piping STDIO, event dispatch). |
| `src-tauri/src/keyring.rs` | Tauri / Rust Security | Native secret storage wrapper interface. |
| `sidecar/engine.py` | Python Sidecar Entry | Process bridge: transforms runtime inputs into streaming JSONL events. |
| `sidecar/runner.py` | Python Core | Primary benchmark runner orchestrator. |
| `sidecar/scorer.py` | Python Module | Automated correctness, CI, and SRD evaluation logic. |
| `sidecar/checkpointing.py` | Python Module | File system checkpoint reader/writer utility. |
| `sidecar/providers.py` | Python Module | Client factories, API mappings, model profiles. |
| `src/engine/TauriEngine.ts` | Frontend Core | Bridge layer mapping Tauri `invoke` and `listen` pipelines. |
| `src/hooks/useEngine.tsx` | Frontend React Hook | Runtime switch handling native desktop vs mock environments (`__TAURI__`). |
| `src/pages/Setup.tsx` | Frontend React Page | Credential persistence, parameter selections, and task startup controls. |
| `src/pages/Report.tsx` | Frontend React Page | Benchmark report render engine, data displays, and metrics analytics. |

---

## Application Packaging & Build Artifacts

| Packaging Spec | Build Output Location | Deployment Details |
| --- | --- | --- |
| **Debian Package (`.deb`)** | `src-tauri/target/release/bundle/deb/` | Deploys to `/opt/CSS-300/`, links launcher into `/usr/bin/css300`, drops `.desktop` entry. |
| **Portable (`AppImage`)** | `src-tauri/target/release/bundle/appimage/` | Standalone binary runtime. |
| **Python Sidecar Binary** | `src-tauri/binaries/engine-x86_64-unknown-linux-gnu` | Standalone binary compiled via PyInstaller, bundled using Tauri `externalBin`. |

---

## Security Model & System Isolation

* **API Key Isolation:** Secrets are kept out of shell environment variables and process command-line arguments. Key transfers occur exclusively over standard input streams (`stdin`) directly to the child process memory space.
* **Credential Protection:** Secrets are persisted via the system OS Keyring (`libsecret` on Linux, `Keychain` on macOS, and `Credential Manager` on Windows).
* **Resource Access Limits:** Local dataset files are embedded during build time as read-only assets and verified via application signature.
* **Subprocess Constraints:** Python sidecars run as unprivileged child subprocesses without listening socket endpoints. Communications are limited to outgoing HTTPS requests over standard TLS ports.
* **Storage Bounds:** All job output is isolated strictly within the designated user path (`~/css300-results/`), preventing execution side effects outside configured workspaces.
