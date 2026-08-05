import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn, Event } from '@tauri-apps/api/event'
import {
  BenchmarkEngine,
  ProviderConfig,
  ConnectionResult,
  RunConfig,
  RunHandle,
  ProgressEvent,
  Unsubscribe,
  EngineNotConnectedError,
  RunResult,
} from '../lib/types'
import { parseRunResult } from './BenchmarkEngine'

function adaptConfig(cfg: RunConfig) {
  return {
    name: cfg.name,
    test_model: {
      provider: cfg.testModel.provider,
      model_id: cfg.testModel.modelId,
      api_key: cfg.testModel.apiKey,
    },
    use_same_provider: cfg.useSameProvider,
    scoring_model: cfg.scoringModel
      ? {
          provider: cfg.scoringModel.provider,
          model_id: cfg.scoringModel.modelId,
          api_key: cfg.scoringModel.apiKey,
        }
      : undefined,
    dataset_mode: cfg.datasetMode,
    sample_size: cfg.sampleSize,
    seed: cfg.seed,
    phases: cfg.phases,
    model_type: cfg.modelType,
  }
}

function adaptConnectionResult(r: any): ConnectionResult {  return {
    status: r.status as ConnectionResult['status'],
    latencyMs: r.latency_ms,
    message: r.message,
    detail: r.detail,
  }
}

// Rust emits "N/A" (string) for metrics that couldn't be computed. Coerce to number|null.
function numOrNull(v: unknown): number | null {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

function adaptProgressEvent(data: any): ProgressEvent {
  return {
    runId: data.runId,
    type: data.type,
    phase: data.phase,
    stage: data.stage,
    done: data.done ?? 0,
    total: data.total ?? 0,
    log: data.message || data.log,
    metrics: data.metrics
      ? {
          // Metrics.CSS/ASR/MAS are number (Partial → number|undefined); SAG/RDR are number|null
          CSS: numOrNull(data.metrics.CSS) ?? undefined,
          ASR: numOrNull(data.metrics.ASR) ?? undefined,
          MAS: numOrNull(data.metrics.MAS) ?? undefined,
          SAG: numOrNull(data.metrics.SAG),
          RDR: numOrNull(data.metrics.RDR),
        }
      : undefined,
  }
}

// Rust emits every run's events on one global channel with `runId` in the
// payload. Two problems ruled out a per-run channel: the frontend can't know the
// run id until `start_benchmark` returns (by which point the runner has already
// emitted, and Tauri events don't buffer), and the Running page doesn't mount
// until after navigation, so it would miss anything emitted in between.
const PROGRESS_EVENT = 'benchmark://progress'

// Events kept per run so a subscriber that attaches late still sees the start of
// the run. Bounded — a full 300-item run emits a few thousand events and only the
// recent tail is worth replaying into a log feed.
const MAX_BUFFERED_EVENTS = 500

export class TauriEngine implements BenchmarkEngine {
  private unlisten: UnlistenFn | null = null
  private listening: Promise<void> | null = null
  private callbacks: Set<(e: ProgressEvent) => void> = new Set()
  private buffered: Map<string, ProgressEvent[]> = new Map()

  /// Attach the global listener. Idempotent and awaited before the run starts,
  /// so no event can slip through before the handler exists.
  private async ensureListening(): Promise<void> {
    if (this.listening) return this.listening

    this.listening = (async () => {
      this.unlisten = await listen<string>(PROGRESS_EVENT, (event: Event<string>) => {
        let progressEvent: ProgressEvent
        try {
          progressEvent = adaptProgressEvent(JSON.parse(event.payload))
        } catch {
          return // malformed payload — nothing useful to surface
        }
        if (!progressEvent.runId) return

        const buf = this.buffered.get(progressEvent.runId) ?? []
        buf.push(progressEvent)
        if (buf.length > MAX_BUFFERED_EVENTS) buf.splice(0, buf.length - MAX_BUFFERED_EVENTS)
        this.buffered.set(progressEvent.runId, buf)

        this.callbacks.forEach((cb) => cb(progressEvent))
      })
    })()

    return this.listening
  }

  async testConnection(cfg: ProviderConfig): Promise<ConnectionResult> {
    const result = await invoke('test_connection', {
      provider: cfg.provider,
      modelId: cfg.modelId,
      apiKey: cfg.apiKey,
    })
    return adaptConnectionResult(result)
  }

  async getAvailableModels(provider: string, apiKey: string): Promise<string[]> {
    const result = await invoke('get_available_models', { provider, apiKey })
    return result as string[]
  }

  async startBenchmark(cfg: RunConfig): Promise<RunHandle> {
    // Listener first — the runner emits as soon as the invoke lands.
    await this.ensureListening()
    // Only the run about to start is replayable; older buffers would otherwise
    // accumulate for the lifetime of the app.
    this.buffered.clear()
    const runId = await invoke<string>('start_benchmark', { config: adaptConfig(cfg) })
    return { runId }
  }

  async pause(runId: string): Promise<void> {
    await invoke('pause_benchmark', { runId })
  }

  async resume(runId: string): Promise<void> {
    // Full resume with checkpoint would need config passed
    // For now, just cancel
    await invoke('cancel_benchmark', { runId })
  }

  async cancel(runId: string): Promise<void> {
    await invoke('cancel_benchmark', { runId })
  }

  /// Replays this run's buffered events into the new subscriber before live
  /// delivery, so a page that mounts mid-run still renders the phases that
  /// already started. The global listener stays attached after the last
  /// unsubscribe — tearing it down would drop events while navigating away
  /// and back.
  onProgress(cb: (e: ProgressEvent) => void): Unsubscribe {
    this.callbacks.add(cb)

    for (const events of this.buffered.values()) {
      events.forEach((e) => cb(e))
    }

    return () => {
      this.callbacks.delete(cb)
    }
  }

  async loadResultsFile(file: File): Promise<RunResult> {
    const text = await file.text()
    return parseRunResult(JSON.parse(text))
  }
}