import React, { useCallback, useState } from 'react'
import { cn } from '../../lib/cn'
import { Upload, FileJson } from 'lucide-react'

export interface UploadDropzoneProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
}

export function UploadDropzone({ onFileSelect, disabled }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        const file = files[0]
        if (file.type === 'application/json' || file.name.endsWith('.json')) {
          onFileSelect(file)
        }
      }
    },
    [onFileSelect, disabled]
  )

  const handleClick = () => {
    if (disabled) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) onFileSelect(file)
    }
    input.click()
  }

  return (
    <div
      onClick={handleClick}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={cn(
        'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200 bg-surface',
        isDragging
          ? 'border-accent bg-surface'
          : 'border-border hover:border-accent/50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      role="button"
      tabIndex={0}
      aria-label="Upload results file"
    >
      <FileJson size={48} className="mx-auto text-muted mb-4" />
      <p className="text-text font-medium mb-1">Drop your CSS-300 results file here</p>
      <p className="text-sm text-muted">or click to browse (JSON files only)</p>
    </div>
  )
}