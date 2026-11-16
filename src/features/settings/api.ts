import { callRpc } from '@/lib/supabase/rpc'
import { getSupabase } from '@/lib/supabase/client'

export interface MembershipRow {
  id: string
  role: string
  status: string
  invited_email: string | null
  user_id: string
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
