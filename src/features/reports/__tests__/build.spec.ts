import { describe, expect, it } from 'vitest'
import { buildReport, reportToSheet, type ReportContext } from '../build'

const ctx: ReportContext = {
  t: (key) => key,
  money: (minor) => `GHS ${(minor / 100).toFixed(2)}`,
  major: (minor) => minor / 100,
  day: (iso) => iso,
  contactName: (id) => ({ k: 'Kofi', a: 'Abena' })[id] ?? 'Customer',
}

describe('buildReport', () => {
  it('lists sales by day and takes the total from the database', () => {
    const table = buildReport(
      'sales',
      { total_minor: 17000, lines: [{ date: '2026-01-05', count: 2, total_minor: 12000 }, { date: '2026-01-07', count: 1, total_minor: 5000 }] },
      ctx,
    )
    expect(table.columns.map((c) => c.key)).toEqual(['date', 'count', 'amount'])
    expect(table.rows).toHaveLength(2)
    expect(table.rows[0]?.amount).toEqual({ text: 'GHS 120.00', num: 120 })
    expect(table.footer?.amount).toEqual({ text: 'GHS 170.00', num: 170 })
  })

  it('still shows the total when an older database sends no lines', () => {
    const table = buildReport('expenses', { total_minor: 2500 }, ctx)
    expect(table.rows).toEqual([])
    expect(table.footer?.amount?.text).toBe('GHS 25.00')
  })

  it('labels an expense without a category', () => {
    const table = buildReport('expenses', { total_minor: 700, lines: [{ name: null, total_minor: 700 }] }, ctx)
    expect(table.rows[0]?.category?.text).toBe('reports.noCategory')
  })

  it('splits an account statement into money in and money out with opening and closing', () => {
    const table = buildReport(
      'account_statement',
      { opening_minor: 1000, closing_minor: 3500, lines: [{ date: '2026-01-05', amount_minor: 5000 }, { date: '2026-01-06', amount_minor: -2500 }] },
      ctx,
    )
    expect(table.rows[0]?.date?.text).toBe('reports.opening')
    expect(table.rows[1]?.moneyIn?.num).toBe(50)
    expect(table.rows[1]?.moneyOut?.text).toBe('')
    expect(table.rows[2]?.moneyOut?.num).toBe(25)
    expect(table.footer?.moneyIn?.num).toBe(35)
  })

  it('marks a transfer as not counted in cash movement', () => {
    const table = buildReport(
      'cash_movement',
      { net_minor: 6000, lines: [{ date: '2026-01-05', kind: 'sale', amount_minor: 6000, counted: true }, { date: '2026-01-05', kind: 'transfer', amount_minor: -2000, counted: false }] },
      ctx,
    )
    expect(table.rows[0]?.note?.text).toBe('')
    expect(table.rows[1]?.note?.text).toBe('reports.notCounted')
    expect(table.rows[1]?.entry?.text).toBe('daybook.kinds.transfer')
    expect(table.footer?.moneyIn?.num).toBe(60)
  })

  it('shows customer names, not ids, for debts', () => {
    const table = buildReport(
      'customer_debts',
      [{ contact_id: 'k', outstanding_minor: 4000 }, { contact_id: 'a', outstanding_minor: 15000 }],
      ctx,
    )
    expect(table.rows.map((r) => r.customer?.text)).toEqual(['Abena', 'Kofi'])
    expect(table.footer?.owes?.num).toBe(190)
  })

  it('gives an empty table for an empty or malformed payload instead of failing', () => {
    expect(buildReport('sales', null, ctx).rows).toEqual([])
    expect(buildReport('customer_debts', { unexpected: true }, ctx).rows).toEqual([])
    expect(buildReport('cash_movement', 'oops', ctx).footer?.moneyIn?.num).toBe(0)
  })
})

describe('reportToSheet', () => {
  it('puts numbers in amount columns so a spreadsheet can add them', () => {
    const table = buildReport('sales', { total_minor: 12000, lines: [{ date: '2026-01-05', count: 2, total_minor: 12000 }] }, ctx)
    expect(reportToSheet(table)).toEqual([
      ['reports.col.date', 'reports.col.count', 'reports.col.amount'],
      ['2026-01-05', { int: 2 }, 120],
      ['reports.total', '', 120],
    ])
  })
})
