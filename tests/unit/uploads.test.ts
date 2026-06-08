import { describe, it, expect } from 'vitest'
import {
  UPLOAD_MAX_BYTES,
  extensionForMime,
  isAllowedUploadMime,
  sanitizeOriginalFilename,
  isValidUploadUrl,
} from '../../server/utils/uploads'

describe('upload helpers', () => {
  it('allows supported mime types', () => {
    expect(isAllowedUploadMime('image/png')).toBe(true)
    expect(isAllowedUploadMime('application/pdf')).toBe(true)
    expect(isAllowedUploadMime('video/mp4')).toBe(true)
    expect(isAllowedUploadMime('video/webm')).toBe(true)
    expect(isAllowedUploadMime('application/exe')).toBe(false)
  })

  it('maps mime types to file extensions', () => {
    expect(extensionForMime('image/jpeg')).toBe('.jpg')
    expect(extensionForMime('application/pdf')).toBe('.pdf')
    expect(extensionForMime('video/mp4')).toBe('.mp4')
    expect(extensionForMime('video/quicktime')).toBe('.mov')
  })

  it('sanitizes original filenames', () => {
    expect(sanitizeOriginalFilename('../secret.pdf')).toBe('secret.pdf')
    expect(sanitizeOriginalFilename('')).toBe('anhang')
  })

  it('defines a 5 MB upload limit', () => {
    expect(UPLOAD_MAX_BYTES).toBe(5 * 1024 * 1024)
  })

  it('validates upload URLs for profile avatars', () => {
    expect(isValidUploadUrl('/uploads/550e8400-e29b-41d4-a716-446655440000.jpg')).toBe(
      true,
    )
    expect(isValidUploadUrl('https://evil.example/x.jpg')).toBe(false)
  })
})
