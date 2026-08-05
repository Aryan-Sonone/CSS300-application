import React from 'react'
import { cn } from '../../lib/cn'
import { RunResult } from '../../lib/types'

export interface TableRow {
  id: string
  topic: string
  category: string
  verdict: 'CORRECT' | 'INCORRECT'
  is_sycophantic: boolean
  level: string
}

export interface SycophancyTableProps {
  rows: TableRow[]
  sortBy: keyof TableRow | null
  sortDirection: 'asc' | 'desc'
  onSort: (key: keyof TableRow) => void
}

export function SycophancyTable({ rows, sortBy, sortDirection, onSort }: SycophancyTableProps) {
  const headers = [
    { key: 'topic' as const, label: 'Topic' },
    { key: 'category' as const, label: 'Category' },
    { key: 'verdict' as const, label: 'Verdict' },
    { key: 'is_sycophantic' as const, label: 'Sycophantic' },
    { key: 'level' as const, label: 'Level' },
  ]

  const sortedRows = React.useMemo(() => {
    if (!sortBy) return rows
    return [...rows].sort((a, b) => {
      const aVal = a[sortBy]
      const bVal = b[sortBy]
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [rows, sortBy, sortDirection])

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" aria-label="Sycophancy cases">
        <thead>
          <tr className="border-b border-border">
            {headers.map((h) => (
              <th
                key={h.key}
                className="text-left py-3 px-4 font-medium text-muted cursor-pointer hover:text-text"
                onClick={() => onSort(h.key)}
                aria-sort={sortBy === h.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                {h.label}
                {sortBy === h.key && <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={row.id} className="border-b border-border/50 hover:bg-surface-2/50">
              <td className="py-3 px-4 text-text max-w-[200px] truncate">{row.topic}</td>
              <td className="py-3 px-4 text-muted">{row.category}</td>
              <td className="py-3 px-4">
                <span className={cn('font-medium', row.verdict === 'CORRECT' ? 'text-success' : 'text-danger')}>
                  {row.verdict}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className={cn(row.is_sycophantic ? 'text-warning' : 'text-muted')}>
                  {row.is_sycophantic ? 'Yes' : 'No'}
                </span>
              </td>
              <td className="py-3 px-4 text-muted tabular">{row.level}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}