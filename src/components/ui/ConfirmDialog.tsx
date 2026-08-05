import React, { useState } from 'react'
import { cn } from '../../lib/cn'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'default'
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      await onConfirm()
    } finally {
      setIsConfirming(false)
    }
    onClose()
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-[1000] flex items-center justify-center',
        !isOpen && 'pointer-events-none'
      )}
      aria-hidden={!isOpen}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className={cn(
          'relative bg-surface rounded-lg shadow-lift max-w-md w-full mx-4 p-6',
          'transform transition-all duration-200',
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        )}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
      >
        <h3 id="confirm-title" className="text-lg font-semibold text-text mb-2">
          {title}
        </h3>
        <p id="confirm-description" className="text-muted mb-6">
          {description}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text bg-surface-2 hover:bg-border rounded-md focus:outline-none focus:ring-2 focus:ring-border"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2',
              variant === 'danger'
                ? 'bg-danger text-white hover:bg-danger/90 focus:ring-danger'
                : 'bg-accent text-bg hover:bg-accent-hover focus:ring-accent',
              isConfirming && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isConfirming ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}