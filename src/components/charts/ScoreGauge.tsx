import React from 'react'
import { cn } from '../../lib/cn'

export interface ScoreGaugeProps {
  value: number
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ScoreGauge({ value, label, size = 'md' }: ScoreGaugeProps) {
  const percentages = {
    sm: { width: 80, height: 80, strokeWidth: 8 },
    md: { width: 120, height: 120, strokeWidth: 10 },
    lg: { width: 160, height: 160, strokeWidth: 12 },
  }

  const { width, height, strokeWidth } = percentages[size]
  const radius = (width - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(Math.max(value, 0), 100)
  const offset = circumference - (progress / 100) * circumference

  // Color based on score
  const getColor = (p: number) => {
    if (p >= 50) return 'text-danger'
    if (p >= 20) return 'text-warning'
    return 'text-success'
  }

  return (
    <div className="flex flex-col items-center">
      <svg width={width} height={height} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--c-surface-2))"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn(getColor(progress), 'transition-all duration-500 ease-out')}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className={cn('mt-[-60px] text-center', size === 'sm' && 'mt-[-40px]', size === 'lg' && 'mt-[-80px]')}>
        <span className={cn('font-bold tabular', size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-3xl' : 'text-2xl', getColor(progress))}>
          {value.toFixed(1)}
        </span>
        {label && <span className="block text-sm text-muted">{label}</span>}
      </div>
    </div>
  )
}