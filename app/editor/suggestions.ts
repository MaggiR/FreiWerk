import { Extension, Mark, mergeAttributes } from '@tiptap/core'
import type { Editor } from '@tiptap/vue-3'
import { EditorState, Plugin, PluginKey } from '@tiptap/pm/state'
import {
  DOMSerializer,
  type Mark as PMMark,
  type MarkType,
  type ResolvedPos,
} from '@tiptap/pm/model'
import type { EditorView } from '@tiptap/pm/view'
import type { Transaction } from '@tiptap/pm/state'
import {
  suggestChanges,
  suggestChangesKey,
  withSuggestChanges,
  enableSuggestChanges,
  disableSuggestChanges,
  isSuggestChangesEnabled,
  applySuggestion,
  revertSuggestion,
  revertSuggestions,
} from '@handlewithcare/prosemirror-suggest-changes'
import { textContainsEmoji } from './emoji'

// Suggestion mode = a Google-Docs-style review layer on top of the regular TipTap
// editor. It is powered by @handlewithcare/prosemirror-suggest-changes, which
// represents pending edits as `insertion` / `deletion` / `modification` marks
// instead of mutating the document directly.
//
// The library only stores a numeric `id` on each mark (to group one contiguous
// change). We add `userId` / `userName` attributes so we can show who proposed a
// change; they default to null and are stamped client-side before submitting.

const idAttribute = {
  id: {
    default: null,
    parseHTML: (element: HTMLElement) =>
      element.dataset.id ? JSON.parse(element.dataset.id) : null,
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes.id == null ? {} : { 'data-id': JSON.stringify(attributes.id) },
  },
}

const authorAttributes = {
  userId: {
    default: null,
    parseHTML: (element: HTMLElement) => element.dataset.userId ?? null,
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes.userId == null ? {} : { 'data-user-id': String(attributes.userId) },
  },
  userName: {
    default: null,
    parseHTML: (element: HTMLElement) => element.dataset.userName ?? null,
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes.userName == null
        ? {}
        : { 'data-user-name': String(attributes.userName) },
  },
  createdAt: {
    default: null,
    parseHTML: (element: HTMLElement) => element.dataset.createdAt ?? null,
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes.createdAt == null
        ? {}
        : { 'data-created-at': String(attributes.createdAt) },
  },
}

export const SuggestionInsertion = Mark.create({
  name: 'insertion',
  inclusive: false,
  excludes() {
    return 'deletion modification insertion'
  },
  addAttributes() {
    return { ...idAttribute, ...authorAttributes }
  },
  parseHTML() {
    return [{ tag: 'ins[data-id]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['ins', mergeAttributes(HTMLAttributes), 0]
  },
})

export const SuggestionDeletion = Mark.create({
  name: 'deletion',
  inclusive: false,
  excludes() {
    return 'insertion modification deletion'
  },
  addAttributes() {
    return { ...idAttribute, ...authorAttributes }
  },
  parseHTML() {
    return [{ tag: 'del[data-id]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['del', mergeAttributes(HTMLAttributes), 0]
  },
})

export const SuggestionModification = Mark.create({
  name: 'modification',
  inclusive: false,
  excludes() {
    return 'deletion insertion'
  },
  addAttributes() {
    return {
      ...idAttribute,
      type: { default: null },
      attrName: { default: null },
      previousValue: { default: null },
      newValue: { default: null },
      ...authorAttributes,
    }
  },
  parseHTML() {
    return [
      { tag: "span[data-type='modification']" },
      { tag: "div[data-type='modification']" },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'modification' }), 0]
  },
})

// TipTap wrapper around the suggest-changes ProseMirror plugin. It also installs
// the `withSuggestChanges` dispatch decorator so that, while suggesting is
// enabled, edits are turned into suggestion marks instead of being applied.
const patchedViews = new WeakSet<EditorView>()

export function installSuggestChanges(editor: Editor) {
  const view = editor.view
  if (patchedViews.has(view)) return

  // Always forward to TipTap's dispatch — never view.props.dispatchTransaction,
  // or composition bypass and suggest wrapping recurse into each other.
  const applyTransaction = (tr: Transaction) => {
    ;(editor as unknown as { dispatchTransaction(tr: Transaction): void }).dispatchTransaction(tr)
  }

  const suggestDispatch = withSuggestChanges(applyTransaction)

  view.setProps({
    dispatchTransaction(tr: Transaction) {
      if (tr.getMeta('composition')) {
        applyTransaction(tr)
        return
      }
      suggestDispatch.call(view, tr)
    },
  })
  patchedViews.add(view)
}

function adjacentInsertionMark(
  $pos: ResolvedPos,
  insertion: MarkType,
): PMMark | null {
  const before = $pos.nodeBefore
  const after = $pos.nodeAfter
  return (
    before?.marks.find((mark) => mark.type === insertion) ??
    after?.marks.find((mark) => mark.type === insertion) ??
    null
  )
}

/** Emoji picker inserts can land in unmarked text nodes beside marked insertions. */
function reconcileEmojiInsertionMarks(state: EditorState): Transaction | null {
  if (!isSuggestChangesEnabled(state)) return null

  const insertion = state.schema.marks.insertion
  const deletion = state.schema.marks.deletion
  if (!insertion) return null

  const tr = state.tr
  let changed = false

  state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text || !textContainsEmoji(node.text)) return
    if (insertion.isInSet(node.marks)) return
    if (deletion?.isInSet(node.marks)) return

    const neighborMark = adjacentInsertionMark(state.doc.resolve(pos), insertion)
    if (!neighborMark) return

    tr.addMark(
      pos,
      pos + node.nodeSize,
      insertion.create({ ...neighborMark.attrs }),
    )
    changed = true
  })

  if (!changed) return null
  tr.setMeta(suggestChangesKey, { skip: true })
  tr.setMeta('addToHistory', false)
  return tr
}

