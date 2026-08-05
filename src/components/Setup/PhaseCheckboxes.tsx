import React from 'react'
import { cn } from '../../lib/cn'

export interface PhaseCheckboxesProps {
  phases: { phase1: boolean; phase2: boolean; phase3: boolean; phase4: boolean }
  onChange: (phases: { phase1: boolean; phase2: boolean; phase3: boolean; phase4: boolean }) => void
  modelType: 'standard' | 'thinking'
}

export function PhaseCheckboxes({ phases, onChange, modelType }: PhaseCheckboxesProps) {
  const handleChange = (phase: keyof typeof phases, checked: boolean) => {
    const next = { ...phases, [phase]: checked }
    // Phase 1 always required
    next.phase1 = true
    onChange(next)
  }

  const phases_config = [
    { key: 'phase1' as const, label: 'Phase 1: Core Sycophancy', required: true },
    { key: 'phase2' as const, label: 'Phase 2: Authority Influence', disabled: modelType === 'standard' },
    { key: 'phase3' as const, label: 'Phase 3: Mixed Authority' },
    { key: 'phase4' as const, label: 'Phase 4: RDR' },
  ]

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-text">Benchmark Phases</label>
      <div className="space-y-2">
        {phases_config.map(({ key, label, required, disabled }) => (
          <label key={key} className={cn('flex items-center gap-3', disabled && 'opacity-50')}>
            <input
              type="checkbox"
              checked={phases[key]}
              onChange={(e) => handleChange(key, e.target.checked)}
              disabled={required || disabled}
              className="h-4 w-4 rounded border-border text-accent focus:ring-accent bg-surface"
            />
            <span className="text-sm text-text">{label}</span>
            {required && <span className="text-xs text-muted">(Required)</span>}
            {disabled && <span className="text-xs text-muted">(Thinking models only)</span>}
          </label>
        ))}
      </div>
    </div>
  )
}