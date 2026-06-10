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
import {
  suggestionExtensions,
  setSuggesting,
  acceptSuggestion as acceptSuggestionCmd,
  rejectSuggestion as rejectSuggestionCmd,
  stampSuggestionAuthors,
  resolveCleanHtml,
} from '~/editor/suggestions'

/** Configures the Google-Docs-style suggestion layer; null = plain HTML editor. */
interface SuggestionConfig {
  mode: 'propose' | 'review' | 'view'
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
  }>(),
  {
    placeholder: 'Schreibe deinen Text. Empfohlen: Motivation, Forderung, Begründung.',
    initialContent: '',
    suggestion: null,
    docJson: null,
  },
)

const emit = defineEmits<{ 'update:doc': [JSONContent] }>()

const isSuggesting = computed(() => props.suggestion != null)
const isReadOnly = computed(() => props.suggestion?.mode === 'view')

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

  ed.setEditable(!isReadOnly.value)
  setSuggesting(ed, props.suggestion?.mode === 'propose')
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
    attributes: { class: 'rich-text editor-surface' },
  },
  onCreate: ({ editor: ed }) => {
    syncEditorState(ed as Editor)
  },
  onUpdate: ({ editor: ed }) => {
    if (isSuggesting.value) {
      emit('update:doc', ed.getJSON())
    } else {
      model.value = ed.getHTML()
    }
  },
} as Partial<EditorOptions> & { immediatelyRender?: boolean })

watch(
  [editor, () => props.suggestion?.mode, () => props.docJson, () => props.initialContent],
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
      title: 'Rückgängig',
      action: () => e?.chain().focus().undo().run(),
    },
    {
      id: 'rotate-right',
      icon: 'rotate-right',
      title: 'Wiederholen',
      action: () => e?.chain().focus().redo().run(),
    },
  ]
})
</script>

<template>
  <div class="editor">
    <input
      ref="fileInput"
      type="file"
      class="visually-hidden"
      accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,video/mp4,video/webm,video/quicktime"
      @change="onFileSelected"
    >

    <div v-if="!isReadOnly" class="editor__toolbar">
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

    <p v-if="uploadError" class="editor__error form-error">{{ uploadError }}</p>

    <EditorContent :editor="editor" class="editor__content" />
  </div>
</template>

<style scoped>
.editor {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
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
  background: color-mix(in srgb, #0a9f5e 18%, transparent);
  box-shadow: inset 0 -2px 0 #0a9f5e;
  border-radius: 2px;
}
:deep(.editor-surface del) {
  text-decoration: line-through;
  color: #d91e36;
  background: color-mix(in srgb, #d91e36 12%, transparent);
  border-radius: 2px;
}
:deep(.editor-surface [data-type='modification']) {
  background: color-mix(in srgb, var(--color-accent) 18%, transparent);
  border-radius: 2px;
}
</style>
