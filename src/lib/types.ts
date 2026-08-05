// Core domain types for CSS-300 Web. Matches the BenchmarkEngine contract (PRD §4)
// and the real Python pipeline JSON shapes (PRD §6.3).

export interface ProviderConfig {
  provider: string
  apiKey: string
  modelId: string
}

export interface ScoringConfig {
  provider: string
  apiKey: string
  modelId: string
}

export type DatasetMode = 'full' | 'sample'
export type ModelType = 'standard' | 'thinking'

export interface PhaseSelection {
  phase1: boolean
  phase2: boolean
  phase3: boolean
  phase4: boolean
}

export interface RunConfig {
  name: string
  testModel: ProviderConfig
  useSameProvider: boolean
  scoringModel?: ScoringConfig
  datasetMode: DatasetMode
  sampleSize: number
  seed: number
  phases: PhaseSelection
  modelType: ModelType
  outputDir?: string
  updatedAt: number
}

// --- Engine contract ------------------------------------------------------

export type ConnectionStatus = 'connected' | 'invalid' | 'cors-blocked' | 'network'

export interface ConnectionResult {
  status: ConnectionStatus
  latencyMs?: number
  message: string
  detail?: string
}

export class EngineNotConnectedError extends Error {
  constructor(message = 'Benchmark execution is not available in the web build.') {
    super(message)
    this.name = 'EngineNotConnectedError'
  }
}

export class EngineNotImplementedError extends Error {
  constructor(message = 'This engine is not implemented in the current build.') {
    super(message)
    this.name = 'EngineNotImplementedError'
  }
}

export interface ProgressEvent {
  runId: string
  type?: string
  phase?: number
  stage?: string
  done: number
  total: number
  log?: string
  metrics?: Partial<Metrics>
}

export interface RunHandle {
  runId: string
  unsubscribe?: () => void
}

export type Unsubscribe = () => void

export interface BenchmarkEngine {
  testConnection(cfg: ProviderConfig): Promise<ConnectionResult>
  getAvailableModels(provider: string, apiKey: string): Promise<string[]>
  startBenchmark(cfg: RunConfig): Promise<RunHandle>
  pause(runId: string): Promise<void>
  resume(runId: string): Promise<void>
  cancel(runId: string): Promise<void>
  onProgress(cb: (e: ProgressEvent) => void): Unsubscribe
  loadResultsFile(file: File): Promise<RunResult>
}

// --- Results --------------------------------------------------------------

export type Verdict = 'CORRECT' | 'INCORRECT'

export interface ResultRow {
  id: string
  topic: string
  category: string
  verdict: Verdict
  is_sycophantic: boolean
  level: string
}

export interface Metrics {
  CSS: number
  ASR: number
  MAS: number
  SAG: number | null
  RDR: number | null
}

export interface DerivedCharts {
  asrData: { level: string; percentage: number }[]
  masData: { frame: string; percentage: number }[]
  categoryData: { category: string; percentage: number }[]
  rdrData: { outcome: string; percentage: number }[]
}

export interface RunResult {
  schemaVersion: number
  id: string
  label: string
  model: string
  dataset: string
  date: string
  provider?: string
  metrics: Metrics
  phases: { 1: ResultRow[]; 2?: ResultRow[]; 3?: ResultRow[]; 4?: ResultRow[] }
  derived?: DerivedCharts
  hasDetail: boolean
}

// --- Persistence ----------------------------------------------------------

export interface ReportHistoryRecord {
  id: string
  label: string
  model: string
  date: string
  css: number
  provider?: string
  tags: string[]
  result: RunResult
  createdAt: number
}

export interface StoredConfig {
  id: string
  name: string
  config: RunConfig
  updatedAt: number
}

export interface ExportedConfig {
  schemaVersion: number
  exportedAt: number
  configs: RunConfig[]
  keys?: Record<string, string>
}
