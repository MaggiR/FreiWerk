<script setup lang="ts">
import type { EditorOptions, JSONContent } from '@tiptap/core'
import { useEditor, EditorContent, type Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Attachment, normalizeAttachmentLabel } from '~/editor/attachmentExtension'
import { Video } from '~/editor/videoExtension'
import type { SuggestionItem } from '#shared/types'
import {
  suggestionExtensions,
  setSuggesting,
  acceptSuggestion as acceptSuggestionCmd,
  rejectSuggestion as rejectSuggestionCmd,
  stampSuggestionAuthors,
  resolveCleanHtml,
} from '~/editor/suggestions'
import { handleUndoRedoKeyDown } from '~/editor/undoRedoKeydown'
import { handleEmojiPickerBeforeInput } from '~/editor/emojiPickerInput'

const SUGGESTION_MARK_SELECTOR =
  'ins[data-id], del[data-id], [data-type="modification"][data-id]'

/** Configures the Google-Docs-style suggestion layer; null = plain HTML editor. */
interface SuggestionConfig {
  mode: 'propose' | 'review' | 'view' | 'edit'
  userId: string
  userName: string
}

const model = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    placeholder?: string
    initialContent?: string
    suggestion?: SuggestionConfig | null
    docJson?: JSONContent | null
    /** Metadata for open suggestions, used for inline review popovers. */
    reviewItems?: SuggestionItem[]
    /** Strip chrome (border, padding) to match inline RichText rendering. */
    embedded?: boolean
    /** Compact messenger composer: minimal chrome, toolbar only on text selection. */
    variant?: 'default' | 'chat'
  }>(),
  {
    placeholder: 'Schreibe deinen Text. Empfohlen: Motivation, Forderung, Begründung.',
    initialContent: '',
    suggestion: null,
    docJson: null,
    reviewItems: () => [],
    embedded: false,
    variant: 'default',
  },
)

const emit = defineEmits<{
  'update:doc': [JSONContent]
  'review-accept': [id: number]
  'review-reject': [id: number]
}>()

const isSuggesting = computed(() => props.suggestion != null)
const isReadOnly = computed(() => props.suggestion?.mode === 'view')
const isReviewMode = computed(() => props.suggestion?.mode === 'review')
const isEditMode = computed(() => props.suggestion?.mode === 'edit')
const isViewMode = computed(() => props.suggestion?.mode === 'view')
const isChatVariant = computed(() => props.variant === 'chat')
const hasTextSelection = ref(false)
const chatToolbarPos = ref<{ top: number; left: number } | null>(null)
const canManageSuggestions = computed(() => isReviewMode.value || isEditMode.value)
const isSuggestionHoverMode = computed(
  () =>
    props.reviewItems.length > 0 &&
    (isReviewMode.value || isViewMode.value || isEditMode.value),
)

const reviewItemsById = computed(
  () => new Map(props.reviewItems.map((item) => [item.id, item])),
)

const reviewPopover = ref<{
  item: SuggestionItem
  top: number
  left: number
} | null>(null)
const reviewPopoverRef = ref<HTMLElement | null>(null)
let hoveredMark: HTMLElement | null = null
let hidePopoverTimer: ReturnType<typeof setTimeout> | null = null

function updateChatToolbarPosition(ed: Editor) {
  if (!isChatVariant.value) return
  const { from, to } = ed.state.selection
  if (from === to) {
    chatToolbarPos.value = null
    return
  }
  const { view } = ed
  const start = view.coordsAtPos(from)
  const end = view.coordsAtPos(to)
  chatToolbarPos.value = {
    top: Math.min(start.top, end.top) - 44,
    left: (start.left + end.right) / 2,
  }
}
function parseSuggestionId(element: HTMLElement): number | null {
  const raw = element.dataset.id
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'number' ? parsed : null
  } catch {
    const fallback = Number(raw)
    return Number.isFinite(fallback) ? fallback : null
  }
}

function findSuggestionMark(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null
  const mark = target.closest(SUGGESTION_MARK_SELECTOR)
  return mark instanceof HTMLElement ? mark : null
}

