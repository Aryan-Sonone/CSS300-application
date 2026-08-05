import React from 'react'
import { DownloadSimple, UploadSimple } from '@phosphor-icons/react'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'

export interface ConfigExportImportProps {
  onExport: (includeKeys: boolean) => void
  onImport: (file: File) => void
}

export function ConfigExportImport({ onExport, onImport }: ConfigExportImportProps) {
  const [includeKeys, setIncludeKeys] = React.useState(false)
  const [showWarning, setShowWarning] = React.useState(false)

  const handleExport = () => {
    if (includeKeys) {
      setShowWarning(true)
    } else {
      onExport(false)
    }
  }

  const handleImportClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) onImport(file)
    }
    input.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="primary" onClick={handleExport}>
          <DownloadSimple size={16} className="mr-2" />
          Export Config
        </Button>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={includeKeys}
            onChange={(e) => setIncludeKeys(e.target.checked)}
            className="rounded border-border text-accent focus:ring-accent bg-surface"
          />
          Include API keys (warn: sensitive)
        </label>
      </div>

      <div>
        <Button variant="secondary" onClick={handleImportClick}>
          <UploadSimple size={16} className="mr-2" />
          Import Config
        </Button>
      </div>

      <ConfirmDialog
        isOpen={showWarning}
        onClose={() => setShowWarning(false)}
        onConfirm={() => {
          onExport(true)
          setShowWarning(false)
        }}
        title="Export API Keys?"
        description="This will include your encrypted API keys in the export file. Only share this file with trusted parties. The keys are encrypted for this browser only."
        confirmText="Export with keys"
        variant="default"
      />
    </div>
  )
}