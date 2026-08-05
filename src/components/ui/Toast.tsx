import React, { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { Toast, useToast } from '../../hooks/useToast'
import { X } from 'lucide-react'

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-[1000] space-y-2" aria-live="polite" aria-atomic="true">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  // All four surfaces are bright, so the near-black bg token is the only
  // foreground that clears 4.5:1 across them.
  const styles = {
    success: 'bg-success text-bg',
    error: 'bg-danger text-bg',
    info: 'bg-accent text-bg',
    warning: 'bg-warning text-bg',
  }

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(onDismiss, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.duration, onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 24, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      className={cn(
        'flex items-center justify-between min-w-[300px] max-w-md px-4 py-3 rounded-lg shadow-lift',
        styles[toast.type]
      )}
      role="status"
    >
      <span className="text-sm font-medium">{toast.message}</span>
      <button onClick={onDismiss} className="ml-4 p-1 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-bg/50 rounded" aria-label="Dismiss">
        <X size={16} />
      </button>
    </motion.div>
  )
}