function clearHoveredMark() {
  if (hoveredMark) {
    hoveredMark.classList.remove('is-suggestion-hover')
    hoveredMark = null
  }
}

function cancelHidePopover() {
  if (hidePopoverTimer) {
    clearTimeout(hidePopoverTimer)
    hidePopoverTimer = null
  }
}

function scheduleHidePopover() {
  cancelHidePopover()
  hidePopoverTimer = setTimeout(() => {
    reviewPopover.value = null
    clearHoveredMark()
  }, 120)
}

function showReviewPopover(mark: HTMLElement) {
  const id = parseSuggestionId(mark)
  if (id == null) return
  const item = reviewItemsById.value.get(id)
  if (!item) return

  cancelHidePopover()
  clearHoveredMark()
  hoveredMark = mark
  mark.classList.add('is-suggestion-hover')

  const rect = mark.getBoundingClientRect()
  reviewPopover.value = {
    item,
    top: rect.bottom + 8,
    left: rect.left,
  }

  nextTick(() => {
    const pop = reviewPopoverRef.value
    if (!pop || !reviewPopover.value) return
    const margin = 8
    const { width, height } = pop.getBoundingClientRect()
    let top = reviewPopover.value.top
    let left = reviewPopover.value.left
    if (left + width > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - width - margin)
    }
    if (top + height > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - height - 8)
    }
    reviewPopover.value = { ...reviewPopover.value, top, left }
  })
}

function onReviewMouseOver(event: MouseEvent) {
  if (!isSuggestionHoverMode.value) return
  const mark = findSuggestionMark(event.target)
  if (!mark) return
  showReviewPopover(mark)
}

function onReviewMouseOut(event: MouseEvent) {
  if (!isSuggestionHoverMode.value) return
  const related = event.relatedTarget
  if (related instanceof Node) {
    if (reviewPopoverRef.value?.contains(related)) return
    if (findSuggestionMark(related)) return
  }
  scheduleHidePopover()
}

function onPopoverMouseEnter() {
  cancelHidePopover()
}

function onPopoverMouseLeave() {
  scheduleHidePopover()
}

function onReviewAccept(id: number) {
  reviewPopover.value = null
  clearHoveredMark()
  emit('review-accept', id)
}

function onReviewReject(id: number) {
  reviewPopover.value = null
  clearHoveredMark()
  emit('review-reject', id)
}

watch(isSuggestionHoverMode, (active) => {
  if (!active) {
    cancelHidePopover()
    reviewPopover.value = null
    clearHoveredMark()
  }
})

watch(
  () => props.reviewItems,
  () => {
    if (
      reviewPopover.value &&
      !reviewItemsById.value.has(reviewPopover.value.item.id)
    ) {
      reviewPopover.value = null
      clearHoveredMark()
    }
  },
  { deep: true },
)

const fileInput = ref<HTMLInputElement | null>(null)
const uploadError = ref('')
const uploading = ref(false)
const initializedContent = ref(false)

function desiredContent() {
  if (!isSuggesting.value) return model.value
  return props.docJson ?? props.initialContent
}

function syncEditorState(ed: Editor) {
  const content = desiredContent()

  if (!initializedContent.value && content) {
    setSuggesting(ed, false)
    ed.commands.setContent(content, false)
    initializedContent.value = true
  }

  ed.setEditable(
    !isSuggesting.value ||
      props.suggestion?.mode === 'propose' ||
      props.suggestion?.mode === 'edit',
  )
  setSuggesting(ed, props.suggestion?.mode === 'propose')
  ed.view.dom.classList.toggle(
    'editor-surface--suggestion-hover',
    props.reviewItems.length > 0 &&
      (props.suggestion?.mode === 'review' || props.suggestion?.mode === 'view'),
  )
}

