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

  /** True for a member of the Azaria support team. Decided by the database, never by the browser. */
  const platformAdmin = ref(false)
  /**
   * A shop a platform admin is looking at with the owner's permission. Held in memory only, so a
   * reload ends the look. The role is 'viewer': the screens hide write actions and the database
   * refuses them regardless.
   */
  const supportBusiness = ref<Business | null>(null)

  const current = computed(
    () =>
      supportBusiness.value ??
      businesses.value.find((b) => b.id === currentBusinessId.value) ??
      businesses.value[0] ??
      null,
  )

  async function load() {
    loading.value = true
    try {
      // Ask only for this person's own memberships. Row security also lets a support person with a live
      // grant read a shop's membership rows, and those must never be mistaken for their own role.
      const userId = useAuthStore().user?.id
      if (!userId) {
        businesses.value = []
        loaded.value = true
        return
      }
      const { data, error } = await getSupabase()
        .from('business_memberships')
        .select(
          'role, business:businesses(id, name, business_type, country_code, timezone, currency_code, minor_unit)',
        )
        .eq('status', 'active')
        .eq('user_id', userId)
      if (error) throw error
      type Row = { role: Business['role']; business: Omit<Business, 'role'> | null }
      businesses.value = ((data ?? []) as unknown as Row[])
        .filter((row): row is Row & { business: Omit<Business, 'role'> } => row.business !== null)
        .map((row) => ({ ...row.business, role: row.role }))
      if (!businesses.value.some((b) => b.id === currentBusinessId.value)) {
        select(businesses.value[0]?.id ?? null)
      }
      // A database without the support migration simply has no admins; that must not block sign-in.
      try {
        const who = await callRpc<{ is_platform_admin?: boolean }>('rpc_admin_whoami', {})
        platformAdmin.value = who?.is_platform_admin === true
      } catch {
        platformAdmin.value = false
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

  async function openSupport(businessId: string) {
    const row = await callRpc<Omit<Business, 'role'>>('rpc_admin_open_business', { p_business_id: businessId })
    supportBusiness.value = { ...row, role: 'viewer' }
  }

  function closeSupport() {
    supportBusiness.value = null
  }

  function reset() {
    businesses.value = []
    platformAdmin.value = false
    supportBusiness.value = null
    loaded.value = false
    select(null)
  }

  // Clear state on sign-out so a second user on the same device never sees the first user's list.
  const auth = useAuthStore()
  auth.$subscribe(() => {
    if (!auth.isSignedIn && loaded.value) reset()
  })

  return {
    businesses,
    currentBusinessId,
    current,
    loaded,
    loading,
    platformAdmin,
    supportBusiness,
    load,
    ensureLoaded,
    select,
    createBusiness,
    openSupport,
    closeSupport,
    reset,
  }
})
