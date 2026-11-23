// Paystack calls this address when something happens to a payment. It is the only endpoint in the
// project that takes no sign-in (verify_jwt = false in supabase/config.toml), so it trusts nothing:
//   1. the signature is checked against the raw body before the body is parsed;
//   2. the event is stored for audit;
//   3. for a successful charge, Paystack is asked directly what happened before anything changes.
// Logs carry the event type and reference only, never the payload.
import { isReference, verifySignature } from '../_shared/paystack.ts'
import { confirmPayment, env, serviceClient } from '../_shared/runtime.ts'

const plain = (text: string, status: number) => new Response(text, { status })

Deno.serve(async (request) => {
  if (request.method !== 'POST') return plain('method not allowed', 405)

  const raw = await request.text()
  if (raw.length > 200_000) return plain('too large', 413)
  if (!(await verifySignature(raw, request.headers.get('x-paystack-signature'), env('PAYSTACK_SECRET_KEY')))) {
    return plain('bad signature', 401)
  }

  let event: { event?: unknown; data?: { id?: unknown; reference?: unknown } }
  try {
    event = JSON.parse(raw)
  } catch {
    return plain('bad body', 400)
  }
  const type = typeof event.event === 'string' ? event.event : 'unknown'
  const reference = typeof event.data?.reference === 'string' ? event.data.reference : null
  const key = `${type}:${String(event.data?.id ?? reference ?? crypto.randomUUID())}`

  const supabase = serviceClient()
  const { error: storeError } = await supabase.rpc('billing_record_event', {
    p_event_key: key,
    p_event_type: type,
    p_reference: reference,
    p_payload: event,
  })
  // If we cannot even store the event, ask Paystack to send it again later.
  if (storeError) return plain('try again', 500)

  // A reference that is not in our format belongs to something else on the same Paystack account.
  if (type === 'charge.success' && isReference(reference)) {
    try {
      const result = await confirmPayment(reference)
      console.log('webhook', type, reference, result.status)
      await supabase.rpc('billing_event_processed', { p_event_key: key })
    } catch (e) {
      // A wrong amount, an unknown reference or Paystack being unreachable. A non-200 answer makes
      // Paystack retry, and applying a payment twice is harmless.
      console.error('webhook failed', type, reference, e instanceof Error ? e.message.slice(0, 80) : 'error')
      return plain('try again', 500)
    }
  }
  return plain('ok', 200)
})