const editor = useEditor({
  content: '',
  editable: false,
  // TipTap SSR: defer first render until client mount (not yet in EditorOptions types).
  immediatelyRender: false,
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Underline,
    Link.configure({ openOnClick: false, autolink: true }),
    Image,
    Video,
    Attachment,
    Placeholder.configure({ placeholder: props.placeholder }),
    ...(isSuggesting.value ? suggestionExtensions() : []),
  ],
  editorProps: {
    attributes: { class: 'rich-text editor-surface', lang: 'de' },
    handleKeyDown: handleUndoRedoKeyDown,
    handleDOMEvents: {
      beforeinput: (view, event) =>
        handleEmojiPickerBeforeInput(view, event as InputEvent),
    },
  },
  onCreate: ({ editor: ed }) => {
    syncEditorState(ed as Editor)
  },
  onUpdate: ({ editor: ed }) => {
    const mode = props.suggestion?.mode
    if (mode === 'propose' || mode === 'edit' || isSuggesting.value) {
      emit('update:doc', ed.getJSON())
      return
    }
    model.value = ed.getHTML()
  },
  onSelectionUpdate: ({ editor: ed }) => {
    if (!isChatVariant.value) return
    const { from, to } = ed.state.selection
    hasTextSelection.value = from !== to
    if (from !== to) {
      updateChatToolbarPosition(ed as Editor)
    } else {
      chatToolbarPos.value = null
    }
  },
} as Partial<EditorOptions> & { immediatelyRender?: boolean })

watch(
  [
    editor,
    () => props.suggestion?.mode,
    () => props.docJson,
    () => props.initialContent,
    () => props.reviewItems.length,
  ],
  ([ed]) => {
    if (!ed) return
    syncEditorState(ed)
  },
  { immediate: true },
)

watch(model, (value) => {
  if (isSuggesting.value) return
  if (editor.value && value !== editor.value.getHTML()) {
    setSuggesting(editor.value, false)
    editor.value.commands.setContent(value, false)
    initializedContent.value = true
  }
})

// Suggestion editors are mounted with HTML fallback when no working doc exists yet.
// Ensure initial body text is applied once the client-side editor instance exists.
watch(
  () => editor.value,
  (ed) => {
    if (!ed || !isSuggesting.value || ed.getText().trim().length > 0) return
    const content = props.docJson ?? model.value
    if (!content) return
    ed.commands.setContent(content, false)
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})

defineExpose({
  getEditor: () => editor.value ?? null,
  getJSON: () => editor.value?.getJSON() ?? null,
  getCleanHtml: () => (editor.value ? resolveCleanHtml(editor.value) : ''),
  acceptSuggestion: (id: number) => {
    if (editor.value) acceptSuggestionCmd(editor.value, id)
  },
  rejectSuggestion: (id: number) => {
    if (editor.value) rejectSuggestionCmd(editor.value, id)
  },
  stampAuthors: () => {
    if (editor.value && props.suggestion) {
      stampSuggestionAuthors(
        editor.value,
        props.suggestion.userId,
        props.suggestion.userName,
      )
    }
  },
})

function addLink() {
  const url = window.prompt('Link-URL eingeben:')
  if (url === null) return
  if (url === '') {
    editor.value?.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  editor.value
    ?.chain()
    .focus()
    .extendMarkRange('link')
    .setLink({ href: url })
    .run()
}

function openAttachmentPicker() {
  uploadError.value = ''
  fileInput.value?.click()
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  uploadError.value = ''
  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await $fetch<{ url: string; name: string; mimeType: string }>(
      '/api/uploads',
      { method: 'POST', body: formData },
    )

    if (res.mimeType.startsWith('image/')) {
      editor.value?.chain().focus().setImage({ src: res.url, alt: res.name }).run()
    } else if (res.mimeType.startsWith('video/')) {
      editor.value?.chain().focus().setVideo({ src: res.url }).run()
    } else {
      editor.value
        ?.chain()
        .focus()
        .setAttachment({
          href: res.url,
          label: normalizeAttachmentLabel(res.name),
          mimeType: res.mimeType,
        })
        .run()
    }
  } catch (err: unknown) {
    uploadError.value = extractError(err, 'Anhang konnte nicht hochgeladen werden.')
  } finally {
    uploading.value = false
  }
}

