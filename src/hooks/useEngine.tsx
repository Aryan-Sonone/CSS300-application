import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { BenchmarkEngine } from '../lib/types'
import { NotConnectedEngine } from '../engine/BenchmarkEngine'
import { Spinner } from '../components/ui/Spinner'

const EngineContext = createContext<BenchmarkEngine | null>(null)

export function EngineProvider({ children }: { children: ReactNode }) {
  const [engine, setEngine] = useState<BenchmarkEngine | null>(null)

  useEffect(() => {
    let mounted = true

    const initEngine = async () => {
      // Check if we're running in Tauri
      const isTauri = await import('@tauri-apps/api/core')
        .then((m) => m.isTauri())
        .catch(() => false)

      if (isTauri) {
        const { TauriEngine } = await import('../engine/TauriEngine')
        if (mounted) setEngine(new TauriEngine())
      } else {
        if (mounted) setEngine(new NotConnectedEngine())
      }
    }

    initEngine()

    return () => {
      mounted = false
    }
  }, [])

  // Block rendering until engine is detected — prevents useEngine() throwing on null
  if (!engine) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg">
        <Spinner size="lg" />
      </div>
    )
  }

  return <EngineContext.Provider value={engine}>{children}</EngineContext.Provider>
}

export function useEngine(): BenchmarkEngine {
  const ctx = useContext(EngineContext)
  if (!ctx) throw new Error('useEngine must be used within EngineProvider')
  return ctx
}