import { callRpc } from '@/lib/supabase/rpc'

export type ReportName =
  | 'sales'
  | 'money_received'
  | 'expenses'
  | 'stock'
  | 'account_statement'
  | 'cash_movement'
  | 'customer_debts'

const RPC: Record<ReportName, string> = {
  sales: 'rpc_report_sales',
  money_received: 'rpc_report_money_received',
  expenses: 'rpc_report_expenses',
  stock: 'rpc_report_stock_purchases',
  account_statement: 'rpc_report_account_statement',
  cash_movement: 'rpc_report_cash_movement',
  customer_debts: 'rpc_report_customer_debts',
}

export async function runReport(
  name: ReportName,
  businessId: string,
  from: string,
  to: string,
  filters: Record<string, string> = {},
) {
  return callRpc<unknown>(RPC[name], {
    p_business_id: businessId,
    p_from: from,
    p_to: to,
    p_filters: filters,
  })
}
