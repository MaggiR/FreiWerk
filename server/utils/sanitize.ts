import sanitizeHtml from 'sanitize-html'

// Allow-list tailored to the TipTap editor feature set used in the MVP.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'strike',
    'h1',
    'h2',
    'h3',
    'blockquote',
    'ul',
    'ol',
    'li',
    'a',
    'code',
    'pre',
    'hr',
    'img',
    'video',
    'span',
    'div',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel', 'class', 'data-attachment', 'data-label', 'data-mime'],
    img: ['src', 'alt', 'title', 'class'],
    video: ['src', 'controls', 'preload'],
    span: ['class', 'aria-hidden'],
    div: ['class', 'data-attachment', 'data-link-preview'],
  },
  allowedClasses: {
    a: ['attachment-chip', 'attachment-chip__link', 'link-preview__link'],
    span: [
      'attachment-chip__icon',
      'attachment-chip__label',
      'link-preview__site',
      'link-preview__title',
      'link-preview__description',
    ],
    div: ['attachment-chip-wrapper', 'attachment-chip', 'link-preview', 'link-preview__content'],
    img: ['link-preview__image'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  // Images may also use data/blob URIs (pasted/embedded media in MVP).
  allowedSchemesByTag: {
    img: ['http', 'https', 'data', 'blob'],
  },
  transformTags: {
    // Force safe link attributes on all anchors.
    a: sanitizeHtml.simpleTransform('a', {
      rel: 'noopener noreferrer nofollow',
      target: '_blank',
    }),
  },
}

/**
 * Sanitize untrusted HTML (TipTap editor output) before persisting/rendering.
 * Always call this server-side; never trust client-provided HTML.
 */
export function sanitizeRichText(dirty: string): string {
  return sanitizeHtml(dirty, OPTIONS)
}

/**
 * Produce a plain-text excerpt from rich HTML (e.g. for previews/search).
 */
export function htmlToText(html: string, maxLength = 280): string {
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}\u2026` : text
}
