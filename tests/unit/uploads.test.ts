import { describe, it, expect } from 'vitest'
import {
  UPLOAD_MAX_BYTES,
  extensionForMime,
  isAllowedUploadMime,
  sanitizeOriginalFilename,
} from '../../server/utils/uploads'

describe('upload helpers', () => {
  it('allows supported mime types', () => {
    expect(isAllowedUploadMime('image/png')).toBe(true)
    expect(isAllowedUploadMime('application/pdf')).toBe(true)
    expect(isAllowedUploadMime('application/exe')).toBe(false)
  })

  it('maps mime types to file extensions', () => {
    expect(extensionForMime('image/jpeg')).toBe('.jpg')
    expect(extensionForMime('application/pdf')).toBe('.pdf')
  })

  it('sanitizes original filenames', () => {
    expect(sanitizeOriginalFilename('../secret.pdf')).toBe('secret.pdf')
    expect(sanitizeOriginalFilename('')).toBe('anhang')
  })

  it('defines a 5 MB upload limit', () => {
    expect(UPLOAD_MAX_BYTES).toBe(5 * 1024 * 1024)
  })
})
