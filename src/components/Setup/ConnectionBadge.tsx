import React from 'react'
import { cn } from '../../lib/cn'
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { ConnectionStatus } from '../../lib/types'

export interface ConnectionBadgeProps {
  status: ConnectionStatus | null
  latencyMs?: number
  message?: string
}

export function ConnectionBadge({ status, latencyMs, message }: ConnectionBadgeProps) {
  if (!status) return null

  const configs = {
    connected: {
      icon: <CheckCircle size={16} className="text-success" />,
      text: 'Connected',
      bg: 'bg-success/10',
      border: 'border-success/20',
    },
    invalid: {
      icon: <XCircle size={16} className="text-danger" />,
      text: 'Invalid',
      bg: 'bg-danger/10',
      border: 'border-danger/20',
    },
    'cors-blocked': {
      icon: <AlertCircle size={16} className="text-warning" />,
      text: 'Browser blocked',
      bg: 'bg-warning/10',
      border: 'border-warning/20',
    },
    network: {
      icon: <AlertCircle size={16} className="text-danger" />,
      text: 'Network error',
      bg: 'bg-danger/10',
      border: 'border-danger/20',
    },
  }

  const config = configs[status]

  return (
    <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border', config.bg, config.border)}>
      {config.icon}
      <span className="text-text">{message || config.text}</span>
      {latencyMs !== undefined && <span className="text-muted tabular">({latencyMs}ms)</span>}
    </div>
  )
}

export function TestingBadge() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border bg-surface-2 border-border">
      <Loader2 size={16} className="text-muted animate-spin" />
      <span className="text-muted">Testing...</span>
    </div>
  )
}