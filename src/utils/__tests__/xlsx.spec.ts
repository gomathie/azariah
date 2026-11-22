import { describe, expect, it } from 'vitest'
import { buildXlsx, columnLetter, crc32 } from '../xlsx'

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes)

describe('buildXlsx', () => {
  it('computes the standard CRC-32 check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  it('names columns the way Excel does', () => {
    expect(columnLetter(0)).toBe('A')
    expect(columnLetter(25)).toBe('Z')
    expect(columnLetter(26)).toBe('AA')
  })

  it('writes a ZIP holding every workbook part', () => {
    const bytes = buildXlsx('Sales summary', [['Date', 'Amount'], ['5 Jan 2026', 120]])
    expect(Array.from(bytes.subarray(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04])
    const text = decode(bytes)
    for (const part of [
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/worksheets/sheet1.xml',
      'xl/styles.xml',
    ]) {
      expect(text).toContain(part)
    }
    // End-of-central-directory record says six files.
    const end = new DataView(bytes.buffer, bytes.length - 22)
    expect(end.getUint32(0, true)).toBe(0x06054b50)
    expect(end.getUint16(10, true)).toBe(6)
  })

  it('keeps amounts as numbers and text as text', () => {
    const text = decode(buildXlsx('R', [['Date', 'Amount'], ['5 Jan 2026', 1250.5]], { boldRows: [0] }))
    expect(text).toContain('<c r="B2" s="2"><v>1250.5</v></c>')
    expect(text).toContain('<c r="A1" t="inlineStr" s="1">')
  })

  it('stores a formula-looking cell as plain text and escapes markup', () => {
    const text = decode(buildXlsx('R', [['=SUM(A1:A9)', 'Ama & <Sons>']]))
    expect(text).toContain('t="inlineStr"')
    expect(text).toContain('<t xml:space="preserve">=SUM(A1:A9)</t>')
    expect(text).not.toContain('<f>')
    expect(text).toContain('Ama &amp; &lt;Sons&gt;')
  })

  it('uses whole-number cells for a currency without decimals', () => {
    const text = decode(buildXlsx('R', [['Total', 1500]], { decimals: 0, boldRows: [0] }))
    expect(text).toContain('<c r="B1" s="5"><v>1500</v></c>')
  })

  it('cleans a sheet name Excel would refuse', () => {
    const text = decode(buildXlsx('Cash/Bank: all [2026] and a very long name indeed', [['x']]))
    expect(text).toContain('<sheet name="Cash Bank  all  2026  and a ver"')
  })
})

describe('buildXlsx counts', () => {
  it('writes a count as a whole number even when amounts use two decimals', () => {
    const text = new TextDecoder().decode(buildXlsx('R', [['Sales', { int: 2 }, 205]]))
    expect(text).toContain('<c r="B1" s="4"><v>2</v></c>')
    expect(text).toContain('<c r="C1" s="2"><v>205</v></c>')
  })
})

describe('buildXlsx text safety', () => {
  it('drops control characters and keeps accents, currency marks and emoji', () => {
    const text = new TextDecoder().decode(buildXlsx('R', [['Caf\u00e9 \u20b5 \u0001\u0008ok \u{1F600}']]))
    expect(text).toContain('Caf\u00e9 \u20b5 ok \u{1F600}')
  })
})