interface ToolItem {
  id: string
  icon?: string
  label?: string
  title: string
  action: () => void
  active?: () => boolean
}

const headingTools = computed<ToolItem[]>(() => {
  const e = editor.value
  return ([1, 2, 3] as const).map((level) => ({
    id: `h${level}`,
    label: `H${level}`,
    title: `Überschrift ${level}`,
    action: () => e?.chain().focus().toggleHeading({ level }).run(),
    active: () => !!e?.isActive('heading', { level }),
  }))
})

const tools = computed<ToolItem[]>(() => {
  const e = editor.value
  return [
    {
      id: 'bold',
      icon: 'bold',
      title: 'Fett',
      action: () => e?.chain().focus().toggleBold().run(),
      active: () => !!e?.isActive('bold'),
    },
    {
      id: 'italic',
      icon: 'italic',
      title: 'Kursiv',
      action: () => e?.chain().focus().toggleItalic().run(),
      active: () => !!e?.isActive('italic'),
    },
    {
      id: 'underline',
      icon: 'underline',
      title: 'Unterstrichen',
      action: () => e?.chain().focus().toggleUnderline().run(),
      active: () => !!e?.isActive('underline'),
    },
    {
      id: 'strikethrough',
      icon: 'strikethrough',
      title: 'Durchgestrichen',
      action: () => e?.chain().focus().toggleStrike().run(),
      active: () => !!e?.isActive('strike'),
    },
    {
      id: 'list-ul',
      icon: 'list-ul',
      title: 'Aufzählung',
      action: () => e?.chain().focus().toggleBulletList().run(),
      active: () => !!e?.isActive('bulletList'),
    },
    {
      id: 'list-ol',
      icon: 'list-ol',
      title: 'Nummerierte Liste',
      action: () => e?.chain().focus().toggleOrderedList().run(),
      active: () => !!e?.isActive('orderedList'),
    },
    {
      id: 'quote-right',
      icon: 'quote-right',
      title: 'Zitat',
      action: () => e?.chain().focus().toggleBlockquote().run(),
      active: () => !!e?.isActive('blockquote'),
    },
    { id: 'link', icon: 'link', title: 'Link', action: addLink, active: () => !!e?.isActive('link') },
    // Media uploads are disabled while suggesting (text + formatting only).
    ...(isSuggesting.value
      ? []
      : [
          {
            id: 'paperclip',
            icon: 'paperclip',
            title: 'Anhang hochladen',
            action: openAttachmentPicker,
          },
        ]),
  ]
})

const historyTools = computed<ToolItem[]>(() => {
  const e = editor.value
  return [
    {
      id: 'rotate-left',
      icon: 'rotate-left',
      title: 'Rückgängig (Strg+Z)',
      action: () => e?.chain().focus().undo().run(),
    },
    {
      id: 'rotate-right',
      icon: 'rotate-right',
      title: 'Wiederholen (Strg+Y)',
      action: () => e?.chain().focus().redo().run(),
    },
  ]
})

/** Compact formatting tools for the chat floating toolbar. */
const chatFormatTools = computed<ToolItem[]>(() => {
  const e = editor.value
  return [
    {
      id: 'bold',
      icon: 'bold',
      title: 'Fett',
      action: () => e?.chain().focus().toggleBold().run(),
      active: () => !!e?.isActive('bold'),
    },
    {
      id: 'italic',
      icon: 'italic',
      title: 'Kursiv',
      action: () => e?.chain().focus().toggleItalic().run(),
      active: () => !!e?.isActive('italic'),
    },
    {
      id: 'underline',
      icon: 'underline',
      title: 'Unterstrichen',
      action: () => e?.chain().focus().toggleUnderline().run(),
      active: () => !!e?.isActive('underline'),
    },
    {
      id: 'strikethrough',
      icon: 'strikethrough',
      title: 'Durchgestrichen',
      action: () => e?.chain().focus().toggleStrike().run(),
      active: () => !!e?.isActive('strike'),
    },
  ]
})

