import { inflateSync } from 'node:zlib'
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import type { ShopDocument } from '@/features/documents/api'
import { buildDocumentPdf, pdfMoney, pdfSafe, type DocumentPdfLabels } from '@/features/documents/pdf'

function pdfText(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes)
  const parts = [raw.toString('latin1')]
  const startMark = Buffer.from('stream\n')
  const endMark = Buffer.from('\nendstream')
  let from = 0
  while (from < raw.length) {
    const start = raw.indexOf(startMark, from)
    if (start < 0) break
    const dataStart = start + startMark.length
    const end = raw.indexOf(endMark, dataStart)
    if (end < 0) break
    try {
      parts.push(inflateSync(raw.subarray(dataStart, end)).toString('latin1'))
    } catch {
      // A stream that is not compressed stays in the raw file.
    }
    from = end + endMark.length
  }
  return parts
    .join('\n')
    .replace(/<([0-9A-Fa-f\s]+)>/g, (_match, hex: string) => {
      const clean = hex.replace(/\s+/g, '')
      if (clean.length < 2 || clean.length % 2 !== 0) return _match
      let out = ''
      for (let i = 0; i < clean.length; i += 2) {
        const code = Number.parseInt(clean.slice(i, i + 2), 16)
        out += code >= 32 && code < 127 ? String.fromCharCode(code) : ''
      }
      return out
    })
}

const invoice: ShopDocument = {
  document_id: '11111111-1111-1111-1111-111111111111',
  kind: 'invoice',
  status: 'issued',
  display_number: 'INV-0001',
  transaction_id: '22222222-2222-2222-2222-222222222222',
  business_name: "Ama's Provision Shop",
  contact_name: 'Kofi',
  description: 'Rice and oil',
  total_minor: 15000,
  received_minor: 10000,
  outstanding_minor: 5000,
  currency_code: 'GHS',
  business_date: '2026-11-17',
}

const labels: DocumentPdfLabels = {
  title: 'Invoice',
  customer: 'Customer',
  saleAmount: 'Sale amount',
  moneyReceived: 'Money received',
  customerOwes: 'Customer owes',
  cancelled: 'Cancelled',
  total: 'GHS 150.00',
  received: 'GHS 100.00',
  outstanding: 'GHS 50.00',
}

describe('document pdf', () => {
  it('writes the currency code so the cedi sign is not required', () => {
    expect(pdfSafe('Déjà reçu')).toBe('Déjà reçu')
    expect(pdfMoney(15000, 'GHS', 2)).toBe('GHS 150.00')
  })

  it('builds a one-page PDF that names the invoice', async () => {
    const bytes = await buildDocumentPdf(invoice, labels)
    expect(new TextDecoder('latin1').decode(bytes).startsWith('%PDF')).toBe(true)
    expect(pdfText(bytes)).toContain('INV-0001')
    expect(pdfText(bytes)).toContain('GHS 150.00')
    expect(pdfText(bytes)).toContain('Rice and oil')
    const loaded = await PDFDocument.load(bytes)
    expect(loaded.getPageCount()).toBe(1)
  })

  it('builds a cancelled receipt without a customer line', async () => {
    const bytes = await buildDocumentPdf(
      {
        ...invoice,
        kind: 'receipt',
        status: 'void',
        display_number: 'RCT-0004',
        contact_name: null,
        description: null,
        outstanding_minor: 0,
      },
      { ...labels, title: 'Receipt', outstanding: null, received: null, total: 'GHS 40.00' },
    )
    const text = pdfText(bytes)
    expect(text).toContain('RCT-0004')
    expect(text).toContain('Cancelled')
  })
})
