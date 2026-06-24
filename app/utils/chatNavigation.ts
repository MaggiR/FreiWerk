export const CHAT_MESSAGE_HIGHLIGHT_CLASS = 'msg--highlight'
export const CHAT_MESSAGE_HIGHLIGHT_MS = 2000
export const CHAT_EXCERPT_MARK_CLASS = 'msg__excerpt-mark'

/**
 * Scroll a chat container to a message and replay the highlight pulse.
 * Returns false when the target post is not in the DOM (e.g. deleted/hidden).
 */
export function scrollToChatMessage(container: HTMLElement, postId: string): boolean {
  const target = container.querySelector<HTMLElement>(`[data-post-id="${postId}"]`)
  if (!target) return false

  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  target.classList.remove(CHAT_MESSAGE_HIGHLIGHT_CLASS)
  // Restart CSS animation when jumping to the same message again.
  void target.offsetWidth
  target.classList.add(CHAT_MESSAGE_HIGHLIGHT_CLASS)
  window.setTimeout(
    () => target.classList.remove(CHAT_MESSAGE_HIGHLIGHT_CLASS),
    CHAT_MESSAGE_HIGHLIGHT_MS,
  )
  return true
}

function normalizeSearchText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** Remove temporary excerpt marks inside a message body. */
export function clearExcerptHighlights(container: HTMLElement): void {
  container.classList.remove('msg__body--quote-target')
  container.querySelectorAll<HTMLElement>(`.${CHAT_EXCERPT_MARK_CLASS}`).forEach((mark) => {
    const parent = mark.parentNode
    if (!parent) return
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark)
    }
    parent.removeChild(mark)
    parent.normalize()
  })
}

/**
 * Wrap the first occurrence of `excerpt` inside `container` with a temporary mark.
 */
export function highlightExcerptInElement(container: HTMLElement, excerpt: string): boolean {
  clearExcerptHighlights(container)

  const needle = normalizeSearchText(excerpt)
  if (!needle) return false

  const pattern = needle
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+')
  const regex = new RegExp(pattern)

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let textNode = walker.nextNode() as Text | null
  while (textNode) {
    const match = textNode.data.match(regex)
    if (match && match.index !== undefined) {
      const idx = match.index
      const len = match[0].length
      const mark = document.createElement('mark')
      mark.className = CHAT_EXCERPT_MARK_CLASS
      const afterNode = textNode.splitText(idx + len)
      const middleNode = textNode.splitText(idx)
      mark.appendChild(middleNode)
      textNode.parentNode?.insertBefore(mark, afterNode)
      mark.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      return true
    }
    textNode = walker.nextNode() as Text | null
  }

  if (normalizeSearchText(container.textContent ?? '').includes(needle)) {
    container.classList.add('msg__body--quote-target')
    return true
  }

  return false
}

/**
 * Scroll to a quoted message and highlight the quoted passage when possible.
 */
export function scrollToChatQuote(
  container: HTMLElement,
  postId: string,
  excerpt?: string | null,
): boolean {
  const found = scrollToChatMessage(container, postId)
  if (!found) return false

  const excerptText = excerpt?.trim()
  if (!excerptText) return true

  window.setTimeout(() => {
    const target = container.querySelector<HTMLElement>(`[data-post-id="${postId}"]`)
    const body = target?.querySelector<HTMLElement>('.msg__body')
    if (!body) return

    const highlighted = highlightExcerptInElement(body, excerptText)
    if (highlighted) {
      window.setTimeout(() => clearExcerptHighlights(body), CHAT_MESSAGE_HIGHLIGHT_MS)
    }
  }, 350)

  return true
}
