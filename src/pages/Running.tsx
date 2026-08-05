import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { useEngine } from '../hooks/useEngine'
import { useToast } from '../hooks/useToast'
import { db } from '../storage/db'
import { cn } from '../lib/cn'
import { RunConfig, ProgressEvent, Metrics, RunResult } from '../lib/types'
import { Activity, CheckCircle2, XCircle, Loader2, StopCircle, BarChart3, Clock } from 'lucide-react'

const PHASE_NAMES: Record<number, string> = {
  1: 'Pre-Qualification',
  2: 'Cognitive Dissonance',
  3: 'Authority Sensitivity',
  4: 'Temporal Anchoring',
  5: 'CSS Score Summary',
}

type PhaseStatus = 'pending' | 'running' | 'complete'

interface PhaseState {
  status: PhaseStatus
  done: number
  total: number
  message?: string
}

interface RunningLocationState {
  runId?: string
  config?: RunConfig
}

function fmtElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function RunningPage() {
  const navigate = useNavigate()
  const engine = useEngine()
  const { success, error: toastError } = useToast()
  const location = useLocation()
  const state = (location.state || {}) as RunningLocationState

  const runId = state.runId
  const config = state.config

  const [phaseStates, setPhaseStates] = useState<Record<number, PhaseState>>({})
  const [logs, setLogs] = useState<string[]>([])
  const [metrics, setMetrics] = useState<Partial<Metrics> | null>(null)
  const [finished, setFinished] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [isCancelling, setIsCancelling] = useState(false)

  const startRef = useRef<number>(Date.now())
  const logRef = useRef<HTMLDivElement>(null)
  const savedRef = useRef(false)

  // Which phases are part of this run (phase 5 summary always runs)
  const enabledPhases: number[] = config
    ? [
        config.phases.phase1 ? 1 : null,
        config.phases.phase2 ? 2 : null,
        config.phases.phase3 ? 3 : null,
        config.phases.phase4 ? 4 : null,
        5,
      ].filter((p): p is number => p !== null)
    : [1, 2, 3, 4, 5]

  // Elapsed timer
  useEffect(() => {
    if (finished || failed) return
    const t = setInterval(() => setElapsed(Date.now() - startRef.current), 1000)
    return () => clearInterval(t)
  }, [finished, failed])

  // Auto-scroll log feed
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  // Save completed result to report history
  const saveResult = (m: Partial<Metrics>) => {
    if (savedRef.current || !config) return
    savedRef.current = true

    const result: RunResult = {
      schemaVersion: 1,
      id: `${config.name}-${startRef.current}`,
      label: config.name,
      model: config.testModel.modelId,
      dataset: 'CSS-300',
      date: new Date().toISOString(),
      provider: config.testModel.provider,
      metrics: {
        CSS: m.CSS ?? 0,
        ASR: m.ASR ?? 0,
        MAS: m.MAS ?? 0,
        SAG: m.SAG ?? null,
        RDR: m.RDR ?? null,
      },
      phases: { 1: [] },
      derived: undefined,
      hasDetail: false,
    }

    db.reportHistory
      .put({
        id: result.id,
        label: result.label,
        model: result.model,
        date: result.date,
        css: result.metrics.CSS,
        provider: result.provider,
        tags: [],
        result,
        createdAt: Date.now(),
      })
      .catch((e) => console.error('Failed to save result:', e))
  }

  // Subscribe to progress events
  useEffect(() => {
    if (!runId) return

    const unsubscribe = engine.onProgress((e: ProgressEvent) => {
      if (e.runId !== runId) return

      // Append to log feed
      if (e.log) {
        setLogs((prev) => [...prev.slice(-199), `[${new Date().toLocaleTimeString()}] ${e.log}`])
      }

      // Terminal events
      if (e.type === 'error') {
        setFailed(e.log || 'Benchmark failed')
        toastError(e.log || 'Benchmark failed')
        return
      }
      if (e.type === 'cancelled') {
        setFailed('Benchmark cancelled')
        return
      }
      if (e.type === 'complete') {
        setFinished(true)
        setMetrics((prev) => {
          const m = prev || {}
          saveResult(m)
          return m
        })
        success('Benchmark completed')
        return
      }

      // Capture metrics whenever present (phase 5 complete + phase completes)
      if (e.metrics) {
        setMetrics((prev) => ({ ...prev, ...e.metrics }))
      }

      // Phase progress
      if (typeof e.phase === 'number' && e.phase >= 1 && e.phase <= 5) {
        setPhaseStates((prev) => {
          const next = { ...prev }
          const cur = next[e.phase!] || { status: 'pending' as PhaseStatus, done: 0, total: 0 }
          const status: PhaseStatus = e.stage === 'complete' ? 'complete' : 'running'
          next[e.phase!] = {
            status,
            done: e.done || cur.done,
            total: e.total || cur.total,
            message: e.log || cur.message,
          }
          return next
        })
      }
    })

    return () => unsubscribe()
  }, [runId, engine])

  const handleCancel = async () => {
    if (!runId) return
    setIsCancelling(true)
    try {
      await engine.cancel(runId)
      setFailed('Benchmark cancelled')
    } catch (err) {
      toastError(`Failed to cancel: ${err}`)
    } finally {
      setIsCancelling(false)
    }
  }

  // No run in progress — nothing to show
  if (!runId) {
    return <Navigate to="/setup" replace />
  }

  const metricEntries: { label: string; value: number | null | undefined }[] = [
    { label: 'CSS', value: metrics?.CSS },
    { label: 'ASR', value: metrics?.ASR },
    { label: 'MAS', value: metrics?.MAS },
    { label: 'SAG', value: metrics?.SAG },
    { label: 'RDR', value: metrics?.RDR },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-6 h-6 text-truth" />
              <h1 className="text-3xl font-serif font-semibold text-text tracking-tight">
                {finished ? 'Benchmark Complete' : failed ? 'Benchmark Stopped' : 'Benchmark Running'}
              </h1>
            </div>
            <p className="text-muted text-sm mt-1 font-mono">
              {config?.testModel.modelId || 'unknown model'} · run {runId.slice(0, 8)}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-text font-mono text-sm tabular">
              <Clock className="w-4 h-4 text-faint" />
              {fmtElapsed(elapsed)}
            </div>
            {!finished && !failed && (
              <Button
                variant="secondary"
                onClick={handleCancel}
                isLoading={isCancelling}
                className="bg-decay/20 hover:bg-decay/30 border border-decay/30 text-decay px-4 py-2 rounded-xl flex items-center gap-2 transition-colors duration-200"
              >
                <StopCircle className="w-4 h-4" />
                <span>Cancel</span>
              </Button>
            )}
          </div>
        </div>

        {failed && (
          <Card className="bg-decay/10 border-decay/30">
            <CardContent className="p-4 flex items-center gap-3 text-decay">
              <XCircle className="w-5 h-5" />
              <span className="text-sm">{failed}</span>
            </CardContent>
          </Card>
        )}

        {/* Phase cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {enabledPhases.map((p, i) => {
            const ps = phaseStates[p] || { status: 'pending' as PhaseStatus, done: 0, total: 0 }
            const pct = ps.total > 0 ? Math.min(100, (ps.done / ps.total) * 100) : ps.status === 'complete' ? 100 : 0
            return (
              <motion.div
                key={p}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              >
              <Card>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {ps.status === 'complete' ? (
                        <CheckCircle2 className="w-4 h-4 text-truth" />
                      ) : ps.status === 'running' ? (
                        <Loader2 className="w-4 h-4 text-truth animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-border" />
                      )}
                      <span className="text-text font-semibold text-sm">
                        Phase {p} — {PHASE_NAMES[p]}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-muted tabular">
                      {ps.total > 0 ? `${ps.done}/${ps.total}` : ps.status}
                    </span>
                  </div>
                  <div
                    className="h-2 bg-surface-2 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.round(pct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Phase ${p} progress`}
                  >
                    {/* scaleX, not width: transform stays off the layout path */}
                    <motion.div
                      className={cn(
                        'h-full origin-left',
                        ps.status === 'complete' ? 'bg-truth' : 'bg-thinking'
                      )}
                      initial={false}
                      animate={{ scaleX: pct / 100 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                  </div>
                  {ps.message && <p className="text-xs text-faint truncate">{ps.message}</p>}
                </CardContent>
              </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Metrics summary */}
        {(finished || metrics) && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-text font-semibold text-base border-b border-border pb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-thinking" />
                Metrics
              </h3>
              <div className="grid grid-cols-5 gap-3">
                {metricEntries.map((m) => (
                  <div key={m.label} className="text-center">
                    <div className="text-xs text-muted font-mono uppercase">{m.label}</div>
                    <div className="text-lg font-bold text-text mt-1 tabular">
                      {m.value === null || m.value === undefined ? '—' : m.value}
                    </div>
                  </div>
                ))}
              </div>
              {finished && (
                <Button
                  onClick={() => navigate('/report')}
                  className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-bg font-bold text-sm mt-2 transition-colors duration-200"
                >
                  View Full Report →
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Live log feed */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="text-text font-semibold text-sm">Live Log</h3>
            <div
              ref={logRef}
              className="text-xs text-muted font-mono bg-surface-2 p-3 rounded-lg h-64 overflow-y-auto space-y-0.5"
            >
              {logs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap">{log}</div>
              ))}
              {logs.length === 0 && <span className="text-faint">Waiting for benchmark events…</span>}
            </div>
          </CardContent>
        </Card>
    </div>
  )
}