const chatBlockTools = computed<ToolItem[]>(() => {
  const e = editor.value
  return [
    {
      id: 'list-ul',
      icon: 'list-ul',
      title: 'Aufzählung',
      action: () => e?.chain().focus().toggleBulletList().run(),
      active: () => !!e?.isActive('bulletList'),
    },
    {
      id: 'list-ol',
      icon: 'list-ol',
      title: 'Nummerierte Liste',
      action: () => e?.chain().focus().toggleOrderedList().run(),
      active: () => !!e?.isActive('orderedList'),
    },
    {
      id: 'quote-right',
      icon: 'quote-right',
      title: 'Zitat',
      action: () => e?.chain().focus().toggleBlockquote().run(),
      active: () => !!e?.isActive('blockquote'),
    },
    {
      id: 'link',
      icon: 'link',
      title: 'Link',
      action: addLink,
      active: () => !!e?.isActive('link'),
    },
  ]
})
</script>

<template>
  <div
    class="editor"
    :class="{
      'editor--embedded': embedded,
      'editor--chat': isChatVariant,
    }"
  >
    <input
      ref="fileInput"
      type="file"
      class="visually-hidden"
      accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,video/mp4,video/webm,video/quicktime"
      @change="onFileSelected"
    >

    <div
      v-if="!isReadOnly && !isReviewMode && !isChatVariant"
      class="editor__toolbar"
    >
      <div class="editor__group">
        <button
          v-for="tool in headingTools"
          :key="tool.id"
          type="button"
          class="editor__tool editor__tool--label"
          :class="{ 'is-active': tool.active?.() }"
          :title="tool.title"
          :aria-label="tool.title"
          @click="tool.action()"
        >
          {{ tool.label }}
        </button>
      </div>

      <span class="editor__divider" aria-hidden="true" />

      <div class="editor__group">
        <button
          v-for="tool in tools"
          :key="tool.id"
          type="button"
          class="editor__tool"
          :class="{ 'is-active': tool.active?.(), 'is-busy': tool.id === 'paperclip' && uploading }"
          :title="tool.title"
          :aria-label="tool.title"
          :disabled="tool.id === 'paperclip' && uploading"
          @click="tool.action()"
        >
          <FontAwesomeIcon :icon="tool.icon!" />
        </button>
      </div>

      <div class="editor__group editor__group--end">
        <span class="editor__divider" aria-hidden="true" />
        <button
          v-for="tool in historyTools"
          :key="tool.id"
          type="button"
          class="editor__tool"
          :title="tool.title"
          :aria-label="tool.title"
          @click="tool.action()"
        >
          <FontAwesomeIcon :icon="tool.icon!" />
        </button>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="chat-toolbar">
        <div
          v-if="isChatVariant && hasTextSelection && chatToolbarPos && !isReadOnly && !isReviewMode"
          class="editor__chat-toolbar"
          :style="{
            top: `${chatToolbarPos.top}px`,
            left: `${chatToolbarPos.left}px`,
          }"
          role="toolbar"
          aria-label="Textformatierung"
          @mousedown.prevent
        >
          <div class="editor__chat-group">
            <button
              v-for="tool in chatFormatTools"
              :key="tool.id"
              type="button"
              class="editor__chat-tool"
              :class="{ 'is-active': tool.active?.() }"
              :title="tool.title"
              :aria-label="tool.title"
              @click="tool.action()"
            >
              <FontAwesomeIcon :icon="tool.icon!" />
            </button>
          </div>
          <span class="editor__chat-divider" aria-hidden="true" />
          <div class="editor__chat-group">
            <button
              v-for="tool in chatBlockTools"
              :key="tool.id"
              type="button"
              class="editor__chat-tool"
              :class="{ 'is-active': tool.active?.() }"
              :title="tool.title"
              :aria-label="tool.title"
              @click="tool.action()"
            >
              <FontAwesomeIcon :icon="tool.icon!" />
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <p v-if="uploadError" class="editor__error form-error">{{ uploadError }}</p>

    <div
      class="editor__content"
      :class="{
        'editor__content--suggestion-hover': isSuggestionHoverMode,
        'editor__content--chat': isChatVariant,
      }"
      @mouseover="onReviewMouseOver"
      @mouseout="onReviewMouseOut"
    >
      <EditorContent :editor="editor" />
    </div>

    <Teleport to="body">
      <Transition name="review-popover">
        <div
          v-if="isSuggestionHoverMode && reviewPopover"
          ref="reviewPopoverRef"
          class="editor__review-popover"
          :class="{ 'editor__review-popover--info': isViewMode }"
          :style="{
            top: `${reviewPopover.top}px`,
            left: `${reviewPopover.left}px`,
          }"
          role="dialog"
          aria-label="Änderungsvorschlag"
          @mouseenter="onPopoverMouseEnter"
          @mouseleave="onPopoverMouseLeave"
        >
          <div class="editor__review-popover-head">
            <span v-if="reviewPopover.item.createdAt" class="editor__review-time">
              <FontAwesomeIcon icon="clock" />
              {{ formatDateTime(reviewPopover.item.createdAt) }}
            </span>
            <NuxtLink
              v-if="reviewPopover.item.authorId && reviewPopover.item.authorName"
              :to="`/users/${reviewPopover.item.authorId}`"
              target="_blank"
              rel="noopener noreferrer"
              class="editor__review-author"
              @click.stop
            >
              <FontAwesomeIcon icon="user" />
              {{ reviewPopover.item.authorName }}
            </NuxtLink>
            <span
              v-else-if="reviewPopover.item.authorName"
              class="editor__review-author"
            >
              <FontAwesomeIcon icon="user" />
              {{ reviewPopover.item.authorName }}
            </span>
          </div>
          <div v-if="canManageSuggestions" class="editor__review-actions">
            <button
              type="button"
              class="editor__review-btn editor__review-btn--accept"
              @click="onReviewAccept(reviewPopover.item.id)"
            >
              <FontAwesomeIcon icon="check" />
              Annehmen
            </button>
            <button
              type="button"
              class="editor__review-btn editor__review-btn--reject"
              @click="onReviewReject(reviewPopover.item.id)"
            >
              <FontAwesomeIcon icon="xmark" />
              Ablehnen
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.editor {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.editor--embedded {
  border: none;
  border-radius: 0;
  background: transparent;
  display: contents;
}

.editor--embedded .editor__content {
  padding: 0;
  min-height: 0;
  max-height: none;
  resize: none;
  overflow: visible;
  display: contents;
}

.editor--embedded .editor__content > * {
  display: block;
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.editor--embedded :deep(.editor-surface) {
  min-height: 0;
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.editor--chat {
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.editor--chat .editor__content--chat {
  padding: var(--space-1) 0;
  min-height: 1.75rem;
  max-height: 12rem;
  resize: none;
  overflow-y: auto;
  background: transparent;
}

.editor--chat :deep(.editor-surface) {
  min-height: 1.25rem;
}

.editor--chat :deep(.editor-surface p) {
  margin: 0;
}

.editor__chat-toolbar {
  position: fixed;
  z-index: 120;
  display: flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0.2rem 0.35rem;
  border-radius: var(--radius-pill);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  -webkit-backdrop-filter: blur(var(--glass-blur));
  backdrop-filter: blur(var(--glass-blur));
  box-shadow: var(--shadow-md);
  transform: translateX(-50%);
}

.editor__chat-group {
  display: inline-flex;
  align-items: center;
  gap: 0.05rem;
}

.editor__chat-divider {
  width: 1px;
  height: 1.1rem;
  margin: 0 0.1rem;
  background: color-mix(in srgb, var(--color-border) 80%, transparent);
}

.editor__chat-tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  font-size: 0.78rem;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, transform 0.12s ease;
}

.editor__chat-tool:hover {
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  color: var(--color-accent);
}

.editor__chat-tool.is-active {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
}

.chat-toolbar-enter-active,
.chat-toolbar-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s cubic-bezier(0.34, 1.3, 0.64, 1);
}

.chat-toolbar-enter-from,
.chat-toolbar-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(6px) scale(0.92);
}

@media (prefers-reduced-motion: reduce) {
  .chat-toolbar-enter-active,
  .chat-toolbar-leave-active {
    transition: opacity 0.12s ease;
  }

  .chat-toolbar-enter-from,
  .chat-toolbar-leave-to {
    transform: translateX(-50%);
  }
}

.editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg);
}

