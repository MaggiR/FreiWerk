// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import {
  chatComposerKeyExtension,
  handleChatComposerShiftEnter,
  isInEmptyBlockquoteParagraph,
  isInEmptyListItem,
} from '../../app/editor/chatComposerKeys'

function createChatEditor(content: string) {
  return new Editor({
    element: document.createElement('div'),
    content,
    editable: true,
    extensions: [StarterKit, chatComposerKeyExtension()],
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

function findEmptyListItemSelection(editor: Editor): number | null {
  let found: number | null = null
  editor.state.doc.descendants((node, pos) => {
    if (found !== null) return false
    if (node.type.name !== 'paragraph' || node.textContent.trim().length > 0) return
    const $pos = editor.state.doc.resolve(pos)
    for (let depth = $pos.depth; depth > 0; depth--) {
      if ($pos.node(depth).type.name === 'listItem') {
        found = pos + 1
        return false
      }
    }
  })
  return found
}

function findEmptyBlockquoteParagraphSelection(editor: Editor): number | null {
  let found: number | null = null
  editor.state.doc.descendants((node, pos) => {
    if (found !== null) return false
    if (node.type.name !== 'paragraph' || node.textContent.trim().length > 0) return
    const $pos = editor.state.doc.resolve(pos)
    for (let depth = $pos.depth; depth > 0; depth--) {
      if ($pos.node(depth).type.name === 'blockquote') {
        found = pos + 1
        return false
      }
    }
  })
  return found
}

describe('isInEmptyListItem', () => {
  const editors: Editor[] = []

  afterEach(() => {
    for (const editor of editors) {
      editor.destroy()
    }
    editors.length = 0
  })

  it('detects an empty bullet at the end of a list', async () => {
    const editor = createChatEditor(
      '<ul><li><p>Erste Zeile</p></li><li><p>Zweite Zeile</p></li><li><p></p></li></ul>',
    )
    editors.push(editor)
    await waitForEditorReady(editor)

    const pos = findEmptyListItemSelection(editor)
    expect(pos).not.toBeNull()
    editor.commands.setTextSelection(pos!)

    expect(isInEmptyListItem(editor)).toBe(true)
  })

  it('returns false for a list item that contains text', async () => {
    const editor = createChatEditor('<ul><li><p>Text</p></li></ul>')
    editors.push(editor)
    await waitForEditorReady(editor)
    editor.commands.focus('end')

    expect(isInEmptyListItem(editor)).toBe(false)
  })
})

describe('handleChatComposerShiftEnter', () => {
  const editors: Editor[] = []

  afterEach(() => {
    for (const editor of editors) {
      editor.destroy()
    }
    editors.length = 0
  })

  it('removes an empty bullet and places the cursor outside the list', async () => {
    const editor = createChatEditor(
      '<ul><li><p>Erste Zeile</p></li><li><p>Zweite Zeile</p></li><li><p></p></li></ul>',
    )
    editors.push(editor)
    await waitForEditorReady(editor)

    const pos = findEmptyListItemSelection(editor)
    expect(pos).not.toBeNull()
    editor.commands.setTextSelection(pos!)

    const handled = handleChatComposerShiftEnter(editor)
    expect(handled).toBe(true)
    expect(editor.isActive('listItem')).toBe(false)
    expect(editor.getHTML()).toBe(
      '<ul><li><p>Erste Zeile</p></li><li><p>Zweite Zeile</p></li></ul><p></p>',
    )
  })

  it('still splits a list item that contains text', async () => {
    const editor = createChatEditor('<ul><li><p>Alpha Beta</p></li></ul>')
    editors.push(editor)
    await waitForEditorReady(editor)
    editor.commands.setTextSelection(8)

    const handled = handleChatComposerShiftEnter(editor)
    expect(handled).toBe(true)
    expect(editor.isActive('listItem')).toBe(true)
    expect(editor.getHTML()).toBe('<ul><li><p>Alpha</p></li><li><p> Beta</p></li></ul>')
  })

  it('exits an empty blockquote line to a normal paragraph', async () => {
    const editor = createChatEditor(
      '<blockquote><p>Zitattext</p><p></p></blockquote>',
    )
    editors.push(editor)
    await waitForEditorReady(editor)

    const pos = findEmptyBlockquoteParagraphSelection(editor)
    expect(pos).not.toBeNull()
    editor.commands.setTextSelection(pos!)
    expect(isInEmptyBlockquoteParagraph(editor)).toBe(true)

    const handled = handleChatComposerShiftEnter(editor)
    expect(handled).toBe(true)
    expect(editor.isActive('blockquote')).toBe(false)
    expect(editor.getHTML()).toBe('<blockquote><p>Zitattext</p></blockquote><p></p>')
  })

  it('still splits blockquote text that contains content', async () => {
    const editor = createChatEditor('<blockquote><p>Alpha Beta</p></blockquote>')
    editors.push(editor)
    await waitForEditorReady(editor)
    editor.commands.setTextSelection(8)

    const handled = handleChatComposerShiftEnter(editor)
    expect(handled).toBe(true)
    expect(editor.isActive('blockquote')).toBe(true)
    expect(editor.getHTML()).toBe('<blockquote><p>Alpha </p><p>Beta</p></blockquote>')
  })
})
