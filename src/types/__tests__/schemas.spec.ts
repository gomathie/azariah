import { describe, expect, it } from 'vitest'
import { ExpenseInput, SaleInput, TransferInput } from '../schemas'

const ids = {
  clientOperationId: '11111111-1111-4111-8111-111111111111',
  businessId: '22222222-2222-4222-8222-222222222222',
  moneyAccountId: '33333333-3333-4333-8333-333333333333',
  contactId: '44444444-4444-4444-8444-444444444444',
  categoryId: '55555555-5555-4555-8555-555555555555',
  otherAccountId: '66666666-6666-4666-8666-666666666666',
}

describe('SaleInput', () => {
  it('accepts a partly paid sale with a customer', () => {
    const parsed = SaleInput.parse({
      ...ids,
      occurredAt: '2026-01-01T12:00:00.000Z',
      amountMinor: 10000n,
      receivedMinor: 6000n,
      categoryId: null,
      description: 'Oil',
      note: null,
    })
    expect(parsed.amountMinor).toBe(10000n)
  })

  it('rejects credit without a customer and money received above the sale', () => {
    expect(
      SaleInput.safeParse({
        ...ids,
        contactId: null,
        occurredAt: '2026-01-01T12:00:00.000Z',
        amountMinor: 10000n,
        receivedMinor: 4000n,
        categoryId: null,
        description: null,
        note: null,
      }).success,
    ).toBe(false)
    expect(
      SaleInput.safeParse({
        ...ids,
        contactId: null,
        occurredAt: '2026-01-01T12:00:00.000Z',
        amountMinor: 10000n,
        receivedMinor: 12000n,
        categoryId: null,
        description: null,
        note: null,
      }).success,
    ).toBe(false)
  })
})

describe('ExpenseInput', () => {
  it('rejects a zero amount', () => {
    expect(
      ExpenseInput.safeParse({
        ...ids,
        occurredAt: '2026-01-01T12:00:00.000Z',
        amountMinor: 0n,
        description: 'Rent',
        note: null,
      }).success,
    ).toBe(false)
  })
})

describe('TransferInput', () => {
  it('rejects a transfer to the same account', () => {
    expect(
      TransferInput.safeParse({
        clientOperationId: ids.clientOperationId,
        businessId: ids.businessId,
        occurredAt: '2026-01-01T12:00:00.000Z',
        fromAccountId: ids.moneyAccountId,
        toAccountId: ids.moneyAccountId,
        amountMinor: 5000n,
        note: null,
      }).success,
    ).toBe(false)
  })
})
