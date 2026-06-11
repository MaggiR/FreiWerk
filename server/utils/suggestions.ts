import type { SuggestionItem } from '../../shared/types'

// Server-side helpers for the suggestion-mode working document. They operate on
// plain ProseMirror JSON (the server never instantiates ProseMirror) so they are
// pure and unit-testable.

export const SUGGESTION_MARK_NAMES = ['insertion', 'deletion', 'modification'] as const
type SuggestionMarkName = (typeof SUGGESTION_MARK_NAMES)[number]

// Allow-list mirroring the TipTap schema used by the motion editor.
const ALLOWED_NODE_TYPES = new Set([
  'doc',
  'paragraph',
  'text',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'codeBlock',
  'hardBreak',
  'horizontalRule',
  'image',
  'video',
  'attachment',
])

const ALLOWED_MARK_TYPES = new Set([
  'bold',
  'italic',
  'underline',
  'strike',
  'code',
  'link',
  ...SUGGESTION_MARK_NAMES,
])

interface PmMark {
  type?: string
  attrs?: Record<string, unknown>
}

interface PmNode {
  type?: string
  text?: string
  marks?: PmMark[]
  content?: PmNode[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSuggestionMark(mark: PmMark | undefined): mark is PmMark & { type: SuggestionMarkName } {
  return (
    !!mark &&
    typeof mark.type === 'string' &&
    (SUGGESTION_MARK_NAMES as readonly string[]).includes(mark.type)
  )
}

function walkNodes(node: PmNode | undefined, visit: (node: PmNode) => void) {
  if (!node || typeof node !== 'object') return
  visit(node)
  if (Array.isArray(node.content)) {
    for (const child of node.content) walkNodes(child, visit)
  }
}

export interface ValidationResult {
  ok: boolean
  reason?: string
}

/**
 * Structural allow-list validation: every node and mark type in the working
 * document must be one the motion editor can produce. Prevents storing arbitrary
 * / unsafe ProseMirror JSON.
 */
export function validateWorkingDoc(docJson: unknown): ValidationResult {
  if (!isRecord(docJson) || docJson.type !== 'doc') {
    return { ok: false, reason: 'Kein gültiges Dokument.' }
  }

  let reason: string | undefined
  walkNodes(docJson as PmNode, (node) => {
    if (reason) return
    if (typeof node.type !== 'string' || !ALLOWED_NODE_TYPES.has(node.type)) {
      reason = `Unzulässiger Knoten: ${String(node.type)}`
      return
    }
    if (Array.isArray(node.marks)) {
      for (const mark of node.marks) {
        if (typeof mark?.type !== 'string' || !ALLOWED_MARK_TYPES.has(mark.type)) {
          reason = `Unzulässige Markierung: ${String(mark?.type)}`
          return
        }
      }
    }
  })

  return reason ? { ok: false, reason } : { ok: true }
}

/** Number of distinct open suggestions (grouped by mark id). */
export function countOpenSuggestions(docJson: unknown): number {
  const ids = new Set<number | string>()
  walkNodes(docJson as PmNode, (node) => {
    node.marks?.forEach((mark) => {
      if (isSuggestionMark(mark)) {
        const id = mark.attrs?.id
        if (id != null) ids.add(id as number | string)
      }
    })
  })
  return ids.size
}

/**
 * Derive the list of open suggestions from the working document. Each contiguous
 * change shares a mark `id`; author info is read from the `userId` / `userName`
 * attributes stamped client-side.
 */
export function extractSuggestions(docJson: unknown): SuggestionItem[] {
  const byId = new Map<
    number,
    {
      type: SuggestionMarkName
      authorId: string | null
      authorName: string | null
      createdAt: string | null
      snippet: string
    }
  >()

  walkNodes(docJson as PmNode, (node) => {
    node.marks?.forEach((mark) => {
      if (!isSuggestionMark(mark)) return
      const rawId = mark.attrs?.id
      if (rawId == null) return
      const id = typeof rawId === 'number' ? rawId : Number(rawId)
      if (Number.isNaN(id)) return

      const existing = byId.get(id)
      const text = typeof node.text === 'string' ? node.text : ''
      if (existing) {
        if (existing.snippet.length < 80 && text) {
          existing.snippet = `${existing.snippet}${text}`.slice(0, 80)
        }
      } else {
        byId.set(id, {
          type: mark.type,
          authorId: (mark.attrs?.userId as string | undefined) ?? null,
          authorName: (mark.attrs?.userName as string | undefined) ?? null,
          createdAt: (mark.attrs?.createdAt as string | undefined) ?? null,
          snippet: text.slice(0, 80),
        })
      }
    })
  })

  return [...byId.entries()].map(([id, value]) => ({
    id,
    type: value.type,
    authorId: value.authorId,
    authorName: value.authorName,
    createdAt: value.createdAt,
    snippet: value.snippet.trim(),
  }))
}

const UPLOAD_REF_PATTERN = /\/uploads\/[A-Za-z0-9._-]+/g

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort()
}

/** Collect all referenced upload assets from sanitized HTML. */
export function extractMediaRefsFromHtml(html: string): string[] {
  return uniqueSorted(html.match(UPLOAD_REF_PATTERN) ?? [])
}

/** Collect all referenced upload assets from a ProseMirror JSON document. */
export function extractMediaRefsFromDoc(docJson: unknown): string[] {
  const serialized = JSON.stringify(docJson ?? null)
  return uniqueSorted(serialized.match(UPLOAD_REF_PATTERN) ?? [])
}

/** True when two media-reference lists contain exactly the same assets. */
export function mediaRefsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((value, index) => value === b[index])
}
