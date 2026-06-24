// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  CHAT_EXCERPT_MARK_CLASS,
  CHAT_MESSAGE_HIGHLIGHT_MS,
} from '../../app/utils/chatNavigation'
import {
  findMotionBodyElement,
  scrollToMotionExcerpt,
} from '../../app/utils/motionExcerptNavigation'

describe('findMotionBodyElement', () => {
  it('returns the rich text inside a visible motion body root', () => {
    document.body.innerHTML = `
      <div data-motion-body="motion-1" class="motion__body-content">
        <div class="motion__body-layer is-visible">
          <div class="rich-text">Antragstext</div>
        </div>
      </div>
    `

    const body = findMotionBodyElement('motion-1')
    expect(body?.classList.contains('rich-text')).toBe(true)
    expect(body?.textContent).toBe('Antragstext')
  })

  it('ignores hidden motion body roots', () => {
    document.body.innerHTML = `
      <div data-motion-body="motion-1" style="display: none">
        <div class="rich-text">Versteckt</div>
      </div>
      <div data-motion-body="motion-1">
        <div class="rich-text">Sichtbar</div>
      </div>
    `

    const body = findMotionBodyElement('motion-1')
    expect(body?.textContent).toBe('Sichtbar')
  })
})

describe('scrollToMotionExcerpt', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('highlights the excerpt inside the motion body', () => {
    document.body.innerHTML = `
      <div class="motion__body-area">
        <div data-motion-body="motion-1">
          <div class="rich-text">Freiheit und Verantwortung</div>
        </div>
      </div>
    `
    const area = document.querySelector('.motion__body-area') as HTMLElement
    area.scrollIntoView = vi.fn()

    const found = scrollToMotionExcerpt('motion-1', 'Freiheit')

    expect(found).toBe(true)
    expect(area.scrollIntoView).toHaveBeenCalled()
    expect(document.querySelector(`.${CHAT_EXCERPT_MARK_CLASS}`)?.textContent).toBe('Freiheit')

    vi.advanceTimersByTime(CHAT_MESSAGE_HIGHLIGHT_MS)
    expect(document.querySelector(`.${CHAT_EXCERPT_MARK_CLASS}`)).toBeNull()
  })

  it('returns false when the excerpt is missing', () => {
    document.body.innerHTML = `
      <div data-motion-body="motion-1">
        <div class="rich-text">Anderer Text</div>
      </div>
    `

    expect(scrollToMotionExcerpt('motion-1', 'Nicht vorhanden')).toBe(false)
  })
})
