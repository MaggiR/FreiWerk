import {
  CHAT_EXCERPT_MARK_CLASS,
  CHAT_MESSAGE_HIGHLIGHT_MS,
  clearExcerptHighlights,
  highlightExcerptInElement,
} from '~/utils/chatNavigation'

export { CHAT_EXCERPT_MARK_CLASS as MOTION_EXCERPT_MARK_CLASS }

export function motionBodySelector(motionId: string): string {
  return `[data-motion-body="${motionId}"]`
}

function isElementVisible(el: HTMLElement): boolean {
  let node: HTMLElement | null = el
  while (node) {
    const style = getComputedStyle(node)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    node = node.parentElement
  }
  return true
}

/** Find the visible RichText root for a motion body (mobile/desktop layouts). */
export function findMotionBodyElement(motionId: string): HTMLElement | null {
  const roots = document.querySelectorAll<HTMLElement>(motionBodySelector(motionId))
  for (const root of roots) {
    if (!isElementVisible(root)) continue
    const body =
      root.querySelector<HTMLElement>('.motion__body-layer.is-visible .rich-text') ??
      root.querySelector<HTMLElement>('.rich-text')
    if (body) return body
  }
  return null
}

/**
 * Scroll to a marked passage in the motion body and highlight it temporarily.
 * Returns false when the body or excerpt cannot be resolved.
 */
export function scrollToMotionExcerpt(motionId: string, excerptText: string): boolean {
  const body = findMotionBodyElement(motionId)
  if (!body) return false

  const excerpt = excerptText.trim()
  if (!excerpt) return false

  const scrollRoot = body.closest<HTMLElement>('.motion__body-area') ?? body
  scrollRoot.scrollIntoView({ behavior: 'smooth', block: 'center' })

  const highlighted = highlightExcerptInElement(body, excerpt)
  if (!highlighted) return false

  window.setTimeout(() => clearExcerptHighlights(body), CHAT_MESSAGE_HIGHLIGHT_MS)
  return true
}
