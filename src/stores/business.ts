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
  businessType: 'retail' | 'food' | 'services' | 'salon' | 'other'
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
  /** True for a superadmin, who holds every right and manages the support team. */
  const superAdmin = ref(false)
  /** What this admin may do: view_shops, edit_shops, suspend_shops, billing. Set by a superadmin. */
  const adminRights = ref<string[]>([])
  /**
   * A shop a platform admin has open. Held in memory only, so a reload ends it. The role is
   * 'viewer' when the shop is open to look and 'owner' when it is open for changes. The screens
   * follow the role; the database decides on every call what is really allowed.
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
        const who = await callRpc<{ is_platform_admin?: boolean; is_super?: boolean; rights?: string[] }>(
          'rpc_admin_whoami',
          {},
        )
        platformAdmin.value = who?.is_platform_admin === true
        superAdmin.value = who?.is_super === true
        adminRights.value = Array.isArray(who?.rights) ? who.rights : []
      } catch {
        platformAdmin.value = false
        superAdmin.value = false
        adminRights.value = []
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

  /** Whether this admin holds a right. Only for showing or hiding buttons; the database checks again. */
  function can(right: string): boolean {
    return superAdmin.value || adminRights.value.includes(right)
  }

  async function openSupport(businessId: string, edit = false) {
    const { can_edit, ...row } = await callRpc<Omit<Business, 'role'> & { can_edit?: boolean }>(
      'rpc_admin_open_business',
      { p_business_id: businessId, p_edit: edit },
    )
    supportBusiness.value = { ...row, role: can_edit === true ? 'owner' : 'viewer' }
  }

  function closeSupport() {
    const id = supportBusiness.value?.id
    supportBusiness.value = null
    // Close the shop on the server too. If this fails, it closes by itself after two hours.
    if (id) void callRpc('rpc_admin_close_business', { p_business_id: id }).catch(() => undefined)
  }

  function reset() {
    businesses.value = []
    platformAdmin.value = false
    superAdmin.value = false
    adminRights.value = []
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
    superAdmin,
    adminRights,
    can,
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
