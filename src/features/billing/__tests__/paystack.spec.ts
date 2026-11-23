// @vitest-environment node
import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  initializeTransaction,
  isReference,
  PaystackError,
  verifySignature,
  verifyTransaction,
} from '../../../../supabase/functions/_shared/paystack'

const SECRET = 'sk_test_not_a_real_key'
const BODY = JSON.stringify({ event: 'charge.success', data: { reference: 'azp-' + 'a'.repeat(32), amount: 3000 } })
const sign = (body: string, secret = SECRET) => createHmac('sha512', secret).update(body).digest('hex')

const answer = (data: unknown, ok = true) =>
  (async () => new Response(JSON.stringify({ status: ok, message: ok ? 'ok' : 'no', data }), { status: ok ? 200 : 400 })) as typeof fetch

describe('Paystack webhook signature', () => {
  it('accepts the signature Paystack would send for this exact body', async () => {
    expect(await verifySignature(BODY, sign(BODY), SECRET)).toBe(true)
  })

  it('refuses a body that was changed after signing', async () => {
    expect(await verifySignature(BODY.replace('3000', '1'), sign(BODY), SECRET)).toBe(false)
  })

  it('refuses a signature made with another key', async () => {
    expect(await verifySignature(BODY, sign(BODY, 'sk_test_other'), SECRET)).toBe(false)
  })

  it('refuses a missing signature and a missing secret', async () => {
    expect(await verifySignature(BODY, null, SECRET)).toBe(false)
    expect(await verifySignature(BODY, '', SECRET)).toBe(false)
    expect(await verifySignature(BODY, sign(BODY), '')).toBe(false)
  })
})

describe('payment references', () => {
  it('accepts only our own format', () => {
    expect(isReference('azp-' + '0123456789abcdef'.repeat(2))).toBe(true)
    expect(isReference('azp-123')).toBe(false)
    expect(isReference('T123456789')).toBe(false)
    expect(isReference("azp-' or 1=1 --")).toBe(false)
    expect(isReference(undefined)).toBe(false)
  })
})

describe('Paystack calls', () => {
  const input = {
    email: 'owner@example.test',
    amountMinor: 3000,
    currency: 'GHS',
    reference: 'azp-' + 'b'.repeat(32),
    callbackUrl: 'https://app.example/settings/plus/return',
    metadata: { business_id: 'x', product_code: 'plus_1m' },
  }

  it('returns the checkout address Paystack gives', async () => {
    const url = await initializeTransaction(SECRET, input, answer({ authorization_url: 'https://checkout.paystack.com/abc' }))
    expect(url).toBe('https://checkout.paystack.com/abc')
  })

  it('refuses a checkout address that is not on paystack.com', async () => {
    await expect(
      initializeTransaction(SECRET, input, answer({ authorization_url: 'https://paystack.com.evil.example/abc' })),
    ).rejects.toBeInstanceOf(PaystackError)
  })

  it('sends the amount in minor units with Mobile Money and card allowed', async () => {
    let sent: Record<string, unknown> = {}
    const spy = (async (_url: unknown, init?: RequestInit) => {
      sent = JSON.parse(String(init?.body))
      return new Response(JSON.stringify({ status: true, data: { authorization_url: 'https://checkout.paystack.com/x' } }))
    }) as typeof fetch
    await initializeTransaction(SECRET, input, spy)
    expect(sent.amount).toBe(3000)
    expect(sent.currency).toBe('GHS')
    expect(sent.channels).toEqual(['mobile_money', 'card'])
  })

  it('reads the status, amount and currency from a verify answer', async () => {
    const result = await verifyTransaction(
      SECRET,
      input.reference,
      answer({ status: 'success', amount: 3000, currency: 'GHS', channel: 'mobile_money', paid_at: '2026-11-23T10:00:00Z' }),
    )
    expect(result).toEqual({
      status: 'success',
      amountMinor: 3000,
      currency: 'GHS',
      channel: 'mobile_money',
      paidAt: '2026-11-23T10:00:00Z',
    })
  })

  it('throws when Paystack says no', async () => {
    await expect(verifyTransaction(SECRET, input.reference, answer(null, false))).rejects.toBeInstanceOf(PaystackError)
  })
})
