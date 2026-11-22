import { describe, expect, it } from 'vitest'
import { cleanLine, cleanPayload, isIsoDate, isIsoTimestamp, isPhone, isUuid, safeInternalPath, stripUnsafeChars } from '../safe'

describe('stripUnsafeChars', () => {
  it('keeps everything a person can see, including text that looks like a command', () => {
    for (const text of [
      "Robert'); DROP TABLE contacts;--",
      '<script>alert(1)</script>',
      '=HYPERLINK("http://x","y")',
      '$(rm -rf /) && `whoami`',
      "Ama's Shop & Sons — 50% off",
      'Café ₵ 12,50 😀',
    ]) {
      expect(stripUnsafeChars(text)).toBe(text)
    }
  })

  it('removes control, zero-width and direction-override characters', () => {
    expect(stripUnsafeChars('Ko\u0000\u0008fi')).toBe('Kofi')
    expect(stripUnsafeChars('Ko​fi﻿')).toBe('Kofi')
    expect(stripUnsafeChars('invoice‮fdp.exe')).toBe('invoicefdp.exe')
  })

  it('keeps tabs and new lines for notes', () => {
    expect(stripUnsafeChars('line one\n\tline two')).toBe('line one\n\tline two')
  })
})

describe('cleanLine', () => {
  it('folds whitespace, trims and caps the length', () => {
    expect(cleanLine('  Kofi \n  Mensah  ')).toBe('Kofi Mensah')
    expect(cleanLine('a'.repeat(500), 120)).toHaveLength(120)
  })
})

describe('isPhone', () => {
  it('accepts numbers as people write them and nothing else', () => {
    expect(isPhone('+233 24 000 0001')).toBe(true)
    expect(isPhone('(024) 000-0001')).toBe(true)
    expect(isPhone('024; rm -rf /')).toBe(false)
    expect(isPhone('<b>024</b>')).toBe(false)
    expect(isPhone('+++')).toBe(false)
    expect(isPhone('1'.repeat(33))).toBe(false)
  })
})

describe('format checks', () => {
  it('recognises ids, dates and timestamps and rejects filter syntax', () => {
    expect(isUuid('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')).toBe(true)
    expect(isUuid('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,id.neq.x')).toBe(false)
    expect(isIsoDate('2026-11-22')).toBe(true)
    expect(isIsoDate('2026-11-22),or(id.gt.0')).toBe(false)
    expect(isIsoTimestamp('2026-11-22T10:15:00.123456+00:00')).toBe(true)
    expect(isIsoTimestamp('2026-11-22T10:15:00Z')).toBe(true)
    expect(isIsoTimestamp('2026-11-22T10:15:00Z,id.lt.1')).toBe(false)
  })
})

describe('safeInternalPath', () => {
  it('allows a path inside the app', () => {
    expect(safeInternalPath('/customers?pay=1')).toBe('/customers?pay=1')
  })

  it('sends anything else home', () => {
    for (const bad of ['//evil.example', 'https://evil.example', 'javascript:alert(1)', '/\\evil.example', '/javascript:alert(1)', '/a\u0000b', '', null, 42]) {
      expect(safeInternalPath(bad)).toBe('/')
    }
  })
})

describe('cleanPayload', () => {
  it('cleans strings at any depth and leaves other values alone', () => {
    expect(
      cleanPayload({ p_name: 'Ko​fi', p_amount_minor: 1200, p_note: null, p_filters: { a: ['x\u0007'] }, ok: true }),
    ).toEqual({ p_name: 'Kofi', p_amount_minor: 1200, p_note: null, p_filters: { a: ['x'] }, ok: true })
  })
})
