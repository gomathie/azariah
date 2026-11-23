// Called when the owner lands back in the app after Paystack, or taps "Check my payment".
// It confirms one reference with Paystack and applies it, so Plus turns on even if the webhook is late.
import { isReference } from '../_shared/paystack.ts'
import { confirmPayment, corsHeaders, json, userClient } from '../_shared/runtime.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() })
  if (request.method !== 'POST') return json({ error: 'method' }, 405)

  let reference: unknown
  try {
    reference = (await request.json()).reference
  } catch {
    return json({ error: 'AZ_INVALID_INPUT' }, 400)
  }
  if (!isReference(reference)) return json({ error: 'AZ_INVALID_INPUT' }, 400)

  // Row security decides whether this person may see the payment: only the shop's owner or manager can.
  const { data: payment, error } = await userClient(request)
    .from('billing_payments')
    .select('status, business_id')
    .eq('reference', reference)
    .maybeSingle()
  if (error || !payment) return json({ error: 'AZ_NOT_FOUND' }, 404)

  try {
    return json(await confirmPayment(reference))
  } catch (e) {
    console.error('verify failed', e instanceof Error ? e.name : 'error')
    return json({ error: 'AZ_PAYMENT_UNAVAILABLE' }, 502)
  }
})
