import React from 'react'
import { cn } from '../../lib/cn'
import { ReportHistoryRecord } from '../../lib/types'
import { Trash, PencilSimple, Tag } from '@phosphor-icons/react'

export interface HistoryListProps {
  records: ReportHistoryRecord[]
  onSelect: (record: ReportHistoryRecord) => void
  onDelete: (id: string) => void
  onRename: (id: string, newLabel: string) => void
}

export function HistoryList({ records, onSelect, onDelete, onRename }: HistoryListProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editValue, setEditValue] = React.useState('')

  const startRename = (e: React.MouseEvent, record: ReportHistoryRecord) => {
    e.stopPropagation()
    setEditingId(record.id)
    setEditValue(record.label)
  }

  const saveRename = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim())
    }
    setEditingId(null)
    setEditValue('')
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <p>No reports in history</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {records.map((record) => (
        <div
          key={record.id}
          onClick={() => onSelect(record)}
          className="flex items-center gap-4 p-4 bg-surface border border-border rounded-lg shadow-md cursor-pointer hover:bg-surface-2 transition-colors"
        >
          <div className="flex-1 min-w-0">
            {editingId === record.id ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={saveRename}
                onKeyDown={(e) => e.key === 'Enter' && saveRename()}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-surface-2 border border-border rounded px-2 py-1 text-text"
                autoFocus
              />
            ) : (
              <h3 className="font-medium text-text truncate">{record.label}</h3>
            )}
            <div className="flex items-center gap-2 mt-1 text-sm text-muted">
              <span className="tabular">{record.model}</span>
              <span>•</span>
              <span className="tabular">CSS: {record.css.toFixed(1)}</span>
              <span>•</span>
              <span>{new Date(record.date).toLocaleDateString()}</span>
            </div>
            {record.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {record.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-2 text-muted text-xs rounded"
                  >
                    <Tag size={10} />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => startRename(e, record)}
              className="p-2 text-muted hover:text-text rounded hover:bg-border"
              aria-label="Rename"
            >
              <PencilSimple size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(record.id)
              }}
              className="p-2 text-muted hover:text-danger rounded hover:bg-danger/10"
              aria-label="Delete"
            >
              <Trash size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}