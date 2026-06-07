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
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title'],
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
