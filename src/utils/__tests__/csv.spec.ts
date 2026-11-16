import { describe, expect, it } from 'vitest'
import { toCsv } from '../csv'

describe('toCsv', () => {
  it('prefixes a formula so a spreadsheet treats it as text', () => {
    expect(toCsv([{ note: '=SUM(A1)' }])).toBe("note\n'=SUM(A1)")
  })

  it('quotes a cell that contains a comma', () => {
    expect(toCsv([{ name: 'Ama, Shop' }])).toBe('name\n"Ama, Shop"')
  })
})
