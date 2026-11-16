import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, type PendingOperation } from '../db'
import { enqueue, listPending } from '../queue'

function op(id: string, createdAt: string): PendingOperation {
  return {
    id,
    businessId: 'biz',
    userId: 'user',
    kind: 'sale',
    payload: { rpc: 'rpc_create_sale', params: { p_client_operation_id: id } },
    createdAt,
    status: 'saved_on_device',
    attempts: 0,
    lastError: null,
  }
}

describe('offline queue', () => {
  beforeEach(async () => {
    await db.pending_operations.clear()
  })

  it('lists saved operations in the order they were entered', async () => {
    await enqueue(op('b', '2026-01-02T00:00:00.000Z'))
    await enqueue(op('a', '2026-01-01T00:00:00.000Z'))
    const rows = await listPending('biz')
    expect(rows.map((row) => row.id)).toEqual(['a', 'b'])
  })
})
