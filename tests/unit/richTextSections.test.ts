import { describe, it, expect, beforeEach } from 'vitest'
import { wrapHeadingSections } from '../../app/utils/richTextSections'

describe('wrapHeadingSections', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
  })

  it('wraps headings and their following content in details elements', () => {
    container.innerHTML = `
      <p>Intro</p>
      <h2>Abschnitt</h2>
      <p>Inhalt</p>
      <h3>Unterabschnitt</h3>
      <p>Mehr</p>
    `
    wrapHeadingSections(container)

    expect(container.querySelector('p')?.textContent).toBe('Intro')
    const sections = container.querySelectorAll('details.rich-text__section')
    expect(sections.length).toBe(2)
    expect(sections[0]?.querySelector('summary')?.textContent).toBe('Abschnitt')
    expect(sections[0]?.querySelector('.rich-text__section-body')?.textContent).toContain('Inhalt')
    expect(sections[1]?.querySelector('summary')?.textContent).toBe('Unterabschnitt')
    expect(sections[0]?.contains(sections[1] ?? null)).toBe(true)
  })

  it('stops sibling sections at the next heading of equal or higher level', () => {
    container.innerHTML = `
      <h2>Erster</h2>
      <p>Eins</p>
      <h2>Zweiter</h2>
      <p>Zwei</p>
    `
    wrapHeadingSections(container)

    const sections = Array.from(
      container.querySelectorAll(':scope > details.rich-text__section'),
    )
    expect(sections.length).toBe(2)
    expect(sections[0]?.querySelector('.rich-text__section-body')?.textContent).toBe(
      'Eins',
    )
    expect(sections[1]?.querySelector('.rich-text__section-body')?.textContent).toBe(
      'Zwei',
    )
  })
})
