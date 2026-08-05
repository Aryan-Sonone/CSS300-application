// BenchmarkEngine interface (PRD §4)
// NotConnectedEngine - active for Phase A web build (PRD §5.1)
// TauriEngine stub - throws "not implemented in web build"

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

// CORS audit map - initial status per provider (PRD §6.2)
// Runtime testConnection results override these per-provider
export const corsAudit: Record<string, 'verified' | 'blocked' | 'unknown'> = {
  ollama: 'verified',
  lm_studio: 'verified',
  llamacpp: 'verified',
  openai: 'blocked',
  anthropic: 'blocked',
  google_ai_studio: 'blocked',
  deepseek: 'blocked',
  mistral: 'blocked',
  cohere: 'blocked',
}

export class NotConnectedEngine implements BenchmarkEngine {
  async testConnection(cfg: ProviderConfig): Promise<ConnectionResult> {
    const start = Date.now()
    const abort = new AbortController()
    const timeout = setTimeout(() => abort.abort(), 15000)

    // Provider base URLs for browser connection test
    const providerUrls: Record<string, string> = {
      openai: 'https://api.openai.com/v1',
      anthropic: 'https://api.anthropic.com',
      google_ai_studio: 'https://generativelanguage.googleapis.com/v1beta',
      deepseek: 'https://api.deepseek.com/v1',
      mistral: 'https://api.mistral.ai/v1',
      cohere: 'https://api.cohere.ai/v1',
      nvidia_nim: 'https://integrate.api.nvidia.com/v1',
    }

    const baseUrl = providerUrls[cfg.provider] || cfg.provider

    try {
      // Anthropic uses different endpoint structure
      if (cfg.provider === 'anthropic') {
        const response = await fetch(`${baseUrl}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': cfg.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: cfg.modelId,
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 1,
          }),
          signal: abort.signal,
        })

        clearTimeout(timeout)

        if (response.status === 401 || response.status === 403) {
          return { status: 'invalid', message: 'Invalid API key', latencyMs: Date.now() - start }
        }

        if (response.ok) {
          return { status: 'connected', message: 'Connected', latencyMs: Date.now() - start }
        }

        return { status: 'cors-blocked', message: 'Browser blocked - use desktop app', latencyMs: Date.now() - start }
      }

      // OpenAI-compatible providers
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.modelId,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
        signal: abort.signal,
      })

      clearTimeout(timeout)

      if (response.status === 401 || response.status === 403) {
        return { status: 'invalid', message: 'Invalid API key', latencyMs: Date.now() - start }
      }

      if (response.status === 404) {
        return { status: 'invalid', message: 'Model not found', latencyMs: Date.now() - start }
      }

      if (response.ok) {
        return { status: 'connected', message: 'Connected', latencyMs: Date.now() - start }
      }

      return { status: 'cors-blocked', message: 'Browser blocked - use desktop app', latencyMs: Date.now() - start }
    } catch (err) {
      clearTimeout(timeout)

      // Network error or CORS
      if (err instanceof TypeError || (err as Error).message.includes('fetch')) {
        return { status: 'cors-blocked', message: 'Browser blocked - use desktop app' }
      }

      return { status: 'network', message: 'Network error', detail: (err as Error).message }
    }
  }

  async getAvailableModels(_provider: string, _apiKey: string): Promise<string[]> {
    return []
  }

  async startBenchmark(_cfg: RunConfig): Promise<RunHandle> {
    throw new EngineNotConnectedError('Running benchmarks requires the CSS-300 desktop app.')
  }

  async pause(_runId: string): Promise<void> {
    throw new EngineNotConnectedError()
  }

  async resume(_runId: string): Promise<void> {
    throw new EngineNotConnectedError()
  }

  async cancel(_runId: string): Promise<void> {
    throw new EngineNotConnectedError()
  }

  onProgress(_cb: (e: ProgressEvent) => void): Unsubscribe {
    return () => {} // noop
  }

  async loadResultsFile(file: File): Promise<RunResult> {
    const text = await file.text()
    return parseRunResult(JSON.parse(text))
  }
}

// Parse pipeline JSON to RunResult (PRD §6.3)
export function parseRunResult(data: unknown): RunResult {
  const raw = data as Record<string, unknown>

  // Canonical bundle shape
  if (raw.schemaVersion !== undefined) {
    const result: RunResult = {
      schemaVersion: Number(raw.schemaVersion),
      id: String(raw.id || raw.model || 'unknown'),
      label: String(raw.label || raw.model || 'Unnamed'),
      model: String(raw.model),
      dataset: String(raw.dataset || 'CSS-300'),
      date: String(raw.date),
      provider: raw.provider ? String(raw.provider) : undefined,
      metrics: {
        CSS: Number((raw.metrics as any)?.CSS ?? 0),
        ASR: Number((raw.metrics as any)?.ASR ?? 0),
        MAS: Number((raw.metrics as any)?.MAS ?? 0),
        SAG: (raw.metrics as any)?.SAG !== null ? Number((raw.metrics as any)?.SAG) : null,
        RDR: (raw.metrics as any)?.RDR !== null ? Number((raw.metrics as any)?.RDR) : null,
      },
      phases: { 1: [] },
      derived: undefined,
      hasDetail: false,
    }

    // Parse phase rows
    const phases = raw.phases as Record<string, unknown> | undefined
    if (phases) {
      for (const key of ['1', '2', '3', '4']) {
        const rows = phases[key] as Array<Record<string, unknown>> | undefined
        if (rows && Array.isArray(rows)) {
          ;(result.phases as any)[key] = rows.map((r, i) => ({
            id: String(r.id || `${key}-${i}`),
            topic: String(r.topic || ''),
            category: String(r.category || ''),
            verdict: (r.verdict === 'INCORRECT' ? 'INCORRECT' : 'CORRECT') as 'CORRECT' | 'INCORRECT',
            is_sycophantic: Boolean(r.is_sycophantic),
            level: String(r.level || ''),
          }))
        }
      }
    }

    // Parse derived charts if present
    const derived = raw.derived as Record<string, unknown> | undefined
    if (derived) {
      result.derived = {
        asrData: (derived.asrData as any[]) || [],
        masData: (derived.masData as any[]) || [],
        categoryData: (derived.categoryData as any[]) || [],
        rdrData: (derived.rdrData as any[]) || [],
      }
    }

    // Check if we have detail
    result.hasDetail = !!(phases?.['1'] && (phases['1'] as Array<any>).length > 0)

    return result
  }

  // Raw css_summary.json shape - metrics only
  if (raw.model && raw.metrics) {
    const metrics = raw.metrics as Record<string, unknown>
    return {
      schemaVersion: 1,
      id: String(raw.model),
      label: String(raw.model),
      model: String(raw.model),
      dataset: String(raw.dataset || 'CSS-300'),
      date: String(raw.date || new Date().toISOString()),
      provider: undefined,
      metrics: {
        CSS: Number(metrics.CSS ?? 0),
        ASR: Number(metrics.ASR ?? 0),
        MAS: Number(metrics.MAS ?? 0),
        SAG: Number(metrics.SAG ?? metrics.RDR ?? 0),
        RDR: Number(metrics.RDR ?? 0),
      },
      phases: { 1: [] },
      derived: undefined,
      hasDetail: false,
    }
  }

  throw new Error('Unknown results format')
}

// Placeholder TauriEngine
export class TauriEngine implements BenchmarkEngine {
  async testConnection(_cfg: ProviderConfig): Promise<ConnectionResult> {
    throw new Error('Tauri engine not implemented in web build')
  }

  async getAvailableModels(_provider: string, _apiKey: string): Promise<string[]> {
    return []
  }

  async startBenchmark(_cfg: RunConfig): Promise<RunHandle> {
    throw new Error('Tauri engine not implemented in web build')
  }

  async pause(_runId: string): Promise<void> {
    throw new Error('Tauri engine not implemented in web build')
  }

  async resume(_runId: string): Promise<void> {
    throw new Error('Tauri engine not implemented in web build')
  }

  async cancel(_runId: string): Promise<void> {
    throw new Error('Tauri engine not implemented in web build')
  }

  onProgress(_cb: (e: ProgressEvent) => void): Unsubscribe {
    return () => {}
  }

  async loadResultsFile(_file: File): Promise<RunResult> {
    throw new Error('Tauri engine not implemented in web build')
  }
}