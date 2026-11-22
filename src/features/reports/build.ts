import type { ReportName } from '@/features/reports/api'

/** `text` is what people read. `num` is the same amount as a plain number, for Excel and PDF columns. */
export interface ReportCell {
  text: string
  num?: number
  /** A count, shown without decimals. */
  whole?: boolean
}

export interface ReportColumn {
  key: string
  label: string
  numeric?: boolean
}

export interface ReportTableData {
  columns: ReportColumn[]
  rows: Record<string, ReportCell>[]
  /** Totals line, or null when the report has none. */
  footer: Record<string, ReportCell> | null
}

export interface ReportContext {
  t: (key: string) => string
  /** Minor units to a display string with the currency symbol. */
  money: (minor: number) => string
  /** Minor units to major units, for spreadsheet cells only. Never used for arithmetic. */
  major: (minor: number) => number
  day: (iso: string) => string
  contactName: (id: string) => string
}

type Json = Record<string, unknown>

const num = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}
const list = (value: unknown): Json[] => (Array.isArray(value) ? (value as Json[]) : [])
const text = (value: string): ReportCell => ({ text: value })

/**
 * Turn a report payload from the database into a table. Totals come from the database
 * (`total_minor`, `net_minor`, `closing_minor`); this function only arranges them.
 */
export function buildReport(name: ReportName, payload: unknown, ctx: ReportContext): ReportTableData {
  const data = (payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}) as Json
  const amount = (minor: number): ReportCell => ({ text: ctx.money(minor), num: ctx.major(minor) })
  const col = (key: string, numeric = false): ReportColumn => ({ key, label: ctx.t(`reports.col.${key}`), numeric })

  if (name === 'sales') {
    return {
      columns: [col('date'), col('count', true), col('amount', true)],
      rows: list(data.lines).map((line) => ({
        date: text(ctx.day(String(line.date ?? ''))),
        count: { text: String(num(line.count)), num: num(line.count), whole: true },
        amount: amount(num(line.total_minor)),
      })),
      footer: { date: text(ctx.t('reports.total')), count: text(''), amount: amount(num(data.total_minor)) },
    }
  }

  if (name === 'money_received' || name === 'expenses' || name === 'stock') {
    const first = name === 'money_received' ? 'account' : 'category'
    return {
      columns: [col(first), col('amount', true)],
      rows: list(data.lines).map((line) => ({
        [first]: text(line.name ? String(line.name) : ctx.t('reports.noCategory')),
        amount: amount(num(line.total_minor)),
      })),
      footer: { [first]: text(ctx.t('reports.total')), amount: amount(num(data.total_minor)) },
    }
  }

  if (name === 'account_statement') {
    const split = (minor: number) => ({
      moneyIn: minor > 0 ? amount(minor) : text(''),
      moneyOut: minor < 0 ? amount(-minor) : text(''),
    })
    return {
      columns: [col('date'), col('moneyIn', true), col('moneyOut', true)],
      rows: [
        { date: text(ctx.t('reports.opening')), ...split(0), moneyIn: amount(num(data.opening_minor)) },
        ...list(data.lines).map((line) => ({
          date: text(ctx.day(String(line.date ?? ''))),
          ...split(num(line.amount_minor)),
        })),
      ],
      footer: { date: text(ctx.t('reports.closing')), moneyIn: amount(num(data.closing_minor)), moneyOut: text('') },
    }
  }

  if (name === 'cash_movement') {
    return {
      columns: [col('date'), col('entry'), col('moneyIn', true), col('moneyOut', true), col('note')],
      rows: list(data.lines).map((line) => {
        const minor = num(line.amount_minor)
        return {
          date: text(ctx.day(String(line.date ?? ''))),
          entry: text(ctx.t(`daybook.kinds.${String(line.kind ?? 'sale')}`)),
          moneyIn: minor > 0 ? amount(minor) : text(''),
          moneyOut: minor < 0 ? amount(-minor) : text(''),
          note: text(line.counted === false ? ctx.t('reports.notCounted') : ''),
        }
      }),
      footer: {
        date: text(ctx.t('reports.net')),
        entry: text(''),
        moneyIn: amount(num(data.net_minor)),
        moneyOut: text(''),
        note: text(''),
      },
    }
  }

  // customer_debts: the payload is a list, one line per customer who owes.
  const debts = list(payload)
  const total = debts.reduce((sum, line) => sum + num(line.outstanding_minor), 0)
  return {
    columns: [col('customer'), col('owes', true)],
    rows: debts
      .map((line) => ({
        customer: text(ctx.contactName(String(line.contact_id ?? ''))),
        owes: amount(num(line.outstanding_minor)),
      }))
      .sort((a, b) => a.customer.text.localeCompare(b.customer.text)),
    // Adding the listed lines is presentation of what the database already returned, not a new figure.
    footer: { customer: text(ctx.t('reports.total')), owes: amount(total) },
  }
}

/** Rows for a spreadsheet: header, body, totals. Amount columns are plain numbers so Excel can add them. */
export function reportToSheet(table: ReportTableData): (string | number | { int: number })[][] {
  const line = (row: Record<string, ReportCell>) =>
    table.columns.map((column) => {
      const cell = row[column.key]
      if (!cell) return ''
      if (!column.numeric || cell.num === undefined) return cell.text
      return cell.whole ? { int: cell.num } : cell.num
    })
  return [table.columns.map((c) => c.label), ...table.rows.map(line), ...(table.footer ? [line(table.footer)] : [])]
}
