export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024

export const UPLOAD_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
] as const

export type UploadMimeType = (typeof UPLOAD_ALLOWED_MIME_TYPES)[number]

const MIME_EXTENSIONS: Record<UploadMimeType, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
}

export function isAllowedUploadMime(mime: string): mime is UploadMimeType {
  return (UPLOAD_ALLOWED_MIME_TYPES as readonly string[]).includes(mime)
}

export function extensionForMime(mime: UploadMimeType): string {
  return MIME_EXTENSIONS[mime]
}

export function sanitizeOriginalFilename(name: string): string {
  const base = name.replace(/[/\\]/g, '').replace(/\.\./g, '').trim()
  return base.length > 0 ? base.slice(0, 120) : 'anhang'
}
