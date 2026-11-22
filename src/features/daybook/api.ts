import { callRpc } from '@/lib/supabase/rpc'
import { getSupabase } from '@/lib/supabase/client'
import { isIsoDate, isIsoTimestamp, isUuid } from '@/utils/safe'

export interface DaybookRow {
  id: string
  kind: string
  business_date: string
  amount_minor: number
  description: string | null
  note: string | null
  created_at: string
  status: string
  /** Only on daybook list rows. */
  contact?: { name: string } | null
  money_movements?: { amount_minor: number; money_account: { name: string } | null }[]
}

export interface DaybookCursor {
  business_date: string
  created_at: string
  id: string
}

const PAGE_CAP = 100

/** Newest first. The next page starts strictly after the last row, so the list never skips or repeats. */
export async function getDaybook(opts: {
  businessId: string
  from?: string
  to?: string
  kinds?: string[]
  cursor?: DaybookCursor | null
  limit?: number
}): Promise<{ rows: DaybookRow[]; nextCursor: DaybookCursor | null }> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), PAGE_CAP)
  let query = getSupabase()
    .from('transactions')
    .select(
      'id, kind, business_date, amount_minor, description, note, created_at, status, contact:contacts(name), money_movements(amount_minor, money_account:money_accounts(name))',
    )
    .eq('business_id', opts.businessId)
    .order('business_date', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit)
  if (opts.from) query = query.gte('business_date', opts.from)
  if (opts.to) query = query.lte('business_date', opts.to)
  if (opts.kinds && opts.kinds.length > 0) query = query.in('kind', opts.kinds as never)
  if (opts.cursor) {
    const c = opts.cursor
    // These three values are placed inside a filter string. Anything that is not exactly a date,
    // a timestamp and an id could change the filter, so it is refused instead of sent.
    if (!isIsoDate(c.business_date) || !isIsoTimestamp(c.created_at) || !isUuid(c.id)) {
      throw new Error('Invalid daybook cursor')
    }
    query = query.or(
      `business_date.lt.${c.business_date},and(business_date.eq.${c.business_date},created_at.lt."${c.created_at}"),and(business_date.eq.${c.business_date},created_at.eq."${c.created_at}",id.lt.${c.id})`,
    )
  }
  const { data, error } = await query
  if (error) throw error
  const rows = (data ?? []) as unknown as DaybookRow[]
  const last = rows.at(-1)
  const nextCursor =
    rows.length === limit && last
      ? { business_date: last.business_date, created_at: last.created_at, id: last.id }
      : null
  return { rows, nextCursor }
}

export async function listDaybook(businessId: string, limit = 50): Promise<DaybookRow[]> {
  const page = await getDaybook({ businessId, limit })
  return page.rows
}

export async function getTransaction(businessId: string, id: string): Promise<DaybookRow | null> {
  const { data, error } = await getSupabase()
    .from('transactions')
    .select('id, kind, business_date, amount_minor, description, note, created_at, status')
    .eq('business_id', businessId)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function reverseTransaction(businessId: string, transactionId: string, reason: string) {
  return callRpc('rpc_reverse_transaction', {
    p_client_operation_id: crypto.randomUUID(),
    p_business_id: businessId,
    p_transaction_id: transactionId,
    p_reason: reason,
  })
}

/** Signed cash for each transaction. The daybook uses this for the In and Out columns. */
export async function cashForTransactions(
  businessId: string,
  transactionIds: string[],
): Promise<Record<string, bigint[]>> {
  const totals: Record<string, bigint[]> = {}
  if (transactionIds.length === 0) return totals
  const { data, error } = await getSupabase()
    .from('money_movements')
    .select('transaction_id, amount_minor')
    .eq('business_id', businessId)
    .in('transaction_id', transactionIds)
  if (error) throw error
  for (const row of data ?? []) {
    const list = totals[row.transaction_id] ?? []
    list.push(BigInt(row.amount_minor))
    totals[row.transaction_id] = list
  }
  return totals
}
