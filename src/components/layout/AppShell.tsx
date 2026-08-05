import React, { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { GridBackground } from './GridBackground'

export interface AppShellProps {
  children: ReactNode
  header?: ReactNode
}

export function AppShell({ children, header }: AppShellProps) {
  return (
    <GridBackground>
      {header}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </GridBackground>
  )
}