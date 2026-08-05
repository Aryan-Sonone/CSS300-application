import React from 'react'
import { Download, FileCode, FileCsv, FileText } from '@phosphor-icons/react'
import { Button } from '../ui/Button'
import { RunResult } from '../../lib/types'

export interface ReportToolbarProps {
  result: RunResult
  onExportJson: () => void
  onExportCsv: () => void
  onExportPdf: () => void
}

export function ReportToolbar({ result, onExportJson, onExportCsv, onExportPdf }: ReportToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={onExportJson}>
        <FileCode size={16} className="mr-2" />
        JSON
      </Button>
      <Button variant="secondary" size="sm" onClick={onExportCsv}>
        <FileCsv size={16} className="mr-2" />
        CSV
      </Button>
      <Button variant="secondary" size="sm" onClick={onExportPdf}>
        <FileText size={16} className="mr-2" />
        PDF
      </Button>
    </div>
  )
}