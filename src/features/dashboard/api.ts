import { callRpc } from '@/lib/supabase/rpc'

export interface DashboardAccount {
  id: string
  name: string
  type: string
  balance_minor: number
}

export interface DashboardSummary {
  sales_minor: number
  money_received_minor: number
  operating_expenses_minor: number
  stock_purchases_minor: number
  net_cash_movement_minor: number
  customer_debts_minor: number
  accounts: DashboardAccount[]
}

export async function getDashboard(businessId: string, from: string | null, to: string | null) {
  return callRpc<DashboardSummary>('rpc_get_dashboard_summary', {
    p_business_id: businessId,
    p_from: from,
    p_to: to,
  })
}