.editor__group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.editor__group--end {
  margin-left: auto;
  align-items: center;
}

.editor__divider {
  width: 1px;
  height: 28px;
  background: var(--color-border);
}

.editor__tool {
  width: 34px;
  height: 34px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  transition: background 0.15s ease;
}

.editor__tool--label {
  width: auto;
  min-width: 34px;
  padding: 0 var(--space-2);
  font-size: 0.75rem;
  font-weight: 700;
}

.editor__tool:hover:not(:disabled) {
  background: var(--color-surface);
}

.editor__tool.is-active {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
}

.editor__tool:disabled,
.editor__tool.is-busy {
  opacity: 0.55;
  cursor: wait;
}

.editor__error {
  margin: 0;
  padding: var(--space-2) var(--space-4) 0;
}

.editor__content {
  padding: var(--space-4);
  min-height: 280px;
  max-height: 80vh;
  resize: vertical;
  overflow: auto;
}

.editor__content--suggestion-hover {
  cursor: default;
}

:deep(.editor-surface) {
  outline: none;
  min-height: 220px;
  font-weight: 400;
}

:deep(.editor-surface video) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: var(--space-3) 0;
  border-radius: var(--radius-sm);
}

:deep(.editor-surface p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: var(--color-text-muted);
  font-weight: 400;
  pointer-events: none;
  height: 0;
}

