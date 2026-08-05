import React from 'react'
import { cn } from '../../lib/cn'
import { Link, useLocation } from 'react-router-dom'

export interface NavItemProps {
  to: string
  children: React.ReactNode
  icon?: React.ReactNode
}

export function NavItem({ to, children, icon }: NavItemProps) {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150',
        isActive
          ? 'bg-surface-2 text-accent'
          : 'text-muted hover:text-text hover:bg-surface-2'
      )}
    >
      {icon}
      {children}
    </Link>
  )
}