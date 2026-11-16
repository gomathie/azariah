import { useAuthStore } from '@/stores/auth'
import { RpcError } from '@/lib/supabase/rpc'
import type { PendingOperation } from './db'
import { enqueue } from './queue'

export interface SavedOnDevice {
  status: 'saved_on_device'
  clientOperationId: string
}

export function isSavedOnDevice(value: object): value is SavedOnDevice {
  return 'status' in value && (value as { status?: string }).status === 'saved_on_device'
}

/** Keep a sale or expense on this device until the network can take it. */
export async function saveForLater(
  op: Pick<PendingOperation, 'id' | 'businessId' | 'kind' | 'payload'>,
): Promise<SavedOnDevice> {
  const userId = useAuthStore().user?.id
  if (!userId) throw new RpcError('generic', 'Not signed in')
  await enqueue({
    ...op,
    userId,
    createdAt: new Date().toISOString(),
    status: 'saved_on_device',
    attempts: 0,
    lastError: null,
  })
  return { status: 'saved_on_device', clientOperationId: op.id }
}

export function browserIsOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}
