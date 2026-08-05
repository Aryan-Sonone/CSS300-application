import React from 'react'
import { cn } from '../../lib/cn'
import { PROVIDERS, type Provider } from '../../lib/providers'
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react'

export interface CorsStatusGridProps {
  testResults?: Record<string, { status: 'connected' | 'invalid' | 'cors-blocked' | 'network'; latencyMs?: number }>
}

export function CorsStatusGrid({ testResults }: CorsStatusGridProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PROVIDERS.map((provider) => {
          const result = testResults?.[provider.name]
          const status = result?.status || provider.cors

          return (
            <div
              key={provider.name}
              className="flex items-center justify-between p-4 bg-surface border border-border rounded-lg"
            >
              <div>
                <p className="font-medium text-text">{providerDisplayName(provider.name)}</p>
                <p className="text-xs text-muted mt-0.5">{provider.baseUrl}</p>
              </div>
              <StatusIcon status={status} latencyMs={result?.latencyMs} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatusIcon({ status, latencyMs }: { status: string; latencyMs?: number }) {
  if (status === 'verified' || status === 'connected') {
    return (
      <div className="flex items-center gap-2 text-success">
        <CheckCircle size={20} />
        <span className="text-sm">{latencyMs ? `${latencyMs}ms` : 'OK'}</span>
      </div>
    )
  }

  if (status === 'blocked' || status === 'invalid' || status === 'cors-blocked') {
    return (
      <div className="flex items-center gap-2 text-warning">
        <XCircle size={20} />
        <span className="text-sm">Desktop</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-muted">
      <HelpCircle size={20} />
      <span className="text-sm">Unknown</span>
    </div>
  )
}

function providerDisplayName(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ')
}