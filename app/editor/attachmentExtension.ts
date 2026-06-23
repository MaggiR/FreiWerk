import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import AttachmentChip from '~/components/editor/AttachmentChip.vue'

export const ATTACHMENT_LABEL_MAX = 100

export function normalizeAttachmentLabel(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return 'Anhang'
  return trimmed.slice(0, ATTACHMENT_LABEL_MAX)
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    attachment: {
      setAttachment: (attrs: {
        href: string
        label: string
        mimeType?: string | null
      }) => ReturnType
    }
  }
}

export const Attachment = Node.create({
  name: 'attachment',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      href: { default: null },
      label: { default: 'Anhang' },
      mimeType: { default: null },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-attachment]',
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false
          const link = element.querySelector('a[href]')
          if (!(link instanceof HTMLAnchorElement)) return false
          return {
            href: link.getAttribute('href'),
            label:
              link.getAttribute('data-label')
              || link.querySelector('.attachment-chip__label')?.textContent
              || link.textContent
              || 'Anhang',
            mimeType: link.getAttribute('data-mime'),
          }
        },
      },
      {
        tag: 'a[data-attachment]',
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false
          return {
            href: element.getAttribute('href'),
            label:
              element.getAttribute('data-label')
              || element.querySelector('.attachment-chip__label')?.textContent
              || element.textContent
              || 'Anhang',
            mimeType: element.getAttribute('data-mime'),
          }
        },
      },
      {
        tag: 'a[href^="/uploads/"]',
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false
          if (element.hasAttribute('data-attachment')) return false
          const text = element.textContent?.trim() ?? ''
          if (!text.startsWith('Anhang:')) return false
          return {
            href: element.getAttribute('href'),
            label: normalizeAttachmentLabel(text.replace(/^Anhang:\s*/, '')),
            mimeType: null,
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const label = normalizeAttachmentLabel(String(HTMLAttributes.label ?? 'Anhang'))
    const href = HTMLAttributes.href
    const mimeType = HTMLAttributes.mimeType ?? undefined
    return [
      'div',
      { class: 'attachment-chip-wrapper' },
      [
        'div',
        { class: 'attachment-chip', 'data-attachment': '' },
        [
          'a',
          mergeAttributes(HTMLAttributes, {
            href,
            'data-label': label,
            'data-mime': mimeType,
            class: 'attachment-chip__link',
            target: '_blank',
            rel: 'noopener noreferrer nofollow',
          }),
          ['span', { class: 'attachment-chip__icon', 'aria-hidden': 'true' }],
          ['span', { class: 'attachment-chip__label' }, label],
        ],
      ],
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(AttachmentChip)
  },

  addCommands() {
    return {
      setAttachment:
        (attrs) =>
          ({ commands }) =>
            commands.insertContent({
              type: this.name,
              attrs: {
                href: attrs.href,
                label: normalizeAttachmentLabel(attrs.label),
                mimeType: attrs.mimeType ?? null,
              },
            }),
    }
  },
})
