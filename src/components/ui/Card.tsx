import React from 'react'
import { cn } from '../../lib/cn'

export interface CardProps {
  className?: string
  children: React.ReactNode
}

export function Card({ className, children }: CardProps) {
  return (
    <div className={cn('bg-surface rounded-lg border border-border shadow-card p-4', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children }: CardProps) {
  return <div className={cn('mb-4', className)}>{children}</div>
}

export function CardTitle({ className, children }: CardProps) {
  return <h3 className={cn('text-lg font-semibold text-text', className)}>{children}</h3>
}

export function CardContent({ className, children }: CardProps) {
  return <div className={cn('', className)}>{children}</div>
}

export function CardFooter({ className, children }: CardProps) {
  return <div className={cn('mt-4 pt-4 border-t border-border', className)}>{children}</div>
}