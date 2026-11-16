import { describe, expect, it } from 'vitest'
import { movementTotals, saleStillOwes } from '../ledger'

describe('daybook ledger', () => {
  it('puts cash received in and cash paid out', () => {
    expect(movementTotals('sale', [6000n])).toEqual({ moneyIn: 6000n, moneyOut: 0n })
    expect(movementTotals('expense', [-2500n])).toEqual({ moneyIn: 0n, moneyOut: 2500n })
  })

  it('leaves a transfer out of both columns', () => {
    expect(movementTotals('transfer', [-5000n, 5000n])).toEqual({ moneyIn: 0n, moneyOut: 0n })
  })

  it('shows what the customer still owes on a partly paid sale', () => {
    expect(saleStillOwes('sale', 10000n, 6000n)).toBe(4000n)
    expect(saleStillOwes('sale', 10000n, 10000n)).toBe(0n)
    expect(saleStillOwes('expense', 2500n, 0n)).toBe(0n)
  })
})
