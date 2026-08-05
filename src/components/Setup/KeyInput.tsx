import React from 'react'
import { cn } from '../../lib/cn'
import { Eye, EyeOff } from 'lucide-react'

export interface KeyInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  disabled?: boolean
}

export function KeyInput({ value, onChange, label, placeholder, disabled }: KeyInputProps) {
  const [show, setShow] = React.useState(false)

  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-text">{label}</label>}
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full h-10 px-3 pr-10 bg-surface border border-border rounded-md text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text focus:outline-none"
          aria-label={show ? 'Hide key' : 'Show key'}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  )
}