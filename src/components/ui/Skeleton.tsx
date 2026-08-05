import React from 'react'
import { cn } from '../../lib/cn'

export function Skeleton({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div
      className={cn(
        'animate-pulse bg-surface-2 rounded',
        className
      )}
    >
      {children}
    </div>
  )
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-surface-2 rounded animate-pulse"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  )
}