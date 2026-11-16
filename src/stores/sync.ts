import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listPending } from '@/lib/offline/queue'
import { syncAll, type SyncReport } from '@/lib/offline/sync'
import { callRpc } from '@/lib/supabase/rpc'
import { useAuthStore } from './auth'
import { useBusinessStore } from './business'

export const useSyncStore = defineStore('sync', () => {
  const pending = ref(0)
  const lastReport = ref<SyncReport | null>(null)
  const syncing = ref(false)

  async function refresh() {
    const business = useBusinessStore()
    if (!business.current) {
      pending.value = 0
      return
    }
    pending.value = (await listPending(business.current.id)).length
  }

  async function syncNow(): Promise<SyncReport> {
    const userId = useAuthStore().user?.id
    if (!userId) return { synced: 0, kept: 0, needsAttention: 0 }
    syncing.value = true
    try {
      lastReport.value = await syncAll({ userId }, (name, params) => callRpc(name, params))
      await refresh()
      return lastReport.value
    } finally {
      syncing.value = false
    }
  }

  return { pending, lastReport, syncing, refresh, syncNow }
})
