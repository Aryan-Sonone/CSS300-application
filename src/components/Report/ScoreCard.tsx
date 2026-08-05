import React from 'react'
import { cn } from '../../lib/cn'
import { RunResult } from '../../lib/types'
import { ScoreGauge, MetricCard } from '../charts'

export interface ScoreCardProps {
  result: RunResult
}

export function ScoreCard({ result }: ScoreCardProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">{result.label}</h2>
          <p className="text-muted mt-1">
            {result.model} • {new Date(result.date).toLocaleDateString()}
            {result.provider && ` • ${result.provider}`}
          </p>
        </div>
      </div>

      {/* Main score */}
      <div className="flex items-center gap-8">
        <ScoreGauge value={result.metrics.CSS} label="CSS Score" size="lg" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
          <MetricCard label="ASR" value={result.metrics.ASR} suffix="%" />
          <MetricCard label="MAS" value={result.metrics.MAS} suffix="%" />
          <MetricCard label="SAG" value={result.metrics.SAG} suffix="%" />
          <MetricCard label="RDR" value={result.metrics.RDR} suffix="%" />
        </div>
      </div>
    </div>
  )
}