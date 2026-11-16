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
    // A lone separator followed by exactly three digits is a thousands separator ("1,250").
    const isThousands = !otherSepPresent && occurrences === 1 && after.length === 3
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

/** Format minor units as a currency string for display only; never used for arithmetic. */
export function formatMoney(minor: bigint | number, currency: string, locale = 'en-GH'): string {
  const minorUnit = minorUnitFor(currency)
  const major = Number(minor) / 10 ** minorUnit
  try {
    return new Intl.NumberFormat(locale, {
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

/** Plain number string without symbol, e.g. for inputs: 125050n -> "1250.50". */
export function toMajorString(minor: bigint | number, minorUnit: number): string {
  const s = BigInt(minor).toString().padStart(minorUnit + 1, '0')
  if (minorUnit === 0) return s
  return `${s.slice(0, -minorUnit)}.${s.slice(-minorUnit)}`
}
