<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'

const model = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{ placeholder?: string }>(),
  { placeholder: 'Schreibe deinen Text. Empfohlen: Motivation, Forderung, Begründung.' },
)

const editor = useEditor({
  content: model.value,
  immediatelyRender: false,
  extensions: [
    StarterKit,
    Underline,
    Link.configure({ openOnClick: false, autolink: true }),
    Image,
    Placeholder.configure({ placeholder: props.placeholder }),
  ],
  editorProps: {
    attributes: { class: 'rich-text editor-surface' },
  },
  onUpdate: ({ editor: ed }) => {
    model.value = ed.getHTML()
  },
})

// Sync external value changes (e.g. when an existing draft loads).
watch(model, (value) => {
  if (editor.value && value !== editor.value.getHTML()) {
    editor.value.commands.setContent(value, false)
  }
})

onBeforeUnmount(() => {
  editor.value?.destroy()
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

function addImage() {
  const url = window.prompt('Bild-URL eingeben:')
  if (url) editor.value?.chain().focus().setImage({ src: url }).run()
}

interface ToolItem {
  icon: string
  title: string
  action: () => void
  active?: () => boolean
}

const tools = computed<ToolItem[]>(() => {
  const e = editor.value
  return [
    {
      icon: 'heading',
      title: 'Überschrift',
      action: () => e?.chain().focus().toggleHeading({ level: 2 }).run(),
      active: () => !!e?.isActive('heading', { level: 2 }),
    },
    {
      icon: 'bold',
      title: 'Fett',
      action: () => e?.chain().focus().toggleBold().run(),
      active: () => !!e?.isActive('bold'),
    },
    {
      icon: 'italic',
      title: 'Kursiv',
      action: () => e?.chain().focus().toggleItalic().run(),
      active: () => !!e?.isActive('italic'),
    },
    {
      icon: 'underline',
      title: 'Unterstrichen',
      action: () => e?.chain().focus().toggleUnderline().run(),
      active: () => !!e?.isActive('underline'),
    },
    {
      icon: 'strikethrough',
      title: 'Durchgestrichen',
      action: () => e?.chain().focus().toggleStrike().run(),
      active: () => !!e?.isActive('strike'),
    },
    {
      icon: 'list-ul',
      title: 'Aufzählung',
      action: () => e?.chain().focus().toggleBulletList().run(),
      active: () => !!e?.isActive('bulletList'),
    },
    {
      icon: 'list-ol',
      title: 'Nummerierte Liste',
      action: () => e?.chain().focus().toggleOrderedList().run(),
      active: () => !!e?.isActive('orderedList'),
    },
    {
      icon: 'quote-right',
      title: 'Zitat',
      action: () => e?.chain().focus().toggleBlockquote().run(),
      active: () => !!e?.isActive('blockquote'),
    },
    { icon: 'link', title: 'Link', action: addLink, active: () => !!e?.isActive('link') },
    { icon: 'up-right-from-square', title: 'Bild einfügen', action: addImage },
    {
      icon: 'rotate-left',
      title: 'Rückgängig',
      action: () => e?.chain().focus().undo().run(),
    },
    {
      icon: 'rotate-right',
      title: 'Wiederholen',
      action: () => e?.chain().focus().redo().run(),
    },
  ]
})
</script>

<template>
  <div class="editor">
    <div class="editor__toolbar">
      <button
        v-for="tool in tools"
        :key="tool.icon"
        type="button"
        class="editor__tool"
        :class="{ 'is-active': tool.active?.() }"
        :title="tool.title"
        :aria-label="tool.title"
        @click="tool.action()"
      >
        <FontAwesomeIcon :icon="tool.icon" />
      </button>
    </div>
    <EditorContent :editor="editor" class="editor__content" />
  </div>
</template>

<style scoped>
.editor {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-surface);
}
.editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  padding: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg);
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
.editor__tool:hover {
  background: var(--color-surface);
}
.editor__tool.is-active {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
}
.editor__content {
  padding: var(--space-4);
  min-height: 280px;
}
:deep(.editor-surface) {
  outline: none;
  min-height: 250px;
  font-weight: 400;
}
:deep(.editor-surface p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: var(--color-text-muted);
  font-weight: 400;
  pointer-events: none;
  height: 0;
}
</style>
