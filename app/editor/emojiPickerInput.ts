import { isSuggestChangesEnabled } from '@handlewithcare/prosemirror-suggest-changes'
import type { EditorView } from '@tiptap/pm/view'

const EMOJI_INPUT_TYPES = new Set([
  'insertText',
  'insertReplacementText',
  'insertFromComposition',
])

const HAS_EMOJI = /\p{Extended_Pictographic}/u

/**
 * Windows' emoji panel (Win+.) commits via beforeinput, often as a short
 * composition sequence. Letting the browser mutate the DOM and then running
 * suggest-changes on the follow-up ProseMirror transactions can insert the same
 * emoji twice. Route emoji picker commits through a single dispatch instead.
 */
export function handleEmojiPickerBeforeInput(
  view: EditorView,
  event: InputEvent,
): boolean {
  if (!isSuggestChangesEnabled(view.state)) return false
  if (!EMOJI_INPUT_TYPES.has(event.inputType)) return false

  const data = event.data
  if (!data || !HAS_EMOJI.test(data)) return false

  event.preventDefault()
  const { from, to } = view.state.selection
  view.dispatch(view.state.tr.insertText(data, from, to))
  return true
}
