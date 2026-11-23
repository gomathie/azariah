import { callRpc } from '@/lib/supabase/rpc'

export type PaymentsMode = 'default' | 'on' | 'off'

/** One line of the shop directory. It carries no sales, balances or customers by design. */
export interface DirectoryShop {
  id: string
  name: string
  business_type: string
  /** 'default' follows the switch for everyone; 'on' and 'off' are set for this shop alone. */
  payments_mode?: PaymentsMode
  country_code: string
  currency_code: string
  status: 'active' | 'suspended' | 'archived'
  created_at: string
  owner_email: string | null
  member_count: number
  last_entry_date: string | null
  support_expires_at: string | null
  /** Until when the shop has Azaria Plus. Missing on a database without the billing migration. */
  plus_until?: string | null
}

export async function listShops(search: string | null, before: string | null = null): Promise<DirectoryShop[]> {
  const rows = await callRpc<DirectoryShop[]>('rpc_admin_list_businesses', {
    p_search: search,
    p_limit: 25,
    p_before: before,
  })
  return rows ?? []
}

export async function setShopStatus(businessId: string, status: 'active' | 'suspended', reason: string) {
  return callRpc<{ id: string; status: string }>('rpc_admin_set_business_status', {
    p_business_id: businessId,
    p_status: status,
    p_reason: reason,
  })
}

export interface DiscountCode {
  id: string
  code: string
  percent_off: number
  /** null means the code never runs out. */
  valid_until: string | null
  max_uses: number | null
  note: string | null
  active: boolean
  created_at: string
  /** Payments that used the code and went through. */
  uses: number
}

export async function listDiscountCodes(): Promise<DiscountCode[]> {
  return (await callRpc<DiscountCode[]>('rpc_admin_list_discount_codes', {})) ?? []
}

export interface NewDiscountCode {
  code: string
  percentOff: number
  /** null for a code that never runs out. */
  validDays: number | null
  maxUses: number | null
  note: string | null
}

export function createDiscountCode(input: NewDiscountCode) {
  return callRpc<{ id: string; code: string }>('rpc_admin_create_discount_code', {
    p_code: input.code,
    p_percent_off: input.percentOff,
    p_valid_days: input.validDays,
    p_max_uses: input.maxUses,
    p_note: input.note,
  })
}

export function setDiscountCodeActive(id: string, active: boolean) {
  return callRpc<{ id: string; active: boolean }>('rpc_admin_set_discount_code_active', { p_id: id, p_active: active })
}

export interface AdminBillingProduct {
  code: string
  months: number
  amount_minor: number
  currency_code: string
  active: boolean
}

export interface AdminBillingSettings {
  payments_on: boolean
  updated_at: string | null
  products: AdminBillingProduct[]
}

/** The switch for all payments and every plan, also plans that are not offered. Platform admin only. */
export const getBillingSettings = () => callRpc<AdminBillingSettings>('rpc_admin_billing_settings', {})

export const setPaymentsOn = (on: boolean) =>
  callRpc<{ payments_on: boolean }>('rpc_admin_set_payments_on', { p_on: on })

export const updateBillingProduct = (code: string, amountMinor: number, active: boolean) =>
  callRpc<{ code: string }>('rpc_admin_update_billing_product', {
    p_code: code,
    p_amount_minor: amountMinor,
    p_active: active,
  })

export const ADMIN_RIGHTS = ['view_shops', 'edit_shops', 'suspend_shops', 'billing'] as const
export type AdminRight = (typeof ADMIN_RIGHTS)[number]

export interface TeamAdmin {
  user_id: string
  email: string | null
  is_super: boolean
  rights: AdminRight[]
  note: string | null
  created_at: string
  is_me: boolean
}

/** Everyone on the support team. Superadmin only. */
export async function listAdmins(): Promise<TeamAdmin[]> {
  return (await callRpc<TeamAdmin[]>('rpc_admin_list_admins', {})) ?? []
}

/** Add a person to the team, or change what they may do. The person must already have an account. */
export const saveAdmin = (email: string, rights: AdminRight[], isSuper: boolean) =>
  callRpc<{ user_id: string }>('rpc_admin_save_admin', {
    p_email: email,
    p_rights: isSuper ? [] : rights,
    p_is_super: isSuper,
  })

export const removeAdmin = (userId: string) =>
  callRpc<{ removed: boolean }>('rpc_admin_remove_admin', { p_user_id: userId })

export const setShopPayments = (businessId: string, mode: PaymentsMode) =>
  callRpc<{ id: string; payments_mode: PaymentsMode }>('rpc_admin_set_business_payments', {
    p_business_id: businessId,
    p_mode: mode,
  })

export interface Account {
  id: string
  email: string | null
  created_at: string
  last_sign_in_at: string | null
  confirmed: boolean
  is_admin: boolean
  shops: { id: string; name: string; role: 'owner' | 'manager' | 'staff' | 'viewer'; status: string }[]
}

/** Every account that was created, newest first. Any platform admin. */
export async function listAccounts(search: string | null, before: string | null = null): Promise<Account[]> {
  return (
    (await callRpc<Account[]>('rpc_admin_list_accounts', { p_search: search, p_limit: 25, p_before: before })) ?? []
  )
}
