// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  CHAT_MESSAGE_HIGHLIGHT_CLASS,
  CHAT_MESSAGE_HIGHLIGHT_MS,
  CHAT_EXCERPT_MARK_CLASS,
  scrollToChatMessage,
  highlightExcerptInElement,
  clearExcerptHighlights,
} from '../../app/utils/chatNavigation'

describe('scrollToChatMessage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('scrolls to the target and applies the highlight class', () => {
    const container = document.createElement('div')
    const target = document.createElement('article')
    target.dataset.postId = 'post-1'
    target.scrollIntoView = vi.fn()
    container.appendChild(target)

    const found = scrollToChatMessage(container, 'post-1')

    expect(found).toBe(true)
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
    expect(target.classList.contains(CHAT_MESSAGE_HIGHLIGHT_CLASS)).toBe(true)

    vi.advanceTimersByTime(CHAT_MESSAGE_HIGHLIGHT_MS)
    expect(target.classList.contains(CHAT_MESSAGE_HIGHLIGHT_CLASS)).toBe(false)
  })

  it('returns false when the post is not in the container', () => {
    const container = document.createElement('div')
    expect(scrollToChatMessage(container, 'missing')).toBe(false)
  })
})

describe('highlightExcerptInElement', () => {
  it('wraps a matching passage in a temporary mark', () => {
    const body = document.createElement('div')
    body.appendChild(document.createTextNode('Freiheit und Verantwortung'))

    const highlighted = highlightExcerptInElement(body, 'Freiheit')

    expect(highlighted).toBe(true)
    expect(body.querySelector(`.${CHAT_EXCERPT_MARK_CLASS}`)?.textContent).toBe('Freiheit')

    clearExcerptHighlights(body)
    expect(body.querySelector(`.${CHAT_EXCERPT_MARK_CLASS}`)).toBeNull()
  })
})
