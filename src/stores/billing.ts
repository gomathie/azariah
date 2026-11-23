import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getBillingStatus, type BillingStatus } from '@/features/billing/api'

/**
 * Whether the current shop has Azaria Plus. The answer always comes from the database
 * (rpc_billing_status); nothing here can turn Plus on.
 */
export const useBillingStore = defineStore('billing', () => {
  const status = ref<BillingStatus | null>(null)
  const businessId = ref<string | null>(null)

  const hasPlus = computed(() => status.value?.has_plus === true)
  const inGrace = computed(() => status.value?.in_grace === true)

  /** Whole days until the paid time runs out; 0 once it has. Null when the shop never had Plus. */
  function daysLeft(now: Date = new Date()): number | null {
    const until = status.value?.plus_until
    if (!until) return null
    return Math.max(0, Math.ceil((new Date(until).getTime() - now.getTime()) / 86_400_000))
  }

  async function load(id: string) {
    const next = await getBillingStatus(id)
    businessId.value = id
    status.value = next
    return next
  }

  function reset() {
    status.value = null
    businessId.value = null
  }

  return { status, businessId, hasPlus, inGrace, daysLeft, load, reset }
})
