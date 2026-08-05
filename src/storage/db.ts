import Dexie, { Table } from 'dexie'
import { StoredConfig, ReportHistoryRecord } from '../lib/types'

export interface ConfigStore extends StoredConfig {
  encryptedKey?: string
}

export class CSS300DB extends Dexie {
  configs!: Table<StoredConfig, string>
  keys!: Table<{ provider: string; encryptedKey: string }, string>
  reportHistory!: Table<ReportHistoryRecord, string>
  settings!: Table<{ key: string; value: string }, string>

  constructor() {
    super('css300-web')
    this.version(1).stores({
      configs: 'id, name, updatedAt',
      keys: 'provider',
      reportHistory: 'id, model, date, provider, createdAt',
      settings: 'key',
    })
  }
}

export const db = new CSS300DB()