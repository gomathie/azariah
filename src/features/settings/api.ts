import { callRpc } from '@/lib/supabase/rpc'
import { getSupabase } from '@/lib/supabase/client'

export interface MembershipRow {
  id: string
  role: string
  status: string
  invited_email: string | null
  user_id: string
}

export async function listShopPeople(businessId: string): Promise<ShopPerson[]> {
  const data = await callRpc<ShopPerson[]>('rpc_list_shop_people', { p_business_id: businessId })
  return data ?? []
}

export interface ShopPerson {
  id: string
  name: string
  device_name: string
  role: 'staff' | 'manager'
}

export async function addShopPerson(
  businessId: string,
  name: string,
  deviceName: string,
  role: 'staff' | 'manager',
) {
  return callRpc<ShopPerson>('rpc_add_shop_person', {
    p_client_operation_id: crypto.randomUUID(),
    p_business_id: businessId,
    p_name: name,
    p_device_name: deviceName,
    p_role: role,
  })
}

export async function listMembers(businessId: string): Promise<MembershipRow[]> {
  const { data, error } = await getSupabase()
    .from('business_memberships')
    .select('id, role, status, invited_email, user_id')
    .eq('business_id', businessId)
    .order('created_at')
  if (error) throw error
  return data ?? []
}

export async function inviteMember(businessId: string, email: string, role: string) {
  return callRpc('rpc_invite_member', {
    p_client_operation_id: crypto.randomUUID(),
    p_business_id: businessId,
    p_email: email,
    p_role: role,
  })
}

export async function changeMembership(
  businessId: string,
  membershipId: string,
  role: string | null,
  status: string | null,
) {
  return callRpc('rpc_change_membership', {
    p_client_operation_id: crypto.randomUUID(),
    p_business_id: businessId,
    p_membership_id: membershipId,
    p_role: role,
    p_status: status,
  })
}

export async function exportBusiness(businessId: string) {
  return callRpc<Record<string, unknown>>('rpc_export_business_data', { p_business_id: businessId })
}

export interface SupportAccess {
  active: { id: string; expires_at: string; created_at: string; reason: string | null } | null
  history: { action: string; at: string }[]
}

export async function getSupportAccess(businessId: string): Promise<SupportAccess> {
  return callRpc<SupportAccess>('rpc_list_support_access', { p_business_id: businessId })
}

export async function grantSupportAccess(businessId: string, hours: number, reason: string | null) {
  return callRpc<{ id: string; expires_at: string }>('rpc_grant_support_access', {
    p_business_id: businessId,
    p_hours: hours,
    p_reason: reason,
  })
}

export async function revokeSupportAccess(businessId: string) {
  return callRpc<{ revoked: number }>('rpc_revoke_support_access', { p_business_id: businessId })
}
