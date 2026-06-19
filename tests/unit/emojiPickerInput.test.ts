// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import {
  suggestionExtensions,
  setSuggesting,
  installSuggestChanges,
} from '../../app/editor/suggestions'
import { handleEmojiPickerBeforeInput } from '../../app/editor/emojiPickerInput'

function createSuggestEditor(content: string) {
  const editor = new Editor({
    element: document.createElement('div'),
    content,
    editable: true,
    extensions: [StarterKit, ...suggestionExtensions()],
  })
  installSuggestChanges(editor as never)
  return editor
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

function makeInputEvent(inputType: string, data: string): InputEvent {
  return new InputEvent('beforeinput', {
    inputType,
    data,
    bubbles: true,
    cancelable: true,
  })
}

describe('handleEmojiPickerBeforeInput', () => {
  const editors: Editor[] = []

  afterEach(() => {
    editors.forEach((ed) => ed.destroy())
    editors.length = 0
  })

  it('inserts emoji once via beforeinput while suggesting', async () => {
    const editor = createSuggestEditor('<p>Text </p>')
    editors.push(editor)
    await waitForEditorReady(editor)
    setSuggesting(editor as never, true)

    const end = editor.state.doc.content.size - 1
    editor.commands.setTextSelection(end)

    const handled = handleEmojiPickerBeforeInput(
      editor.view,
      makeInputEvent('insertText', '😀'),
    )

    expect(handled).toBe(true)
    expect((editor.getText().match(/😀/gu) ?? []).length).toBe(1)
    expect(JSON.stringify(editor.getJSON())).toContain('insertion')
  })

  it('does not intercept plain text beforeinput', async () => {
    const editor = createSuggestEditor('<p>Text </p>')
    editors.push(editor)
    await waitForEditorReady(editor)
    setSuggesting(editor as never, true)

    const handled = handleEmojiPickerBeforeInput(
      editor.view,
      makeInputEvent('insertText', 'a'),
    )

    expect(handled).toBe(false)
  })

  it('skips suggest transform for composition transactions', async () => {
    const editor = createSuggestEditor('<p>Text </p>')
    editors.push(editor)
    await waitForEditorReady(editor)
    setSuggesting(editor as never, true)

    const pos = editor.state.doc.content.size - 1
    const compositionTr = editor.state.tr.insertText('😀', pos).setMeta('composition', 1)
    editor.view.dispatch(compositionTr)

    expect((editor.getText().match(/😀/gu) ?? []).length).toBe(1)
    expect(JSON.stringify(editor.getJSON())).not.toContain('insertion')
  })
})
