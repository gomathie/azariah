import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import type { ShopDocument } from '@/features/documents/api'
import { buildDocumentPdf, pdfSafe, type DocumentPdfLabels } from '@/features/documents/pdf'

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
  total: 'GH₵150.00',
  received: 'GH₵100.00',
  outstanding: 'GH₵50.00',
}

describe('document pdf', () => {
  it('drops marks the PDF font cannot draw', () => {
    expect(pdfSafe('GH₵150.00')).toBe('GH150.00')
    expect(pdfSafe('Déjà reçu')).toBe('Déjà reçu')
  })

  it('builds a one-page PDF that names the invoice', async () => {
    const bytes = await buildDocumentPdf(invoice, labels)
    expect(new TextDecoder('latin1').decode(bytes).startsWith('%PDF')).toBe(true)
    expect(new TextDecoder('latin1').decode(bytes)).toContain('INV-0001')
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
    const text = new TextDecoder('latin1').decode(bytes)
    expect(text).toContain('RCT-0004')
    expect(text).toContain('Cancelled')
  })
})
