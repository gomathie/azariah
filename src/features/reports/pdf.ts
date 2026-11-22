import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { pdfSafe } from '@/features/documents/pdf'
import type { ReportCell, ReportTableData } from '@/features/reports/build'

export interface ReportPdfInput {
  businessName: string
  title: string
  /** e.g. "1 Nov 2026 to 22 Nov 2026" */
  period: string
  /** e.g. "Amounts in GHS". The PDF font cannot draw every currency symbol, so amounts are plain numbers. */
  amountsNote: string
  decimals: number
  table: ReportTableData
  emptyText: string
}

const PAGE: [number, number] = [595.28, 841.89]
const LEFT = 48
const RIGHT = 547
const ROW = 20

function fit(value: string, font: PDFFont, size: number, width: number): string {
  let out = pdfSafe(value)
  if (font.widthOfTextAtSize(out, size) <= width) return out
  while (out.length > 1 && font.widthOfTextAtSize(`${out}...`, size) > width) out = out.slice(0, -1)
  return `${out}...`
}

export async function buildReportPdf(input: ReportPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const teal = rgb(15 / 255, 118 / 255, 110 / 255)
  const ink = rgb(15 / 255, 23 / 255, 42 / 255)
  const muted = rgb(71 / 255, 85 / 255, 105 / 255)
  const rule = rgb(203 / 255, 213 / 255, 225 / 255)

  const { columns, rows, footer } = input.table
  // The first column is a name or date and gets twice the room of an amount column.
  const units = columns.length + 1
  const unit = (RIGHT - LEFT) / units
  const widths = columns.map((_, i) => (i === 0 ? unit * 2 : unit))
  const starts = widths.map((_, i) => LEFT + widths.slice(0, i).reduce((a, b) => a + b, 0))
  const number = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: input.decimals,
    maximumFractionDigits: input.decimals,
  })
  const show = (cell: ReportCell | undefined, numeric: boolean | undefined) =>
    !cell ? '' : numeric && cell.num !== undefined ? (cell.whole ? String(cell.num) : number.format(cell.num)) : cell.text

  let page: PDFPage = pdf.addPage(PAGE)
  let y = PAGE[1] - 56

  const drawRow = (cells: string[], font: PDFFont, color = ink) => {
    cells.forEach((value, i) => {
      const width = (widths[i] ?? unit) - 8
      const shown = fit(value, font, 10, width)
      const x = columns[i]?.numeric
        ? (starts[i] ?? LEFT) + width - font.widthOfTextAtSize(shown, 10)
        : (starts[i] ?? LEFT)
      page.drawText(shown, { x, y, size: 10, font, color })
    })
    y -= ROW
  }
  const drawHeader = () => {
    drawRow(columns.map((c) => c.label), bold, muted)
    page.drawLine({ start: { x: LEFT, y: y + 14 }, end: { x: RIGHT, y: y + 14 }, thickness: 0.75, color: rule })
  }

  page.drawText(fit(input.businessName || 'Azaria', bold, 16, RIGHT - LEFT), { x: LEFT, y, size: 16, font: bold, color: teal })
  y -= 22
  page.drawText(fit(input.title, bold, 13, RIGHT - LEFT), { x: LEFT, y, size: 13, font: bold, color: ink })
  y -= 18
  page.drawText(fit(`${input.period}  |  ${input.amountsNote}`, regular, 10, RIGHT - LEFT), {
    x: LEFT,
    y,
    size: 10,
    font: regular,
    color: muted,
  })
  y -= 14
  page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT, y }, thickness: 1, color: teal })
  y -= 26

  drawHeader()
  if (rows.length === 0) {
    page.drawText(pdfSafe(input.emptyText), { x: LEFT, y, size: 10, font: regular, color: muted })
    y -= ROW
  }
  for (const row of rows) {
    if (y < 72) {
      page = pdf.addPage(PAGE)
      y = PAGE[1] - 56
      drawHeader()
    }
    drawRow(columns.map((c) => show(row[c.key], c.numeric)), regular)
  }
  if (footer) {
    if (y < 72) {
      page = pdf.addPage(PAGE)
      y = PAGE[1] - 56
    }
    page.drawLine({ start: { x: LEFT, y: y + 14 }, end: { x: RIGHT, y: y + 14 }, thickness: 0.75, color: ink })
    drawRow(columns.map((c) => show(footer[c.key], c.numeric)), bold)
  }

  const pages = pdf.getPages()
  pages.forEach((p, i) => {
    p.drawText(`Azaria  |  ${i + 1} / ${pages.length}`, { x: LEFT, y: 32, size: 8, font: regular, color: muted })
  })
  return pdf.save()
}
