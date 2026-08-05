import React from 'react'
import { cn } from '../../lib/cn'

export interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

export interface TabsListProps {
  children: React.ReactNode
  className?: string
}

export interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
}

export interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

const TabsContext = React.createContext<{ value: string; onValueChange: (v: string) => void } | null>(null)

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div className={cn('flex border-b border-border mb-4', className)}>
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  const ctx = React.useContext(TabsContext)
  if (!ctx) throw new Error('TabsTrigger must be used within Tabs')

  const isActive = ctx.value === value

  return (
    <button
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        'px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-150',
        isActive
          ? 'border-accent text-accent'
          : 'border-transparent text-muted hover:text-text hover:border-border',
        className
      )}
      role="tab"
      aria-selected={isActive}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const ctx = React.useContext(TabsContext)
  if (!ctx) throw new Error('TabsContent must be used within Tabs')

  if (ctx.value !== value) return null

  return (
    <div className="animate-in fade-in duration-200" role="tabpanel">
      {children}
    </div>
  )
}