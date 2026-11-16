/** Calendar dates in the browser's local zone, as YYYY-MM-DD. */
export function localDate(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function startOfMonth(date = new Date()): string {
  return localDate(new Date(date.getFullYear(), date.getMonth(), 1))
}

/** Monday as the first day of the week. */
export function startOfWeek(date = new Date()): string {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = copy.getDay()
  const offset = day === 0 ? 6 : day - 1
  copy.setDate(copy.getDate() - offset)
  return localDate(copy)
}
