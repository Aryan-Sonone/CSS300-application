import React from 'react'
import { cn } from '../../lib/cn'

export interface MetricCardProps {
  label: string
  value: number | null
  suffix?: string
  description?: string
}

export function MetricCard({ label, value, suffix, description }: MetricCardProps) {
  const displayValue = value !== null ? value.toFixed(1) : '—'

  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <dt className="text-sm font-medium text-muted truncate">{label}</dt>
      <dd className="mt-1">
        <div className={cn('text-2xl font-bold tabular', value === null ? 'text-muted' : 'text-text')}>
          {displayValue}
          {suffix && <span className="text-sm font-normal text-muted ml-1">{suffix}</span>}
        </div>
      </dd>
      {description && <p className="mt-2 text-xs text-muted">{description}</p>}
    </div>
  )
}