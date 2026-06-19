import { undo, redo } from '@tiptap/pm/history'
import type { EditorView } from '@tiptap/pm/view'

/** Route undo/redo keys to ProseMirror history instead of the browser contenteditable stack. */
export function handleUndoRedoKeyDown(view: EditorView, event: KeyboardEvent): boolean {
  if (!view.editable) return false
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return false

  const key = event.key.toLowerCase()
  const isUndo = key === 'z' && !event.shiftKey
  const isRedo = key === 'y' || (key === 'z' && event.shiftKey)
  if (!isUndo && !isRedo) return false

  event.preventDefault()
  return isUndo ? undo(view.state, view.dispatch) : redo(view.state, view.dispatch)
}
