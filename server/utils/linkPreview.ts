import { lookup } from 'node:dns/promises'
import type { LinkPreview } from '#shared/linkPreview'
import { normalizeLinkUrl } from '#shared/linkPreview'

const FETCH_TIMEOUT_MS = 8_000
const MAX_HTML_BYTES = 512_000
const MAX_TITLE_LEN = 200
const MAX_DESC_LEN = 500
const MAX_SITE_LEN = 80
const USER_AGENT = 'FreiWerk/1.0 (+https://freiwerk.local; link-preview)'

const previewRateLimits = new Map<string, number[]>()

export function consumeLinkPreviewRateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
): boolean {
  const now = Date.now()
  const hits = (previewRateLimits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) return false
  hits.push(now)
  previewRateLimits.set(key, hits)
  return true
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  if (!host || host === 'localhost') return true
  if (host.endsWith('.local') || host.endsWith('.internal')) return true
  if (host === '0.0.0.0') return true

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const parts = host.split('.').map(Number)
    if (parts.some((p) => p > 255)) return true
    if (parts[0] === 127) return true
    if (parts[0] === 10) return true
    if (parts[0] === 192 && parts[1] === 168) return true
    if (parts[0] === 169 && parts[1] === 254) return true
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
    if (parts[0] === 0) return true
  }

  if (host.includes(':')) {
    const lower = host.toLowerCase()
    if (lower === '::1' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) {
      return true
    }
  }

  return false
}

function isPrivateIpAddress(address: string): boolean {
  if (address.includes(':')) {
    const lower = address.toLowerCase()
    return lower === '::1' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')
  }
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some((p) => !Number.isFinite(p) || p > 255)) return true
  if (parts[0] === 127 || parts[0] === 10 || parts[0] === 0) return true
  if (parts[0] === 192 && parts[1] === 168) return true
  if (parts[0] === 169 && parts[1] === 254) return true
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
  return false
}

export async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  const normalized = normalizeLinkUrl(rawUrl)
  if (!normalized) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige URL.' })
  }
  const parsed = new URL(normalized)
  if (isBlockedHostname(parsed.hostname)) {
    throw createError({ statusCode: 400, statusMessage: 'URL nicht erlaubt.' })
  }
  const records = await lookup(parsed.hostname, { all: true })
  if (records.length === 0 || records.some((r) => isPrivateIpAddress(r.address))) {
    throw createError({ statusCode: 400, statusMessage: 'URL nicht erlaubt.' })
  }
  return parsed
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, '\'')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function truncate(value: string, max: number): string {
  const trimmed = value.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
}

function readMetaContent(
  html: string,
  key: string,
  attr: 'property' | 'name',
): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${key}["']`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return decodeHtmlEntities(match[1].trim())
  }
  return null
}

function readTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : null
}

function resolveMaybeRelativeUrl(base: URL, value: string | null): string | null {
  if (!value) return null
  try {
    return new URL(value, base).href
  } catch {
    return null
  }
}

export function parseLinkPreviewFromHtml(pageUrl: URL, html: string): LinkPreview {
  const title =
    readMetaContent(html, 'og:title', 'property')
    ?? readMetaContent(html, 'twitter:title', 'name')
    ?? readTitleTag(html)

  const description =
    readMetaContent(html, 'og:description', 'property')
    ?? readMetaContent(html, 'description', 'name')
    ?? readMetaContent(html, 'twitter:description', 'name')

  const imageRaw =
    readMetaContent(html, 'og:image', 'property')
    ?? readMetaContent(html, 'twitter:image', 'name')

  const siteName =
    readMetaContent(html, 'og:site_name', 'property')
    ?? pageUrl.hostname.replace(/^www\./, '')

  const imageUrl = resolveMaybeRelativeUrl(pageUrl, imageRaw)

  return {
    url: pageUrl.href,
    title: title ? truncate(title, MAX_TITLE_LEN) : null,
    description: description ? truncate(description, MAX_DESC_LEN) : null,
    imageUrl,
    siteName: siteName ? truncate(siteName, MAX_SITE_LEN) : pageUrl.hostname,
  }
}

async function fetchHtml(url: URL): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url.href, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': USER_AGENT,
      },
    })
    if (!response.ok) {
      throw createError({ statusCode: 502, statusMessage: 'Seite konnte nicht geladen werden.' })
    }
    const reader = response.body?.getReader()
    if (!reader) return ''
    const chunks: Uint8Array[] = []
    let total = 0
    while (total < MAX_HTML_BYTES) {
      const { done, value } = await reader.read()
      if (done || !value) break
      chunks.push(value)
      total += value.length
    }
    reader.cancel().catch(() => {})
    const merged = new Uint8Array(Math.min(total, MAX_HTML_BYTES))
    let offset = 0
    for (const chunk of chunks) {
      const slice = chunk.subarray(0, merged.length - offset)
      merged.set(slice, offset)
      offset += slice.length
      if (offset >= merged.length) break
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(merged)
  } finally {
    clearTimeout(timer)
  }
}

async function validateImageUrl(imageUrl: string, pageUrl: URL): Promise<string | null> {
  const resolved = normalizeLinkUrl(imageUrl) ?? resolveMaybeRelativeUrl(pageUrl, imageUrl)
  if (!resolved) return null
  try {
    await assertPublicHttpUrl(resolved)
    return resolved
  } catch {
    return null
  }
}

export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreview> {
  const pageUrl = await assertPublicHttpUrl(rawUrl)
  const html = await fetchHtml(pageUrl)
  const preview = parseLinkPreviewFromHtml(pageUrl, html)
  if (preview.imageUrl) {
    preview.imageUrl = await validateImageUrl(preview.imageUrl, pageUrl)
  }
  return preview
}

export function buildLinkPreviewHtml(preview: LinkPreview): string {
  const href = escapeHtml(preview.url)
  const site = preview.siteName ? escapeHtml(preview.siteName) : ''
  const title = preview.title ? escapeHtml(preview.title) : ''
  const description = preview.description ? escapeHtml(preview.description) : ''
  const image = preview.imageUrl ? escapeHtml(preview.imageUrl) : ''

  const imageBlock = image
    ? `<img class="link-preview__image" src="${image}" alt="">`
    : ''

  const titleBlock = title ? `<span class="link-preview__title">${title}</span>` : ''
  const descBlock = description
    ? `<span class="link-preview__description">${description}</span>`
    : ''

  return (
    `<div class="link-preview" data-link-preview="">`
    + `<a href="${href}" class="link-preview__link" target="_blank" rel="noopener noreferrer nofollow">`
    + imageBlock
    + `<div class="link-preview__content">`
    + (site ? `<span class="link-preview__site">${site}</span>` : '')
    + titleBlock
    + descBlock
    + `</div></a></div>`
  )
}