const emojiInsertionMarksKey = new PluginKey('emojiInsertionMarks')

export const SuggestChanges = Extension.create({
  name: 'suggestChanges',

  addProseMirrorPlugins() {
    return [
      suggestChanges(),
      new Plugin({
        key: emojiInsertionMarksKey,
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((tr) => tr.docChanged)) return null
          return reconcileEmojiInsertionMarks(newState)
        },
      }),
    ]
  },

  onCreate() {
    installSuggestChanges(this.editor as Editor)
  },
})

export const SUGGESTION_MARK_NAMES = ['insertion', 'deletion', 'modification'] as const

export function suggestionExtensions() {
  return [SuggestionInsertion, SuggestionDeletion, SuggestionModification, SuggestChanges]
}

export function setSuggesting(editor: Editor, on: boolean) {
  installSuggestChanges(editor)
  const command = on ? enableSuggestChanges : disableSuggestChanges
  command(editor.state, editor.view.dispatch)
}

export function isSuggesting(editor: Editor): boolean {
  return isSuggestChangesEnabled(editor.state)
}

export function acceptSuggestion(editor: Editor, id: number) {
  applySuggestion(id)(editor.state, editor.view.dispatch)
  editor.view.focus()
}

export function rejectSuggestion(editor: Editor, id: number) {
  revertSuggestion(id)(editor.state, editor.view.dispatch)
  editor.view.focus()
}

// Stamp the current user onto every freshly created suggestion mark (those that
// don't have an author yet). Uses the `skip` meta so the dispatch decorator does
// not turn this housekeeping transaction into a new suggestion.
export function stampSuggestionAuthors(
  editor: Editor,
  userId: string,
  userName: string,
) {
  const { state } = editor
  const { schema, doc } = state
  const tr = state.tr
  const markTypes = SUGGESTION_MARK_NAMES.map((name) => schema.marks[name]).filter(
    (markType): markType is NonNullable<typeof markType> => Boolean(markType),
  )
  let changed = false

  doc.descendants((node, pos) => {
    node.marks.forEach((mark) => {
      if (markTypes.includes(mark.type) && mark.attrs.userId == null) {
        tr.addMark(
          pos,
          pos + node.nodeSize,
          mark.type.create({
            ...mark.attrs,
            userId,
            userName,
            createdAt: mark.attrs.createdAt ?? new Date().toISOString(),
          }),
        )
        changed = true
      }
    })
  })

  if (changed) {
    tr.setMeta(suggestChangesKey, { skip: true })
    tr.setMeta('addToHistory', false)
    editor.view.dispatch(tr)
  }
}

// Count distinct open suggestions (by id) in a ProseMirror JSON document.
export function countOpenSuggestionsInJson(docJson: unknown): number {
  const ids = new Set<number | string>()
  walkMarks(docJson, (mark) => {
    if (
      mark &&
      typeof mark === 'object' &&
      SUGGESTION_MARK_NAMES.includes((mark as { type?: string }).type as never)
    ) {
      const id = (mark as { attrs?: { id?: number | string } }).attrs?.id
      if (id != null) ids.add(id)
    }
  })
  return ids.size
}

function walkMarks(node: unknown, visit: (mark: unknown) => void) {
  if (!node || typeof node !== 'object') return
  const record = node as { marks?: unknown[]; content?: unknown[] }
  if (Array.isArray(record.marks)) record.marks.forEach(visit)
  if (Array.isArray(record.content)) {
    record.content.forEach((child) => walkMarks(child, visit))
  }
}

// Produce the resolved motion text: bake-in accepted suggestions (already applied
// in the live doc) and drop every still-open suggestion. Runs on a detached state
// so the visible editor is untouched.
export function resolveCleanHtml(editor: Editor): string {
  const { schema } = editor
  let state = EditorState.create({
    schema,
    doc: editor.state.doc,
    plugins: [suggestChanges()],
  })
  revertSuggestions(state, (tr: Transaction) => {
    state = state.apply(tr)
  })
  const serializer = DOMSerializer.fromSchema(schema)
  const fragment = serializer.serializeFragment(state.doc.content)
  const container = document.createElement('div')
  container.appendChild(fragment)
  return container.innerHTML
}
