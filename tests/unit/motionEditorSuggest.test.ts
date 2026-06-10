// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import {
  suggestionExtensions,
  setSuggesting,
} from '../../app/editor/suggestions'

const sampleHtml =
  '<h2>Motivation</h2><p>Bestehender Antragstext mit mehreren Wörtern.</p>'

function createSuggestEditor(content: string | object) {
  return new Editor({
    element: document.createElement('div'),
    content,
    editable: true,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      ...suggestionExtensions(),
    ],
  })
}

function waitForEditorReady(editor: Editor): Promise<void> {
  return new Promise((resolve) => {
    if ((editor as { isInitialized?: boolean }).isInitialized) {
      resolve()
      return
    }
    editor.on('create', () => resolve())
  })
}

describe('MotionEditor suggestion mode (integration)', () => {
  const editors: Editor[] = []

  afterEach(() => {
    editors.forEach((ed) => ed.destroy())
    editors.length = 0
  })

  it('loads HTML content when no working doc JSON exists', async () => {
    const editor = createSuggestEditor(sampleHtml)
    editors.push(editor)
    await waitForEditorReady(editor)
    setSuggesting(editor as never, true)

    expect(editor.getText().trim().length).toBeGreaterThan(0)
    expect(editor.getText()).toContain('Bestehender Antragstext')
  })

  it('tracks typed insertions as suggestion marks after create', async () => {
    const editor = createSuggestEditor(sampleHtml)
    editors.push(editor)
    await waitForEditorReady(editor)
    setSuggesting(editor as never, true)

    const end = editor.state.doc.content.size
    editor.chain().focus().insertContentAt(end - 1, ' NEU').run()

    const json = editor.getJSON()
    const serialized = JSON.stringify(json)
    expect(serialized).toContain('insertion')
  })

  it('keeps submitted suggestions visible in a read-only diff view', async () => {
    const editor = createSuggestEditor(sampleHtml)
    editors.push(editor)
    await waitForEditorReady(editor)
    setSuggesting(editor as never, true)

    const end = editor.state.doc.content.size
    editor.chain().focus().insertContentAt(end - 1, ' Vorschlag').run()

    const workingDoc = editor.getJSON()
    expect(JSON.stringify(workingDoc)).toContain('insertion')

    const viewer = createSuggestEditor(workingDoc)
    editors.push(viewer)
    await waitForEditorReady(viewer)

    expect(viewer.getHTML()).toContain('ins')
    expect(viewer.getHTML()).toContain('Vorschlag')
  })
})
