// Starts a payment for Azaria Plus and returns the address of Paystack's checkout page.
// The caller must be signed in and must be the shop's owner; the database checks that, and it
// also sets the price and applies any discount code. Nothing about the amount is taken from the request.
import { initializeTransaction, PaystackError } from '../_shared/paystack.ts'
import { appUrl, corsHeaders, env, json, userClient } from '../_shared/runtime.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() })
  if (request.method !== 'POST') return json({ error: 'method' }, 405)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json({ error: 'AZ_INVALID_INPUT' }, 400)
  }
  const { business_id, product_code, discount_code, operation_id } = body
  if (
    typeof business_id !== 'string' || !UUID.test(business_id) ||
    typeof operation_id !== 'string' || !UUID.test(operation_id) ||
    typeof product_code !== 'string' || !/^[a-z0-9_]{3,32}$/.test(product_code) ||
    (discount_code != null && (typeof discount_code !== 'string' || discount_code.length > 40))
  ) {
    return json({ error: 'AZ_INVALID_INPUT' }, 400)
  }

  const supabase = userClient(request)
  const { data: userData } = await supabase.auth.getUser()
  const email = userData.user?.email
  if (!email) return json({ error: 'AZ_FORBIDDEN' }, 401)

  const { data, error } = await supabase.rpc('rpc_billing_start_payment', {
    p_client_operation_id: operation_id,
    p_business_id: business_id,
    p_product_code: product_code,
    p_discount_code: discount_code ?? null,
  })
  if (error) {
    const code = /AZ_[A-Z_]+/.exec(error.message)?.[0] ?? 'generic'
    return json({ error: code }, code === 'AZ_FORBIDDEN' ? 403 : 400)
  }
  const payment = data as {
    reference: string
    amount_minor: number
    currency_code: string
    status: string
    plus_until?: string | null
  }

  // A 100% discount code: nothing to pay, and the database has already turned Plus on.
  if (payment.status === 'paid') return json({ status: 'paid', plus_until: payment.plus_until ?? null })

  try {
    const url = await initializeTransaction(env('PAYSTACK_SECRET_KEY'), {
      email,
      amountMinor: payment.amount_minor,
      currency: payment.currency_code,
      reference: payment.reference,
      callbackUrl: `${appUrl()}/settings/plus/return`,
      // Only what is needed to match the payment to a shop. No names, no figures from the books.
      metadata: { business_id, product_code },
    })
    return json({ status: 'pending', reference: payment.reference, authorization_url: url })
  } catch (e) {
    console.error('checkout failed', e instanceof PaystackError ? e.status : 'error')
    return json({ error: 'AZ_PAYMENT_UNAVAILABLE' }, 502)
  }
})
