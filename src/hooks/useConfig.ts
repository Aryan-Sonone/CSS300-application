import { useEffect } from 'react'
import { db } from '../storage/db'
import { RunConfig } from '../lib/types'

export function useConfig() {
  useEffect(() => {
    // Load or init configs
    const load = async () => {
      const existing = await db.configs.count()
      if (existing === 0) {
        // No configs yet - could load defaults here
      }
    }
    load()
  }, [])

  const saveConfig = async (name: string, config: RunConfig) => {
    await db.configs.put({ id: name, name, config, updatedAt: Date.now() })
  }

  const loadConfig = async (name: string): Promise<RunConfig | undefined> => {
    const record = await db.configs.get(name)
    return record?.config
  }

  const deleteConfig = async (name: string) => {
    await db.configs.delete(name)
  }

  return { saveConfig, loadConfig, deleteConfig }
}