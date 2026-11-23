/**
 * Paystack helpers shared by the billing Edge Functions.
 *
 * This file uses only web-standard APIs (fetch, Web Crypto, TextEncoder), so the same code runs in
 * the Edge runtime and in the Vitest unit tests (src/features/billing/__tests__/paystack.spec.ts).
 * Keep it free of Deno-only and Node-only imports.
 */

export const PAYSTACK_API = 'https://api.paystack.co'

/** Our own payment references: "azp-" and 32 hex characters. Anything else is not ours. */
const REFERENCE = /^azp-[0-9a-f]{32}$/
export const isReference = (value: unknown): value is string => typeof value === 'string' && REFERENCE.test(value)

type Fetch = typeof fetch

export async function hmacSha512Hex(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, [
    'sign',
  ])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Compares two strings without stopping at the first difference, so timing tells an attacker nothing. */
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * True only when the x-paystack-signature header matches an HMAC-SHA512 of the exact bytes Paystack
 * sent, made with our secret key. Check this before parsing the body.
 */
export async function verifySignature(rawBody: string, header: string | null, secret: string): Promise<boolean> {
  if (!header || !secret) return false
  return sameText(await hmacSha512Hex(secret, rawBody), header.trim().toLowerCase())
}

export interface InitializeInput {
  email: string
  /** Minor units (pesewas for GHS), as a whole number. */
  amountMinor: number
  currency: string
  reference: string
  callbackUrl: string
  metadata: Record<string, string>
}

export class PaystackError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'PaystackError'
  }
}

async function call(secret: string, path: string, init: RequestInit, fetchImpl: Fetch): Promise<Record<string, unknown>> {
  const response = await fetchImpl(`${PAYSTACK_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
  })
  const json = (await response.json().catch(() => null)) as { status?: boolean; message?: string; data?: unknown } | null
  if (!response.ok || !json?.status || typeof json.data !== 'object' || json.data === null) {
    throw new PaystackError(json?.message ?? 'Paystack did not answer as expected', response.status)
  }
  return json.data as Record<string, unknown>
}

/** Opens a transaction and returns the address of Paystack's hosted checkout page. */
export async function initializeTransaction(secret: string, input: InitializeInput, fetchImpl: Fetch = fetch): Promise<string> {
  const data = await call(
    secret,
    '/transaction/initialize',
    {
      method: 'POST',
      body: JSON.stringify({
        email: input.email,
        amount: input.amountMinor,
        currency: input.currency,
        reference: input.reference,
        callback_url: input.callbackUrl,
        channels: ['mobile_money', 'card'],
        metadata: input.metadata,
      }),
    },
    fetchImpl,
  )
  const url = data.authorization_url
  // Only Paystack's own checkout may receive the browser.
  if (typeof url !== 'string' || !/^https:\/\/([a-z0-9-]+\.)*paystack\.com\//.test(url)) {
    throw new PaystackError('Paystack returned no checkout address', 502)
  }
  return url
}

export interface VerifiedTransaction {
  /** Paystack's word: "success", "failed", "abandoned", "pending" and others. */
  status: string
  amountMinor: number
  currency: string
  channel: string | null
  paidAt: string | null
}

/** Asks Paystack what really happened to a reference. Never trust a webhook or a return address alone. */
export async function verifyTransaction(secret: string, reference: string, fetchImpl: Fetch = fetch): Promise<VerifiedTransaction> {
  const data = await call(secret, `/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET' }, fetchImpl)
  return {
    status: String(data.status ?? ''),
    amountMinor: Number(data.amount),
    currency: String(data.currency ?? ''),
    channel: typeof data.channel === 'string' ? data.channel : null,
    paidAt: typeof data.paid_at === 'string' ? data.paid_at : null,
  }
}
