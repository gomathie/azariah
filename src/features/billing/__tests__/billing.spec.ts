import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { discountedMinor, isPaymentReference, type BillingStatus } from '@/features/billing/api'
import { useBillingStore } from '@/stores/billing'

const status = (over: Partial<BillingStatus>): BillingStatus => ({
  payments_on: true,
  plus_until: null,
  has_plus: false,
  in_grace: false,
  trial_available: true,
  can_pay: true,
  products: [],
  payments: [],
  ...over,
})

describe('discounted price', () => {
  it('takes the percentage off in whole minor units', () => {
    expect(discountedMinor(3000, 0)).toBe(3000n)
    expect(discountedMinor(3000, 50)).toBe(1500n)
    expect(discountedMinor(3000, 100)).toBe(0n)
  })

  it('rounds down, as the database does', () => {
    expect(discountedMinor(999, 33)).toBe(669n)
    expect(discountedMinor(1, 1)).toBe(0n)
  })
})

describe('payment reference from the address bar', () => {
  it('accepts only our own format', () => {
    expect(isPaymentReference('azp-' + 'c'.repeat(32))).toBe(true)
    expect(isPaymentReference('azp-' + 'C'.repeat(32))).toBe(false)
    expect(isPaymentReference(['azp-' + 'c'.repeat(32)])).toBe(false)
    expect(isPaymentReference('../../etc')).toBe(false)
  })
})

describe('billing store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('has no Plus before the database has answered', () => {
    const billing = useBillingStore()
    expect(billing.hasPlus).toBe(false)
    expect(billing.daysLeft()).toBeNull()
  })

  it('counts whole days left and never goes below zero', () => {
    const billing = useBillingStore()
    const now = new Date('2026-11-23T12:00:00Z')
    billing.status = status({ plus_until: '2026-11-26T11:00:00Z', has_plus: true })
    expect(billing.daysLeft(now)).toBe(3)
    billing.status = status({ plus_until: '2026-11-20T00:00:00Z', has_plus: true, in_grace: true })
    expect(billing.daysLeft(now)).toBe(0)
    expect(billing.inGrace).toBe(true)
  })

  it('forgets the shop on reset', () => {
    const billing = useBillingStore()
    billing.status = status({ has_plus: true })
    billing.reset()
    expect(billing.hasPlus).toBe(false)
  })
})
