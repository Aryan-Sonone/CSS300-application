import { useState, useEffect } from 'react'
import { db } from '../storage/db'
import { ReportHistoryRecord, RunResult } from '../lib/types'

export function useReportHistory() {
  const [records, setRecords] = useState<ReportHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const all = await db.reportHistory.toArray()
      setRecords(all.sort((a, b) => b.createdAt - a.createdAt))
      setLoading(false)
    }
    load()
  }, [])

  const addRecord = async (result: RunResult, label?: string) => {
    const record: ReportHistoryRecord = {
      id: result.id || result.model || Date.now().toString(),
      label: label || result.label || result.model,
      model: result.model,
      date: result.date,
      css: result.metrics.CSS,
      provider: result.provider,
      tags: [],
      result,
      createdAt: Date.now(),
    }
    await db.reportHistory.put(record)
    setRecords((prev) => [record, ...prev])
    return record
  }

  const removeRecord = async (id: string) => {
    await db.reportHistory.delete(id)
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  const renameRecord = async (id: string, newLabel: string) => {
    const record = await db.reportHistory.get(id)
    if (record) {
      await db.reportHistory.update(id, { ...record, label: newLabel })
      setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, label: newLabel } : r)))
    }
  }

  return { records, loading, addRecord, removeRecord, renameRecord }
}