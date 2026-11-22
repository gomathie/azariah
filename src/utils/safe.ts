/**
 * Input safety helpers. The rule for the whole app: whatever a person types is data. It is stored
 * as text and shown as text. It is never run as a command, a query, a formula, a link or markup.
 *
 * These helpers are the browser's share of that rule. The database repeats the cleaning in triggers
 * (see supabase/migrations/20261122000300_text_safety.sql), because a request can be forged.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}(:?\d{2})?)?$/

export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value)
export const isIsoDate = (value: unknown): value is string => typeof value === 'string' && ISO_DATE.test(value)
export const isIsoTimestamp = (value: unknown): value is string =>
  typeof value === 'string' && ISO_TIMESTAMP.test(value)

/** Characters that have no place in a name or a note and are used to hide or reorder text. */
function isUnsafeChar(code: number): boolean {
  return (
    (code <= 0x1f && code !== 0x09 && code !== 0x0a && code !== 0x0d) || // control characters
    code === 0x7f ||
    (code >= 0x80 && code <= 0x9f) ||
    (code >= 0x200b && code <= 0x200f) || // zero-width and direction marks
    (code >= 0x202a && code <= 0x202e) || // direction overrides
    (code >= 0x2066 && code <= 0x2069) ||
    code === 0xfeff
  )
}

/**
 * Remove invisible control and direction-override characters. Everything a person can see is kept
 * exactly: quotes, angle brackets, semicolons and equals signs are ordinary text here.
 */
export function stripUnsafeChars(text: string): string {
  let out = ''
  for (const char of text) {
    if (!isUnsafeChar(char.codePointAt(0) ?? 0)) out += char
  }
  return out
}

/** Clean a single-line field: strip unsafe characters, fold whitespace, trim, and cap the length. */
export function cleanLine(text: string, maxLength = 240): string {
  const folded = stripUnsafeChars(text).replace(/\s+/g, ' ').trim()
  return [...folded].slice(0, maxLength).join('')
}

/** A phone number as people write it: digits, spaces, plus, brackets, dots and hyphens, 32 at most. */
export function isPhone(text: string): boolean {
  return text.length <= 32 && /^[0-9+() .-]+$/.test(text) && /\d/.test(text)
}

/**
 * Only a path inside this app may follow a sign-in. "//evil.example", "https://…", "javascript:…"
 * and anything with a backslash or control character fall back to home.
 */
export function safeInternalPath(candidate: unknown, fallback = '/'): string {
  if (typeof candidate !== 'string') return fallback
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return fallback
  if (candidate.includes('\\') || candidate !== stripUnsafeChars(candidate)) return fallback
  if (/^\/[^/?#]*:/.test(candidate)) return fallback
  return candidate
}

/** Deep-clean the string values of an RPC payload. Numbers, booleans, null and ids pass through. */
export function cleanPayload<T>(value: T): T {
  if (typeof value === 'string') return stripUnsafeChars(value) as T
  if (Array.isArray(value)) return value.map((item) => cleanPayload(item)) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cleanPayload(v)])) as T
  }
  return value
}
