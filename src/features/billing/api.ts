import { getSupabase } from '@/lib/supabase/client'
import { callRpc, RpcError, type AzariaErrorCode } from '@/lib/supabase/rpc'

export interface BillingProduct {
  code: string
  months: number
  amount_minor: number
  currency_code: string
}

export interface BillingPayment {
  reference: string
  months: number
  amount_minor: number
  list_amount_minor: number
  percent_off: number
  currency_code: string
  status: 'pending' | 'paid' | 'failed'
  channel: string | null
  paid_at: string | null
  created_at: string
}

export interface BillingStatus {
  /** False until the platform admin turns payments on for everyone. */
  payments_on: boolean
  plus_until: string | null
  has_plus: boolean
  in_grace: boolean
  trial_available: boolean
  can_pay: boolean
  products: BillingProduct[]
  payments: BillingPayment[]
}

export interface DiscountCheck {
  code: string
  percent_off: number
  valid_until: string | null
}

export type CheckoutResult =
  | { status: 'paid'; plus_until: string | null }
  | { status: 'pending'; reference: string; authorization_url: string }

export interface ConfirmResult {
  status: 'paid' | 'pending' | 'failed'
  plus_until?: string | null
}

/** Our payment references. Anything else in the address bar is ignored. */
export const isPaymentReference = (value: unknown): value is string =>
  typeof value === 'string' && /^azp-[0-9a-f]{32}$/.test(value)

/** The price after a percentage off, in whole minor units, rounded down exactly as the database does. */
export function discountedMinor(amountMinor: number, percentOff: number): bigint {
  return (BigInt(amountMinor) * BigInt(100 - percentOff)) / 100n
}

export const getBillingStatus = (businessId: string) =>
  callRpc<BillingStatus>('rpc_billing_status', { p_business_id: businessId })

export const startTrial = (businessId: string) =>
  callRpc<{ plus_until: string }>('rpc_start_trial', {
    p_client_operation_id: crypto.randomUUID(),
    p_business_id: businessId,
  })

export const checkDiscountCode = (businessId: string, code: string) =>
  callRpc<DiscountCheck>('rpc_check_discount_code', { p_business_id: businessId, p_code: code })

/** Calls a billing Edge Function and turns its `{ error: 'AZ_…' }` answers into RpcError. */
async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().functions.invoke(name, { body })
  if (!error) return data as T
  let code: string | undefined
  try {
    const context = (error as { context?: Response }).context
    code = context ? ((await context.json()) as { error?: string }).error : undefined
  } catch {
    /* no readable answer: treated as a network or generic failure below */
  }
  if (code && /^AZ_[A-Z_]+$/.test(code)) throw new RpcError(code as AzariaErrorCode, code, error)
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  throw new RpcError(offline || !code ? 'network' : 'generic', String(error), error)
}

/** Asks the server to open a payment. The price is set there, never here. */
export const startCheckout = (businessId: string, productCode: string, discountCode: string | null) =>
  callFunction<CheckoutResult>('billing-checkout', {
    business_id: businessId,
    product_code: productCode,
    discount_code: discountCode,
    operation_id: crypto.randomUUID(),
  })

/**
 * A 100% discount code leaves nothing to pay, so Paystack is not involved: the database checks the
 * code and turns Plus on itself. If the code no longer brings the price to zero, the answer is 'pending'.
 */
export const startFreePayment = (businessId: string, productCode: string, discountCode: string) =>
  callRpc<{ status: 'paid' | 'pending'; plus_until?: string | null }>('rpc_billing_start_payment', {
    p_client_operation_id: crypto.randomUUID(),
    p_business_id: businessId,
    p_product_code: productCode,
    p_discount_code: discountCode,
  })

export const confirmPayment = (reference: string) => callFunction<ConfirmResult>('billing-verify', { reference })
