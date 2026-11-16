import Dexie, { type Table } from 'dexie'

export type SyncStatus = 'saved_on_device' | 'syncing' | 'synced' | 'needs_attention'

export interface PendingOperation {
  id: string
  businessId: string
  userId: string
  kind: 'sale' | 'expense'
  payload: { rpc: string; params: Record<string, unknown> }
  createdAt: string
  status: SyncStatus
  attempts: number
  lastError: string | null
}

export class AzariaDB extends Dexie {
  pending_operations!: Table<PendingOperation, string>

  constructor() {
    super('azaria')
    this.version(1).stores({
      pending_operations: 'id, businessId, userId, status, createdAt',
    })
  }
}

export const db = new AzariaDB()
