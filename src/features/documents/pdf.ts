import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { ShopDocument } from '@/features/documents/api'

export interface DocumentPdfLabels {
  title: string
  customer: string
  saleAmount: string
  moneyReceived: string
  customerOwes: string
  cancelled: string
  total: string
  received: string | null
  outstanding: string | null
}

/** WinAnsi, the font the PDF uses, has Latin letters and not every currency mark. */
export function pdfSafe(text: string): string {
  return [...text.normalize('NFKC').replace(/[\u202F\u00A0\u2007\u2009]/g, ' ').replace(/\u20B5/g, '')]
    .map((char) => (char.charCodeAt(0) <= 255 ? char : ''))
    .join('')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function wrap(text: string, width: number): string[] {
  const words = pdfSafe(text).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (next.length > width && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines.length > 0 ? lines : ['']
}

export async function buildDocumentPdf(
  paper: ShopDocument,
  labels: DocumentPdfLabels,
  logoPng?: Uint8Array,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595.28, 841.89])
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const teal = rgb(15 / 255, 118 / 255, 110 / 255)
  const ink = rgb(15 / 255, 23 / 255, 42 / 255)
  const muted = rgb(71 / 255, 85 / 255, 105 / 255)
  const { height } = page.getSize()
  let y = height - 56

  if (logoPng && logoPng.byteLength > 0) {
    const logo = await pdf.embedPng(logoPng)
    page.drawImage(logo, { x: 48, y: y - 40, width: 48, height: 48 })
  }

  const textX = logoPng && logoPng.byteLength > 0 ? 108 : 48
  page.drawText(pdfSafe(paper.business_name) || 'Azaria', {
    x: textX,
    y: y - 4,
    size: 16,
    font: bold,
    color: teal,
  })
  page.drawText(pdfSafe(`${labels.title}  ${paper.display_number}`), {
    x: textX,
    y: y - 26,
    size: 12,
    font: regular,
    color: ink,
  })
  y -= 72

  page.drawLine({
    start: { x: 48, y },
    end: { x: 547, y },
    thickness: 1,
    color: teal,
  })
  y -= 28

  page.drawText(pdfSafe(paper.business_date), { x: 48, y, size: 12, font: regular, color: ink })
  y -= 22

  if (paper.contact_name) {
    page.drawText(pdfSafe(labels.customer), { x: 48, y, size: 10, font: regular, color: muted })
    y -= 16
    page.drawText(pdfSafe(paper.contact_name), { x: 48, y, size: 12, font: bold, color: ink })
    y -= 22
  }

  if (paper.description) {
    for (const line of wrap(paper.description, 70)) {
      page.drawText(line, { x: 48, y, size: 12, font: regular, color: ink })
      y -= 18
    }
    y -= 8
  }

  if (paper.status === 'void') {
    page.drawText(pdfSafe(labels.cancelled), { x: 48, y, size: 14, font: bold, color: rgb(0.7, 0.15, 0.15) })
    y -= 28
  }

  const headline = paper.kind === 'invoice' ? labels.saleAmount : labels.moneyReceived
  page.drawText(pdfSafe(headline), { x: 48, y, size: 11, font: regular, color: muted })
  y -= 22
  page.drawText(pdfSafe(labels.total), { x: 48, y, size: 20, font: bold, color: ink })
  y -= 28

  if (paper.kind === 'invoice' && labels.received) {
    page.drawText(pdfSafe(`${labels.moneyReceived}: ${labels.received}`), {
      x: 48,
      y,
      size: 12,
      font: regular,
      color: ink,
    })
    y -= 20
  }

  if (labels.outstanding && paper.outstanding_minor > 0) {
    page.drawText(pdfSafe(`${labels.customerOwes}: ${labels.outstanding}`), {
      x: 48,
      y,
      size: 12,
      font: bold,
      color: ink,
    })
  }

  return pdf.save()
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.slice()], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
