import { RpcError } from '@/lib/supabase/rpc'
import { db, type PendingOperation } from './db'
import { listPending } from './queue'

export interface SyncReport {
  synced: number
  kept: number
  needsAttention: number
}

type RpcCaller = (name: string, params: Record<string, unknown>) => Promise<unknown>

/** Send saved operations in the order they were entered. A successful reply, including a replay, removes the row. */
export async function syncAll(opts: { userId: string }, rpc: RpcCaller): Promise<SyncReport> {
  const report: SyncReport = { synced: 0, kept: 0, needsAttention: 0 }
  const ops = await listPending()
  for (const op of ops) {
    if (op.userId !== opts.userId) {
      await flag(op, 'needs_attention', 'different user')
      report.needsAttention += 1
      continue
    }
    await db.pending_operations.update(op.id, { status: 'syncing' })
    try {
      await rpc(op.payload.rpc, op.payload.params)
      await db.pending_operations.delete(op.id)
      report.synced += 1
    } catch (error) {
      if (error instanceof RpcError && error.code !== 'network') {
        await flag(op, 'needs_attention', error.code)
        report.needsAttention += 1
      } else {
        await db.pending_operations.update(op.id, {
          status: 'saved_on_device',
          attempts: op.attempts + 1,
          lastError: error instanceof Error ? error.message : 'network',
        })
        report.kept += 1
      }
    }
  }
  return report
}

async function flag(op: PendingOperation, status: PendingOperation['status'], lastError: string) {
  await db.pending_operations.update(op.id, { status, lastError, attempts: op.attempts + 1 })
}
