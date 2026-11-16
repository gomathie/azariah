import { describe, expect, it } from 'vitest'
import { formatMoney, parseMoney, toMajorString } from '../money'

describe('parseMoney', () => {
  it('parses plain and decimal amounts', () => {
    expect(parseMoney('1250', 2)).toBe(125000n)
    expect(parseMoney('12.5', 2)).toBe(1250n)
    expect(parseMoney('0.05', 2)).toBe(5n)
    expect(parseMoney('100', 0)).toBe(100n)
  })

  it('handles locale separators', () => {
    expect(parseMoney('1,250.50', 2)).toBe(125050n)
    expect(parseMoney('1 250,50', 2)).toBe(125050n)
    expect(parseMoney('1.250,50', 2)).toBe(125050n)
    expect(parseMoney('1,250', 2)).toBe(125000n)
    expect(parseMoney('1.250', 2)).toBeNull() // a dot is always a decimal point
    expect(parseMoney('1,250,000', 2)).toBe(125000000n)
    expect(parseMoney('1,25', 2)).toBe(125n)
  })

  it('strips currency symbols and letters', () => {
    expect(parseMoney('GH₵ 12', 2)).toBe(1200n)
    expect(parseMoney('GHS 1,000.00', 2)).toBe(100000n)
  })

  it('rejects more decimals than the currency allows, negatives and empty input', () => {
    expect(parseMoney('12.345', 2)).toBeNull()
    expect(parseMoney('1.5', 0)).toBeNull()
    expect(parseMoney('-5', 2)).toBeNull()
    expect(parseMoney('', 2)).toBeNull()
    expect(parseMoney('abc', 2)).toBeNull()
    expect(parseMoney('1.2.3', 2)).toBeNull()
  })
})

describe('formatMoney', () => {
  it('formats GHS with two decimals', () => {
    expect(formatMoney(125050n, 'GHS', 'en-GH')).toContain('1,250.50')
  })
  it('formats zero-decimal currencies without decimals', () => {
    expect(formatMoney(1500n, 'XOF', 'fr-CI')).not.toContain(',00')
    expect(formatMoney(1500n, 'XOF', 'fr-CI')).toMatch(/1[\s  ]?500/)
  })
})

describe('toMajorString', () => {
  it('converts minor units to a plain decimal string', () => {
    expect(toMajorString(125050n, 2)).toBe('1250.50')
    expect(toMajorString(5n, 2)).toBe('0.05')
    expect(toMajorString(1500n, 0)).toBe('1500')
  })
})
