// Edge-runtime plumbing shared by the billing functions: settings, CORS, clients and the one
// "confirm with Paystack, then apply" path that both the webhook and the return screen use.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { verifyTransaction } from './paystack.ts'

export function env(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing setting ${name}`)
  return value
}

/** The app's own address, such as https://app.example. The only origin allowed to call these functions. */
export const appUrl = () => env('APP_URL').replace(/\/+$/, '')

export function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': appUrl(),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}

/** A client that acts as the signed-in person: row security and role checks apply to everything it does. */
export function userClient(request: Request): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** The service role. Used only to call billing_* functions after Paystack has confirmed a payment. */
export function serviceClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export interface ConfirmResult {
  status: 'paid' | 'pending' | 'failed'
  plus_until?: string | null
}

/**
 * Asks Paystack about one reference and, if the money arrived, extends the shop's Plus.
 * billing_apply_payment refuses a wrong amount or currency and counts each reference once,
 * so calling this twice, or from both the webhook and the return screen, is safe.
 */
export async function confirmPayment(reference: string): Promise<ConfirmResult> {
  const verified = await verifyTransaction(env('PAYSTACK_SECRET_KEY'), reference)
  if (verified.status !== 'success') {
    return { status: verified.status === 'failed' || verified.status === 'abandoned' ? 'failed' : 'pending' }
  }
  const { data, error } = await serviceClient().rpc('billing_apply_payment', {
    p_reference: reference,
    p_amount_minor: verified.amountMinor,
    p_currency_code: verified.currency,
    p_channel: verified.channel,
    p_paid_at: verified.paidAt,
  })
  if (error) throw new Error(error.message)
  return { status: 'paid', plus_until: (data as { plus_until?: string | null }).plus_until ?? null }
}
