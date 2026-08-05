import React from 'react'
import { cn } from '../../lib/cn'
import { Inbox } from 'lucide-react'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="flex justify-center mb-4">
        {icon || <Inbox size={48} className="text-muted" />}
      </div>
      <h3 className="text-lg font-medium text-text">{title}</h3>
      {description && <p className="text-muted mt-2">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}