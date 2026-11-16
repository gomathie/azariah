import { getSupabase } from '@/lib/supabase/client'

export interface DaybookRow {
  id: string
  kind: string
  business_date: string
  amount_minor: number
  description: string | null
  created_at: string
  status: string
}

/** First page of the daybook. Keyset on (business_date, created_at, id), newest first. */
export async function listDaybook(businessId: string, limit = 50): Promise<DaybookRow[]> {
  const { data, error } = await getSupabase()
    .from('transactions')
    .select('id, kind, business_date, amount_minor, description, created_at, status')
    .eq('business_id', businessId)
    .order('business_date', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
