import { callRpc, RpcError } from '@/lib/supabase/rpc'
import { CollectionInput } from '@/types/schemas'
import { minorForRpc } from '@/utils/money'

export interface CollectionResult {
  transaction_id: string
  business_date: string
  amount_minor: number
  contact_id: string
  outstanding_minor: number
}

export interface StatementRow {
  date: string
  kind: string
  description: string
  debit_minor: number
  credit_minor: number
  balance_minor: number
}

export async function recordCollection(input: CollectionInput): Promise<CollectionResult> {
  const parsed = CollectionInput.parse({
    ...input,
    clientOperationId: input.clientOperationId || crypto.randomUUID(),
  })
  try {
    return await callRpc<CollectionResult>('rpc_record_collection', {
      p_client_operation_id: parsed.clientOperationId,
      p_business_id: parsed.businessId,
      p_occurred_at: parsed.occurredAt,
      p_contact_id: parsed.contactId,
      p_amount_minor: minorForRpc(parsed.amountMinor),
      p_money_account_id: parsed.moneyAccountId,
      p_note: parsed.note,
    })
  } catch (error) {
    if (error instanceof RangeError) throw new RpcError('AZ_INVALID_AMOUNT', error.message, error)
    throw error
  }
}

export async function getCustomerStatement(
  businessId: string,
  contactId: string,
  from: string | null = null,
  to: string | null = null,
): Promise<StatementRow[]> {
  const rows = await callRpc<StatementRow[]>('rpc_get_customer_statement', {
    p_business_id: businessId,
    p_contact_id: contactId,
    p_from: from,
    p_to: to,
  })
  return rows ?? []
}
