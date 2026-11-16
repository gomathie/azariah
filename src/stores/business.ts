import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getSupabase } from '@/lib/supabase/client'
import { callRpc } from '@/lib/supabase/rpc'
import { useAuthStore } from './auth'

export interface Business {
  id: string
  name: string
  business_type: string
  country_code: string
  timezone: string
  currency_code: string
  minor_unit: number
  role: 'owner' | 'manager' | 'staff' | 'viewer'
}

export interface CreateBusinessInput {
  name: string
  businessType: 'retail' | 'food' | 'services' | 'other'
  countryCode: string
  timezone: string
  currencyCode: string
}

const STORAGE_KEY = 'azaria.business'

function readStoredId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export const useBusinessStore = defineStore('business', () => {
  const businesses = ref<Business[]>([])
  const currentBusinessId = ref<string | null>(readStoredId())
  const loaded = ref(false)
  const loading = ref(false)

  const current = computed(
    () => businesses.value.find((b) => b.id === currentBusinessId.value) ?? businesses.value[0] ?? null,
  )

  async function load() {
    loading.value = true
    try {
      const { data, error } = await getSupabase()
        .from('business_memberships')
        .select(
          'role, business:businesses(id, name, business_type, country_code, timezone, currency_code, minor_unit)',
        )
        .eq('status', 'active')
      if (error) throw error
      businesses.value = (data ?? [])
        .filter((row) => row.business)
        .map((row) => ({ ...(row.business as Omit<Business, 'role'>), role: row.role }))
      if (!businesses.value.some((b) => b.id === currentBusinessId.value)) {
        select(businesses.value[0]?.id ?? null)
      }
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  async function ensureLoaded() {
    if (!loaded.value) await load()
  }

  function select(id: string | null) {
    currentBusinessId.value = id
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* storage unavailable */
    }
  }

  async function createBusiness(input: CreateBusinessInput): Promise<string> {
    const result = await callRpc('rpc_create_business_and_owner', {
      p_client_operation_id: crypto.randomUUID(),
      p_name: input.name,
      p_business_type: input.businessType,
      p_country_code: input.countryCode,
      p_timezone: input.timezone,
      p_currency_code: input.currencyCode,
    })
    const businessId = (result as { business_id: string }).business_id
    await load()
    select(businessId)
    return businessId
  }

  function reset() {
    businesses.value = []
    loaded.value = false
    select(null)
  }

  // Clear state on sign-out so a second user on the same device never sees the first user's list.
  const auth = useAuthStore()
  auth.$subscribe(() => {
    if (!auth.isSignedIn && loaded.value) reset()
  })

  return { businesses, currentBusinessId, current, loaded, loading, load, ensureLoaded, select, createBusiness, reset }
})
