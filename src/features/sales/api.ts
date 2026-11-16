import { saveForLater, browserIsOffline, type SavedOnDevice } from '@/lib/offline/save'
import { callRpc, RpcError } from '@/lib/supabase/rpc'
import { SaleInput } from '@/types/schemas'
import { minorForRpc } from '@/utils/money'

export interface SaleResult {
  transaction_id: string
  receivable_id: string | null
  business_date: string
  amount_minor: number
  received_minor: number
  credit_minor: number
}

export type SaleOutcome = SaleResult | SavedOnDevice

export async function createSale(input: SaleInput): Promise<SaleOutcome> {
  const parsed = SaleInput.parse({
    ...input,
    clientOperationId: input.clientOperationId || crypto.randomUUID(),
  })
  let params: Record<string, unknown>
  try {
    params = {
      p_client_operation_id: parsed.clientOperationId,
      p_business_id: parsed.businessId,
      p_occurred_at: parsed.occurredAt,
      p_amount_minor: minorForRpc(parsed.amountMinor),
      p_received_minor: minorForRpc(parsed.receivedMinor),
      p_money_account_id: parsed.moneyAccountId,
      p_contact_id: parsed.contactId,
      p_category_id: parsed.categoryId,
      p_description: parsed.description,
      p_note: parsed.note,
    }
  } catch (error) {
    if (error instanceof RangeError) throw new RpcError('AZ_INVALID_AMOUNT', error.message, error)
    throw error
  }
  const keep = () =>
    saveForLater({
      id: parsed.clientOperationId,
      businessId: parsed.businessId,
      kind: 'sale',
      payload: { rpc: 'rpc_create_sale', params },
    })
  if (browserIsOffline()) return keep()
  try {
    return await callRpc<SaleResult>('rpc_create_sale', params)
  } catch (error) {
    if (error instanceof RpcError && error.code === 'network') return keep()
    throw error
  }
}
