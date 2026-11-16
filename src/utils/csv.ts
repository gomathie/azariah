/** Spreadsheet-safe CSV. A cell that starts with a formula character is prefixed so it is text. */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0] ?? {})
  const lines = [headers.map(escapeCell).join(',')]
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCell(row[header])).join(','))
  }
  return lines.join('\n')
}

function escapeCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value)
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
  if (/[",\n\r]/.test(safe)) return `"${safe.replaceAll('"', '""')}"`
  return safe
}
