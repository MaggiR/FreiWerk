/**
 * Minimal HTML → ProseMirror JSON converter for seed working documents.
 * Handles the subset produced by buildMotionBody (headings, paragraphs, lists,
 * blockquotes, inline strong/em).
 */

export type PmMark = { type: string; attrs?: Record<string, unknown> }
export type PmNode = {
  type: string
  text?: string
  marks?: PmMark[]
  content?: PmNode[]
  attrs?: Record<string, unknown>
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ''))
}

function parseInline(html: string): PmNode[] {
  const nodes: PmNode[] = []
  const pattern =
    /<(strong|em|b|i)>([\s\S]*?)<\/\1>|([^<]+)/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html)) !== null) {
    const tag = match[1]?.toLowerCase()
    const inner = match[2]
    const plain = match[3]
    if (tag && inner !== undefined) {
      const markType = tag === 'strong' || tag === 'b' ? 'bold' : 'italic'
      const text = stripTags(inner)
      if (text) nodes.push({ type: 'text', text, marks: [{ type: markType }] })
    } else if (plain) {
      const text = decodeEntities(plain)
      if (text) nodes.push({ type: 'text', text })
    }
  }
  return nodes.length ? nodes : [{ type: 'text', text: stripTags(html) }]
}

function parseListItems(html: string, ordered: boolean): PmNode {
  const items: PmNode[] = []
  const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi
  let match: RegExpExecArray | null
  while ((match = liPattern.exec(html)) !== null) {
    items.push({
      type: 'listItem',
      content: [{ type: 'paragraph', content: parseInline(match[1] ?? '') }],
    })
  }
  return {
    type: ordered ? 'orderedList' : 'bulletList',
    content: items.length ? items : [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
  }
}

function parseBlock(block: string): PmNode | null {
  const hrMatch = /^<hr\s*\/?>$/i.exec(block.trim())
  if (hrMatch) return { type: 'horizontalRule' }

  const openMatch = /^<(h2|p|ul|ol|blockquote)(?:\s[^>]*)?>([\s\S]*)<\/\1>$/i.exec(
    block.trim(),
  )
  if (!openMatch) return null

  const tag = openMatch[1]!.toLowerCase()
  const inner = openMatch[2] ?? ''

  switch (tag) {
    case 'h2':
      return {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: stripTags(inner) }],
      }
    case 'p':
      return { type: 'paragraph', content: parseInline(inner) }
    case 'ul':
      return parseListItems(inner, false)
    case 'ol':
      return parseListItems(inner, true)
    case 'blockquote':
      return {
        type: 'blockquote',
        content: [{ type: 'paragraph', content: parseInline(inner) }],
      }
    default:
      return null
  }
}

/** Convert motion body HTML into a ProseMirror document node. */
export function htmlToProseMirrorDoc(html: string): PmNode {
  const content: PmNode[] = []
  const blockPattern =
    /<(h2|p|ul|ol|blockquote)(?:\s[^>]*)?>[\s\S]*?<\/\1>|<hr\s*\/?>/gi
  let match: RegExpExecArray | null
  while ((match = blockPattern.exec(html)) !== null) {
    const node = parseBlock(match[0])
    if (node) content.push(node)
  }

  if (!content.length) {
    content.push({ type: 'paragraph', content: [{ type: 'text', text: stripTags(html) }] })
  }

  return { type: 'doc', content }
}

type SuggestionInput = {
  id: number
  type: 'insertion' | 'deletion'
  text: string
  anchor?: string
  userId: string
  userName: string
  createdAt: Date
}

function suggestionMark(
  type: 'insertion' | 'deletion',
  id: number,
  userId: string,
  userName: string,
  createdAt: Date,
): PmMark {
  return {
    type,
    attrs: {
      id,
      userId,
      userName,
      createdAt: createdAt.toISOString(),
    },
  }
}

function walkTextNodes(
  node: PmNode,
  visit: (node: PmNode, parent: PmNode | null, index: number) => void,
  parent: PmNode | null = null,
  index = 0,
): void {
  if (node.type === 'text') {
    visit(node, parent, index)
    return
  }
  if (Array.isArray(node.content)) {
    node.content.forEach((child, i) => walkTextNodes(child, visit, node, i))
  }
}

function replaceTextNode(
  parent: PmNode,
  index: number,
  replacement: PmNode[],
): void {
  if (!parent.content) return
  parent.content.splice(index, 1, ...replacement)
}

/** Apply suggestion marks to an existing document (used by seed data). */
export function applySuggestionsToDoc(
  doc: PmNode,
  suggestions: SuggestionInput[],
): PmNode {
  const result: PmNode = JSON.parse(JSON.stringify(doc)) as PmNode

  for (const item of [...suggestions].sort((a, b) => a.id - b.id)) {
    const mark = suggestionMark(
      item.type,
      item.id,
      item.userId,
      item.userName,
      item.createdAt,
    )

    if (item.type === 'deletion') {
      let applied = false
      walkTextNodes(result, (node, parent, index) => {
        if (applied || !node.text || !parent) return
        const pos = node.text.indexOf(item.text)
        if (pos === -1) return
        const before = node.text.slice(0, pos)
        const target = node.text.slice(pos, pos + item.text.length)
        const after = node.text.slice(pos + item.text.length)
        const nodes: PmNode[] = []
        if (before) nodes.push({ type: 'text', text: before, marks: node.marks })
        nodes.push({ type: 'text', text: target, marks: [...(node.marks ?? []), mark] })
        if (after) nodes.push({ type: 'text', text: after, marks: node.marks })
        replaceTextNode(parent, index, nodes)
        applied = true
      })
      continue
    }

    const anchor = item.anchor ?? ''
    let applied = false
    walkTextNodes(result, (node, parent, index) => {
      if (applied || !node.text || !parent) return
      const pos = anchor ? node.text.indexOf(anchor) : node.text.length
      if (pos === -1) return
      const insertAt = pos + anchor.length
      const before = node.text.slice(0, insertAt)
      const after = node.text.slice(insertAt)
      const nodes: PmNode[] = []
      if (before) nodes.push({ type: 'text', text: before, marks: node.marks })
      nodes.push({ type: 'text', text: item.text, marks: [mark] })
      if (after) nodes.push({ type: 'text', text: after, marks: node.marks })
      replaceTextNode(parent, index, nodes)
      applied = true
    })
  }

  return result
}
