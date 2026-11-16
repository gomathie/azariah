import { callRpc } from '@/lib/supabase/rpc'
import { getSupabase } from '@/lib/supabase/client'
import { minorForRpc } from '@/utils/money'

export interface AccountBalance {
  id: string
  name: string
  type: string
  balance_minor: number
}

export async function listAccountBalances(businessId: string): Promise<AccountBalance[]> {
  const { data, error } = await getSupabase()
    .from('v_account_balances')
    .select('money_account_id, name, type, balance_minor')
    .eq('business_id', businessId)
    .order('sort_order')
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.money_account_id,
    name: row.name,
    type: row.type,
    balance_minor: row.balance_minor ?? 0,
  }))
}

export async function transferBetweenAccounts(input: {
  businessId: string
  occurredAt: string
  fromAccountId: string
  toAccountId: string
  amountMinor: bigint
  note: string | null
}) {
  return callRpc('rpc_transfer_between_accounts', {
    p_client_operation_id: crypto.randomUUID(),
    p_business_id: input.businessId,
    p_occurred_at: input.occurredAt,
    p_from_account_id: input.fromAccountId,
    p_to_account_id: input.toAccountId,
    p_amount_minor: minorForRpc(input.amountMinor),
    p_note: input.note,
  })
}

export interface AccountStatement {
  opening_minor: number
  closing_minor: number
  lines: { date: string; amount_minor: number; transaction_id: string }[]
}

export async function getAccountStatement(
  businessId: string,
  accountId: string,
  from: string,
  to: string,
): Promise<AccountStatement> {
  return callRpc<AccountStatement>('rpc_report_account_statement', {
    p_business_id: businessId,
    p_from: from,
    p_to: to,
    p_filters: { money_account_id: accountId },
  })
}
