/** Max length for a quoted passage (matches server validation). */
export const CHAT_QUOTE_MAX_LENGTH = 500

/**
 * Read the user's current selection when it lies inside `container` (e.g. message body).
 */
export function getSelectionExcerptIn(container: HTMLElement): string | null {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null
  }

  const text = selection.toString().replace(/\s+/g, ' ').trim()
  if (!text) return null

  const range = selection.getRangeAt(0)
  if (!container.contains(range.commonAncestorContainer)) {
    return null
  }

  return text.length > CHAT_QUOTE_MAX_LENGTH
    ? `${text.slice(0, CHAT_QUOTE_MAX_LENGTH - 1).trimEnd()}…`
    : text
}
