import { db, type PendingOperation } from './db'

export async function enqueue(op: PendingOperation): Promise<void> {
  await db.pending_operations.put(op)
}

export async function listPending(businessId?: string): Promise<PendingOperation[]> {
  const rows = businessId
    ? await db.pending_operations.where('businessId').equals(businessId).sortBy('createdAt')
    : await db.pending_operations.orderBy('createdAt').toArray()
  return rows.filter((row) => row.status === 'saved_on_device' || row.status === 'needs_attention' || row.status === 'syncing')
}
