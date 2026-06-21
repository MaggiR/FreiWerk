const EXT_PATTERN = /^[a-z0-9]{1,8}$/

function parseExtension(segment: string): string | null {
  const dot = segment.lastIndexOf('.')
  if (dot <= 0 || dot === segment.length - 1) return null
  const ext = segment.slice(dot + 1).toLowerCase()
  return EXT_PATTERN.test(ext) ? ext : null
}

/** Lowercase extension without dot parsed from an upload/file URL, or null. */
export function extensionFromResourceUrl(url: string): string | null {
  const path = url.split(/[?#]/)[0] ?? ''
  const filename = path.split('/').pop() ?? ''
  return parseExtension(filename)
}

/** Lowercase extension without dot parsed from a resource title, or null. */
export function extensionFromTitle(title: string): string | null {
  return parseExtension(title.trim())
}

/** File extension for display (URL first, then title). Null for links. */
export function resourceFileExtension(
  title: string,
  url: string,
  kind: 'link' | 'file',
): string | null {
  if (kind !== 'file') return null
  return extensionFromResourceUrl(url) ?? extensionFromTitle(title)
}

/** Title without a trailing extension when the extension is shown separately. */
export function resourceDisplayTitle(title: string, ext: string | null): string {
  if (!ext) return title
  const suffix = `.${ext}`
  if (title.toLowerCase().endsWith(suffix.toLowerCase())) {
    return title.slice(0, -suffix.length)
  }
  return title
}

export function resourceTitleExtension(
  title: string,
  url: string,
  kind: 'link' | 'file',
): string | null {
  if (kind !== 'file') return null
  const ext = extensionFromResourceUrl(url)
  if (!ext) return null
  if (title.toLowerCase().endsWith(`.${ext}`)) return null
  return ext
}
