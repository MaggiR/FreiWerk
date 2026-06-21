export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024

export const UPLOAD_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const

export type UploadMimeType = (typeof UPLOAD_ALLOWED_MIME_TYPES)[number]

const MIME_EXTENSIONS: Record<UploadMimeType, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
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

const UPLOAD_URL_PATTERN =
  /^\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpe?g|png|gif|webp)$/i

/** Validates URLs returned by the upload endpoint (prevents arbitrary external links). */
export function isValidUploadUrl(url: string): boolean {
  return UPLOAD_URL_PATTERN.test(url)
}

// Like UPLOAD_URL_PATTERN but for any allowed upload type (images, PDFs, videos),
// used for resource file attachments rather than image-only avatars.
const UPLOAD_FILE_URL_PATTERN =
  /^\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpe?g|png|gif|webp|pdf|mp4|webm|mov)$/i

/** Validates an uploaded file URL of any allowed upload type. */
export function isValidUploadFileUrl(url: string): boolean {
  return UPLOAD_FILE_URL_PATTERN.test(url)
}
