import { callRpc, RpcError } from '@/lib/supabase/rpc'
import { ExpenseInput } from '@/types/schemas'
import { minorForRpc } from '@/utils/money'

export interface ExpenseResult {
  transaction_id: string
  business_date: string
  amount_minor: number
  kind: string
}

export async function createExpense(input: ExpenseInput, kind: 'operating' | 'stock'): Promise<ExpenseResult> {
  const parsed = ExpenseInput.parse({
    ...input,
    clientOperationId: input.clientOperationId || crypto.randomUUID(),
  })
  const name = kind === 'stock' ? 'rpc_record_stock_purchase' : 'rpc_record_expense'
  try {
    return await callRpc<ExpenseResult>(name, {
      p_client_operation_id: parsed.clientOperationId,
      p_business_id: parsed.businessId,
      p_occurred_at: parsed.occurredAt,
      p_amount_minor: minorForRpc(parsed.amountMinor),
      p_money_account_id: parsed.moneyAccountId,
      p_category_id: parsed.categoryId,
      p_description: parsed.description,
      p_note: parsed.note,
    })
  } catch (error) {
    if (error instanceof RangeError) throw new RpcError('AZ_INVALID_AMOUNT', error.message, error)
    throw error
  }
}
