import { saveForLater, browserIsOffline, type SavedOnDevice } from '@/lib/offline/save'
import { callRpc, RpcError } from '@/lib/supabase/rpc'
import { ExpenseInput } from '@/types/schemas'
import { minorForRpc } from '@/utils/money'

export interface ExpenseResult {
  transaction_id: string
  business_date: string
  amount_minor: number
  kind: string
}

export type ExpenseOutcome = ExpenseResult | SavedOnDevice

export async function createExpense(
  input: ExpenseInput,
  kind: 'operating' | 'stock',
): Promise<ExpenseOutcome> {
  const parsed = ExpenseInput.parse({
    ...input,
    clientOperationId: input.clientOperationId || crypto.randomUUID(),
  })
  const name = kind === 'stock' ? 'rpc_record_stock_purchase' : 'rpc_record_expense'
  let params: Record<string, unknown>
  try {
    params = {
      p_client_operation_id: parsed.clientOperationId,
      p_business_id: parsed.businessId,
      p_occurred_at: parsed.occurredAt,
      p_amount_minor: minorForRpc(parsed.amountMinor),
      p_money_account_id: parsed.moneyAccountId,
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
      kind: 'expense',
      payload: { rpc: name, params },
    })
  if (browserIsOffline()) return keep()
  try {
    return await callRpc<ExpenseResult>(name, params)
  } catch (error) {
    if (error instanceof RpcError && error.code === 'network') return keep()
    throw error
  }
}
