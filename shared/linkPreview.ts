export interface LinkPreview {
  url: string
  title: string | null
  description: string | null
  imageUrl: string | null
  siteName: string | null
}

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi

/** Strip trailing punctuation often typed after URLs. */
export function normalizeLinkUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/[.,;:!?)}\]]+$/, '')
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    if (parsed.username || parsed.password) return null
    return parsed.href
  } catch {
    return null
  }
}

/** First external http(s) URL in rich text (ignores upload paths). */
export function extractFirstLinkUrl(html: string): string | null {
  const plain = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
  const matches = plain.match(URL_RE)
  if (!matches) return null
  for (const match of matches) {
    const url = normalizeLinkUrl(match)
    if (!url) continue
    if (url.includes('/uploads/')) continue
    return url
  }
  return null
}

export function bodyContainsUrl(bodyHtml: string, url: string): boolean {
  const target = normalizeLinkUrl(url)
  if (!target) return false
  const targetKey = target.replace(/\/$/, '')
  const plain = bodyHtml.replace(/<[^>]*>/g, ' ')
  const matches = plain.match(URL_RE) ?? []
  return matches.some((match) => {
    const normalized = normalizeLinkUrl(match)
    if (!normalized) return false
    return normalized.replace(/\/$/, '') === targetKey
  })
}
