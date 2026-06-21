import { describe, it, expect } from 'vitest'
import { htmlToMarkdown } from '../../server/utils/markdown'

describe('htmlToMarkdown', () => {
  it('converts headings and paragraphs', () => {
    const md = htmlToMarkdown('<h1>Titel</h1><p>Ein Absatz.</p>')
    expect(md).toContain('# Titel')
    expect(md).toContain('Ein Absatz.')
  })

  it('converts inline emphasis and bold', () => {
    const md = htmlToMarkdown('<p>Das ist <strong>fett</strong> und <em>kursiv</em>.</p>')
    expect(md).toContain('**fett**')
    expect(md).toContain('*kursiv*')
  })

  it('converts links to markdown syntax', () => {
    const md = htmlToMarkdown('<p>Siehe <a href="https://fdp.de">FDP</a>.</p>')
    expect(md).toContain('[FDP](https://fdp.de)')
  })

  it('converts unordered and ordered lists', () => {
    const ul = htmlToMarkdown('<ul><li>Eins</li><li>Zwei</li></ul>')
    expect(ul).toContain('- Eins')
    expect(ul).toContain('- Zwei')

    const ol = htmlToMarkdown('<ol><li>Erstens</li><li>Zweitens</li></ol>')
    expect(ol).toContain('1. Erstens')
    expect(ol).toContain('2. Zweitens')
  })

  it('converts blockquotes with a leading marker', () => {
    const md = htmlToMarkdown('<blockquote><p>Zitat</p></blockquote>')
    expect(md).toContain('> Zitat')
  })

  it('decodes HTML entities', () => {
    const md = htmlToMarkdown('<p>Reform &amp; Freiheit</p>')
    expect(md).toContain('Reform & Freiheit')
    expect(md).not.toContain('&amp;')
  })

  it('renders images and horizontal rules', () => {
    const md = htmlToMarkdown('<p>Text</p><hr><img src="/uploads/x.png" alt="Bild">')
    expect(md).toContain('---')
    expect(md).toContain('![Bild](/uploads/x.png)')
  })

  it('collapses excessive blank lines', () => {
    const md = htmlToMarkdown('<p>A</p><p>B</p>')
    expect(md).not.toMatch(/\n{3,}/)
  })
})
