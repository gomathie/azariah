import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RpcError } from '@/lib/supabase/rpc'
import { db, type PendingOperation } from '../db'
import { enqueue } from '../queue'
import { syncAll } from '../sync'

function op(id: string, createdAt: string, userId = 'user'): PendingOperation {
  return {
    id,
    businessId: 'biz',
    userId,
    kind: 'sale',
    payload: { rpc: 'rpc_create_sale', params: { p_client_operation_id: id } },
    createdAt,
    status: 'saved_on_device',
    attempts: 0,
    lastError: null,
  }
}

describe('syncAll', () => {
  beforeEach(async () => {
    await db.pending_operations.clear()
  })

  it('sends operations in order and removes them when the server accepts them', async () => {
    await enqueue(op('second', '2026-01-02T00:00:00.000Z'))
    await enqueue(op('first', '2026-01-01T00:00:00.000Z'))
    const rpc = vi.fn<(name: string, params: Record<string, unknown>) => Promise<unknown>>().mockResolvedValue({ transaction_id: 't' })
    const report = await syncAll({ userId: 'user' }, rpc)
    expect(rpc.mock.calls.map((call) => call[1].p_client_operation_id)).toEqual(['first', 'second'])
    expect(report.synced).toBe(2)
    expect(await db.pending_operations.count()).toBe(0)
  })

  it('keeps a network failure and counts the attempt', async () => {
    await enqueue(op('net', '2026-01-01T00:00:00.000Z'))
    const rpc = vi.fn<(name: string, params: Record<string, unknown>) => Promise<unknown>>().mockRejectedValue(new RpcError('network', 'offline'))
    const report = await syncAll({ userId: 'user' }, rpc)
    expect(report.kept).toBe(1)
    const row = await db.pending_operations.get('net')
    expect(row?.attempts).toBe(1)
    expect(row?.status).toBe('saved_on_device')
  })

  it('marks a rejected entry as needing attention', async () => {
    await enqueue(op('bad', '2026-01-01T00:00:00.000Z'))
    const rpc = vi.fn<(name: string, params: Record<string, unknown>) => Promise<unknown>>().mockRejectedValue(new RpcError('AZ_INVALID_AMOUNT', 'AZ_INVALID_AMOUNT'))
    const report = await syncAll({ userId: 'user' }, rpc)
    expect(report.needsAttention).toBe(1)
    expect((await db.pending_operations.get('bad'))?.status).toBe('needs_attention')
  })

  it('removes an operation the server already accepted', async () => {
    await enqueue(op('dup', '2026-01-01T00:00:00.000Z'))
    const rpc = vi.fn<(name: string, params: Record<string, unknown>) => Promise<unknown>>().mockResolvedValue({ transaction_id: 'already' })
    await syncAll({ userId: 'user' }, rpc)
    expect(await db.pending_operations.get('dup')).toBeUndefined()
  })

  it('does not send another user’s saved entries', async () => {
    await enqueue(op('other', '2026-01-01T00:00:00.000Z', 'someone-else'))
    const rpc = vi.fn<(name: string, params: Record<string, unknown>) => Promise<unknown>>()
    const report = await syncAll({ userId: 'user' }, rpc)
    expect(rpc).not.toHaveBeenCalled()
    expect(report.needsAttention).toBe(1)
    expect((await db.pending_operations.get('other'))?.status).toBe('needs_attention')
  })
})
