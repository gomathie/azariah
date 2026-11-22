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

/** Plain "en" formats dates the American way. The pilot market writes day before month. */
export function dateLocale(locale: string): string {
  return locale === 'en' ? 'en-GB' : locale
}

/**
 * A date a trader reads at a glance: "Today", "Yesterday", or "Wed 18 Nov".
 * Takes a YYYY-MM-DD business date; the labels come from the caller so they are translated.
 */
export function friendlyDate(iso: string, locale: string, labels: { today: string; yesterday: string }): string {
  const now = new Date()
  if (iso === localDate(now)) return labels.today
  const before = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (iso === localDate(before)) return labels.yesterday
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(y, m - 1, d)
  const sameYear = y === now.getFullYear()
  try {
    return new Intl.DateTimeFormat(dateLocale(locale), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      ...(sameYear ? {} : { year: 'numeric' }),
    }).format(date)
  } catch {
    return iso
  }
}
