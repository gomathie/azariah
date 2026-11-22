import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { canReadAdminGuide } from '../access'
import { parseGuide, parseInline, sectionText, slug } from '../markdown'

const doc = (name: string) => parseGuide(readFileSync(resolve(process.cwd(), 'docs', name), 'utf8'))

describe('parseGuide', () => {
  it('reads a title, an intro, sections, lists, a table and bold text', () => {
    const guide = parseGuide(
      [
        '# Title',
        '',
        'Intro line.',
        '',
        '## First part',
        '',
        'Tap **Add** now.',
        '',
        '1. One',
        '2. Two',
        '',
        '- A',
        '- B',
        '',
        '| Task | Owner |',
        '|---|---|',
        '| Undo | Yes |',
        '',
        '## First part',
      ].join('\n'),
    )
    expect(guide.title).toBe('Title')
    expect(guide.intro).toHaveLength(1)
    expect(guide.sections.map((s) => s.id)).toEqual(['first-part', 'first-part-2'])
    const [paragraph, ordered, bullets, table] = guide.sections[0]?.blocks ?? []
    expect(paragraph).toEqual({
      type: 'paragraph',
      spans: [
        { text: 'Tap ', bold: false },
        { text: 'Add', bold: true },
        { text: ' now.', bold: false },
      ],
    })
    expect(ordered).toMatchObject({ type: 'list', ordered: true })
    expect(bullets).toMatchObject({ type: 'list', ordered: false })
    expect(table).toEqual({ type: 'table', head: ['Task', 'Owner'], rows: [['Undo', 'Yes']] })
  })

  it('keeps markup in the file as plain text', () => {
    const guide = parseGuide('# T\n\n## S\n\n<img src=x onerror=alert(1)> and <script>bad()</script>')
    const block = guide.sections[0]?.blocks[0]
    expect(block?.type).toBe('paragraph')
    expect(JSON.stringify(block)).toContain('<script>bad()</script>')
  })

  it('makes ids from accented headings', () => {
    expect(slug('Confidentialité et accès', new Set())).toBe('confidentialite-et-acces')
    expect(parseInline('plain')).toEqual([{ text: 'plain', bold: false }])
  })
})

describe('the guide files', () => {
  it.each([
    ['USER_GUIDE.md', 'USER_GUIDE.fr.md'],
    ['ADMIN_GUIDE.md', 'ADMIN_GUIDE.fr.md'],
    ['ABOUT.md', 'ABOUT.fr.md'],
  ])('%s and its French copy have the same shape', (english, french) => {
    const en = doc(english)
    const fr = doc(french)
    expect(en.title).not.toBe('')
    expect(fr.title).not.toBe('')
    expect(fr.sections).toHaveLength(en.sections.length)
    en.sections.forEach((section, index) => {
      const other = fr.sections[index]
      expect(section.blocks.length).toBeGreaterThan(0)
      expect({ section: section.title, shape: other?.blocks.map((b) => b.type) }).toEqual({
        section: section.title,
        shape: section.blocks.map((b) => b.type),
      })
    })
  })

  it('the user guide covers every main thing the app does', () => {
    const text = readFileSync(resolve(process.cwd(), 'docs', 'USER_GUIDE.md'), 'utf8')
    for (const topic of [
      'Record a sale',
      'Record an expense',
      'Record a payment',
      'Move money',
      'daybook',
      'Invoice',
      'Receipt',
      'Reports',
      'Download Excel',
      'without internet',
      'Add to home screen',
    ]) {
      expect(text).toContain(topic)
    }
  })

  it('the admin guide covers what only owners and admins do', () => {
    const text = readFileSync(resolve(process.cwd(), 'docs', 'ADMIN_GUIDE.md'), 'utf8')
    for (const topic of ['Who can do what', 'Reverse this entry', 'Owner money', 'Download all my data', 'Support access', 'Support console']) {
      expect(text).toContain(topic)
    }
  })
})

describe('sectionText', () => {
  it('gathers headings, paragraphs, list items and table cells for search', () => {
    const guide = parseGuide('# T\n\n## Part\n\nTap **Add**.\n\n- One thing\n\n| Task | Owner |\n|---|---|\n| Undo | Yes |')
    const text = sectionText(guide.sections[0]!)
    for (const piece of ['Part', 'Tap Add.', 'One thing', 'Task Owner', 'Undo Yes']) expect(text).toContain(piece)
  })
})

describe('the About page', () => {
  it('tells the story and makes no claim the app cannot keep', () => {
    const text = readFileSync(resolve(process.cwd(), 'docs', 'ABOUT.md'), 'utf8')
    expect(text).toContain('The story behind Azaria')
    expect(text).toContain('Five questions, every day')
    expect(text).toContain('It is not a bank')
    expect(text).not.toMatch(/guarantee|certified|regulated/i)
  })
})

describe('canReadAdminGuide', () => {
  it('offers the admin guide to owners, admins and the support team only', () => {
    expect(canReadAdminGuide('owner', false)).toBe(true)
    expect(canReadAdminGuide('manager', false)).toBe(true)
    expect(canReadAdminGuide('staff', false)).toBe(false)
    expect(canReadAdminGuide('viewer', false)).toBe(false)
    expect(canReadAdminGuide(undefined, false)).toBe(false)
    expect(canReadAdminGuide(undefined, true)).toBe(true)
  })
})
