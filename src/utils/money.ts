import { minorUnitFor } from './locales'

/**
 * Parse user-typed money into minor units (ADR-001).
 * Accepts "1250", "1,250.50", "1 250,50", "GH₵ 12", "12.5". Returns null for anything that
 * cannot be represented exactly in `minorUnit` decimals, for negatives, and for empty input.
 */
export function parseMoney(text: string, minorUnit: number): bigint | null {
  if (typeof text !== 'string') return null
  const trimmed = text.trim()
  if (trimmed === '' || trimmed.includes('-')) return null

  // Keep digits and the two possible separators; drop currency symbols, letters and spaces.
  const cleaned = trimmed.replace(/[^\d.,]/g, '')
  if (cleaned === '' || !/\d/.test(cleaned)) return null

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  let integerPart: string
  let fractionPart = ''

  if (lastComma === -1 && lastDot === -1) {
    integerPart = cleaned
  } else {
    const sepIndex = Math.max(lastComma, lastDot)
    const sepChar = cleaned[sepIndex]!
    const occurrences = cleaned.split(sepChar).length - 1
    const after = cleaned.slice(sepIndex + 1)
    const otherSepPresent = sepChar === ',' ? lastDot !== -1 : lastComma !== -1
    // A dot is only ever a decimal point, so "1.2.3" is not a number. Commas may group thousands.
    if (sepChar === '.' && occurrences > 1) return null
    // A dot is always a decimal point. A lone comma followed by exactly three digits is a
    // thousands separator ("1,250"); any other comma is a decimal comma ("1,25").
    const isThousands = sepChar === ',' && !otherSepPresent && occurrences === 1 && after.length === 3
    if (isThousands || occurrences > 1) {
      if (otherSepPresent || /[.,]/.test(after)) return null
      integerPart = cleaned.replace(/[.,]/g, '')
    } else {
      integerPart = cleaned.slice(0, sepIndex).replace(/[.,]/g, '')
      fractionPart = after
    }
  }

  if (!/^\d*$/.test(integerPart) || !/^\d*$/.test(fractionPart)) return null
  if (fractionPart.length > minorUnit) return null
  const padded = fractionPart.padEnd(minorUnit, '0')
  const digits = `${integerPart || '0'}${padded}`
  const value = BigInt(digits)
  return value
}

/** Browsers have no number formats for Twi, so amounts in Twi use Ghana's English format. */
function numberLocale(locale: string): string {
  return locale === 'tw' ? 'en-GH' : locale
}

/** Format minor units as a currency string for display only; never used for arithmetic. */
export function formatMoney(minor: bigint | number, currency: string, locale = 'en-GH'): string {
  const minorUnit = minorUnitFor(currency)
  const major = Number(minor) / 10 ** minorUnit
  try {
    return new Intl.NumberFormat(numberLocale(locale), {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: minorUnit,
      maximumFractionDigits: minorUnit,
    }).format(major)
  } catch {
    return `${currency} ${major.toFixed(minorUnit)}`
  }
}

/**
 * JSON has no bigint. PostgREST accepts a safe integer for a bigint argument.
 * Amounts above 2^53−1 cannot be sent exactly, so the caller must stop.
 */
export function minorForRpc(value: bigint): number {
  const limit = BigInt(Number.MAX_SAFE_INTEGER)
  if (value > limit || value < -limit) {
    throw new RangeError('Amount is too large to send exactly')
  }
  return Number(value)
}

/** Plain number string without symbol, e.g. for inputs: 125050n -> "1250.50". */
export function toMajorString(minor: bigint | number, minorUnit: number): string {
  const s = BigInt(minor).toString().padStart(minorUnit + 1, '0')
  if (minorUnit === 0) return s
  return `${s.slice(0, -minorUnit)}.${s.slice(-minorUnit)}`
}

/** Money with its direction spelled out, so in and out never rely on colour alone: "+GH₵60.00", "−GH₵25.00". */
export function formatSignedMoney(minor: bigint | number, currency: string, locale = 'en-GH'): string {
  const value = BigInt(minor)
  if (value === 0n) return formatMoney(0n, currency, locale)
  return `${value > 0n ? '+' : '−'}${formatMoney(value < 0n ? -value : value, currency, locale)}`
}