/* Suggestion-mode diff marks (Google-Docs-style review layer). */
:deep(.editor-surface ins) {
  text-decoration: none;
  color: var(--mood-approve);
  background: color-mix(in srgb, var(--mood-approve) 12%, transparent);
  border-radius: 4px;
}
:deep(.editor-surface del) {
  text-decoration: line-through;
  text-decoration-color: color-mix(in srgb, var(--mood-reject) 75%, transparent);
  background: color-mix(in srgb, var(--mood-reject) 12%, transparent);
  color: color-mix(in srgb, var(--color-text) 80%, var(--mood-reject));
  border-radius: 4px;
}
:deep(.editor-surface [data-type='modification']) {
  background: color-mix(in srgb, var(--color-tertiary) 14%, transparent);
  border-radius: 4px;
}

:deep(.editor-surface .is-suggestion-hover) {
  outline: 2px solid color-mix(in srgb, var(--color-accent) 45%, transparent);
  outline-offset: 2px;
  border-radius: 4px;
}

:deep(.editor-surface--suggestion-hover ins[data-id]),
:deep(.editor-surface--suggestion-hover del[data-id]),
:deep(.editor-surface--suggestion-hover [data-type='modification'][data-id]) {
  cursor: pointer;
}
</style>

<style>
.editor__review-popover {
  position: fixed;
  z-index: 50;
  width: min(15rem, calc(100vw - 2rem));
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}

.editor__review-popover-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  margin-bottom: var(--space-2);
}

.editor__review-popover--info .editor__review-popover-head {
  margin-bottom: 0;
}

.editor__review-time,
.editor__review-author {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.editor__review-author {
  text-decoration: none;
  transition: color 0.15s ease;
}

a.editor__review-author:hover {
  color: var(--color-accent);
}

.editor__review-actions {
  display: flex;
  gap: var(--space-2);
}

.editor__review-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.editor__review-btn--accept:hover {
  border-color: var(--mood-approve);
  color: var(--mood-approve);
  background: color-mix(in srgb, var(--mood-approve) 12%, transparent);
}

.editor__review-btn--reject:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 12%, transparent);
}

.review-popover-enter-active,
.review-popover-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.review-popover-enter-from,
.review-popover-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .review-popover-enter-active,
  .review-popover-leave-active {
    transition: opacity 0.12s ease;
  }

  .review-popover-enter-from,
  .review-popover-leave-to {
    transform: none;
  }
}
</style>
