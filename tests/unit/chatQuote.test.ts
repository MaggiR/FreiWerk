// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest'
import { getSelectionExcerptIn } from '../../app/utils/chatQuote'

describe('getSelectionExcerptIn', () => {
  afterEach(() => {
    window.getSelection()?.removeAllRanges()
  })

  it('returns trimmed selection inside the container', () => {
    const container = document.createElement('div')
    container.textContent = 'Eins zwei drei'
    document.body.appendChild(container)

    const textNode = container.firstChild as Text
    const range = document.createRange()
    range.setStart(textNode, 5)
    range.setEnd(textNode, 9)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)

    expect(getSelectionExcerptIn(container)).toBe('zwei')

    document.body.removeChild(container)
  })

  it('returns null when the selection is outside the container', () => {
    const container = document.createElement('div')
    container.textContent = 'Hallo'
    const outside = document.createElement('div')
    outside.textContent = 'Welt'
    document.body.append(container, outside)

    const textNode = outside.firstChild as Text
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, 4)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)

    expect(getSelectionExcerptIn(container)).toBeNull()

    document.body.removeChild(container)
    document.body.removeChild(outside)
  })
})
