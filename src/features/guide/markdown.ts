/**
 * A small reader for the guide files in docs/. It understands only what those files use:
 * "##" and "###" headings, paragraphs, bullet and numbered lists, simple tables and **bold**.
 * It returns plain data that the screen draws with ordinary elements, so no HTML from the file
 * is ever inserted into the page.
 */
export interface Span {
  text: string
  bold: boolean
}

export type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; spans: Span[] }
  | { type: 'list'; ordered: boolean; items: Span[][] }
  | { type: 'table'; head: string[]; rows: string[][] }

export interface GuideSection {
  id: string
  title: string
  blocks: Block[]
}

export interface Guide {
  title: string
  intro: Span[][]
  sections: GuideSection[]
}

export function parseInline(text: string): Span[] {
  const spans: Span[] = []
  for (const [index, part] of text.split('**').entries()) {
    if (part !== '') spans.push({ text: part, bold: index % 2 === 1 })
  }
  return spans
}

export function slug(text: string, taken: Set<string>): string {
  const base =
    text
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  let id = base
  let n = 2
  while (taken.has(id)) id = `${base}-${n++}`
  taken.add(id)
  return id
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim())

export function parseGuide(source: string): Guide {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const guide: Guide = { title: '', intro: [], sections: [] }
  const taken = new Set<string>()
  let section: GuideSection | null = null
  let paragraph: string[] = []
  let list: { ordered: boolean; items: Span[][] } | null = null

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    const spans = parseInline(paragraph.join(' '))
    if (section) section.blocks.push({ type: 'paragraph', spans })
    else guide.intro.push(spans)
    paragraph = []
  }
  const flushList = () => {
    if (list && section) section.blocks.push({ type: 'list', ...list })
    list = null
  }
  const flush = () => {
    flushParagraph()
    flushList()
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const trimmed = line.trim()

    if (trimmed === '') {
      flush()
      continue
    }
    if (trimmed.startsWith('# ') && !guide.title) {
      guide.title = trimmed.slice(2).trim()
      continue
    }
    if (trimmed.startsWith('## ')) {
      flush()
      const title = trimmed.slice(3).trim()
      section = { id: slug(title, taken), title, blocks: [] }
      guide.sections.push(section)
      continue
    }
    if (trimmed.startsWith('### ')) {
      flush()
      section?.blocks.push({ type: 'heading', text: trimmed.slice(4).trim() })
      continue
    }
    if (trimmed.startsWith('|') && section) {
      flush()
      const table: string[][] = []
      while (i < lines.length && (lines[i] ?? '').trim().startsWith('|')) {
        table.push(cells(lines[i] ?? ''))
        i++
      }
      i--
      const [head, divider, ...rest] = table
      const isDivider = divider?.every((c) => /^:?-+:?$/.test(c))
      section.blocks.push({ type: 'table', head: head ?? [], rows: isDivider ? rest : table.slice(1) })
      continue
    }
    const bullet = /^[-*]\s+(.*)$/.exec(trimmed)
    const numbered = /^\d+\.\s+(.*)$/.exec(trimmed)
    if (bullet || numbered) {
      flushParagraph()
      const ordered = !!numbered
      if (!list || list.ordered !== ordered) {
        flushList()
        list = { ordered, items: [] }
      }
      list.items.push(parseInline((bullet ?? numbered)?.[1] ?? ''))
      continue
    }
    // An indented line under a list item continues that item.
    if (list && /^\s+/.test(line)) {
      const last = list.items.at(-1)
      if (last) last.push(...parseInline(' ' + trimmed))
      continue
    }
    flushList()
    paragraph.push(trimmed)
  }
  flush()
  return guide
}

/** Everything a person can read in a section, joined, for search. */
export function sectionText(section: GuideSection): string {
  const parts: string[] = [section.title]
  for (const block of section.blocks) {
    if (block.type === 'heading') parts.push(block.text)
    else if (block.type === 'paragraph') parts.push(block.spans.map((s) => s.text).join(''))
    else if (block.type === 'list') parts.push(...block.items.map((item) => item.map((s) => s.text).join('')))
    else parts.push(block.head.join(' '), ...block.rows.map((row) => row.join(' ')))
  }
  return parts.join('\n')
}
