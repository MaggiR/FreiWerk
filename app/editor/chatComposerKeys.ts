import { Extension, type Editor } from '@tiptap/core'

/** True when the selection sits in a list item with no text content. */
export function isInEmptyListItem(editor: Editor): boolean {
  const { $from } = editor.state.selection
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth)
    if (node.type.name === 'listItem') {
      return node.textContent.trim().length === 0
    }
  }
  return false
}

/** True when the selection sits in an empty paragraph inside a blockquote. */
export function isInEmptyBlockquoteParagraph(editor: Editor): boolean {
  if (!editor.isActive('blockquote')) return false
  const { $from } = editor.state.selection
  const parent = $from.parent
  if (parent.type.name !== 'paragraph') return false
  return parent.textContent.trim().length === 0
}

/** Shift+Enter in the chat composer (new paragraph / list item, or exit empty blocks). */
export function handleChatComposerShiftEnter(editor: Editor): boolean {
  if (isInEmptyListItem(editor)) {
    if (editor.can().liftListItem('listItem')) {
      return editor.chain().focus().liftListItem('listItem').run()
    }
    return false
  }
  if (isInEmptyBlockquoteParagraph(editor)) {
    if (editor.can().lift('blockquote')) {
      return editor.chain().focus().lift('blockquote').run()
    }
    return false
  }
  if (editor.can().splitListItem('listItem')) {
    return editor.chain().focus().splitListItem('listItem').run()
  }
  if (editor.can().splitBlock()) {
    return editor.chain().focus().splitBlock().run()
  }
  return false
}

/**
 * Chat composer keyboard model:
 * - Enter → send (handled by DebateComposer on bubble; block editor defaults here)
 * - Shift+Enter → same as a normal Enter (new paragraph, list item, …)
 * - Shift+Enter in an empty list item → exit the list to a blank paragraph
 * - Shift+Enter in an empty blockquote line → exit the quote to a blank paragraph
 */
export function chatComposerKeyExtension() {
  return Extension.create({
    name: 'chatComposerKeys',
    priority: 1000,
    addKeyboardShortcuts() {
      return {
        Enter: () => true,
        'Shift-Enter': ({ editor }) => handleChatComposerShiftEnter(editor),
      }
    },
  })
}
