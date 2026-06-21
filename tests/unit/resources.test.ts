import { describe, expect, it } from 'vitest'
import {
  extensionFromResourceUrl,
  extensionFromTitle,
  resourceDisplayTitle,
  resourceFileExtension,
  resourceTitleExtension,
} from '../../app/utils/resources'

describe('resources utils', () => {
  it('parses extension from upload URLs', () => {
    expect(extensionFromResourceUrl('/uploads/550e8400-e29b-41d4-a716-446655440000.pdf')).toBe('pdf')
    expect(extensionFromResourceUrl('/uploads/file.PDF?download=1')).toBe('pdf')
  })

  it('returns null for links without extension', () => {
    expect(extensionFromResourceUrl('https://example.com/page')).toBeNull()
  })

  it('parses extension from titles', () => {
    expect(extensionFromTitle('Ein PDF.pdf')).toBe('pdf')
    expect(extensionFromTitle('No extension')).toBeNull()
  })

  it('resolves file extension from URL or title', () => {
    expect(resourceFileExtension('Ein PDF', '/uploads/x.pdf', 'file')).toBe('pdf')
    expect(resourceFileExtension('Ein PDF.pdf', '/uploads/x', 'file')).toBe('pdf')
    expect(resourceFileExtension('Example', 'https://example.com', 'link')).toBeNull()
  })

  it('strips trailing extension from display title', () => {
    expect(resourceDisplayTitle('Ein PDF.pdf', 'pdf')).toBe('Ein PDF')
    expect(resourceDisplayTitle('Ein PDF', 'pdf')).toBe('Ein PDF')
  })

  it('appends extension only for files when title lacks it (legacy helper)', () => {
    expect(resourceTitleExtension('Ein PDF', '/uploads/x.pdf', 'file')).toBe('pdf')
    expect(resourceTitleExtension('Ein PDF.pdf', '/uploads/x.pdf', 'file')).toBeNull()
    expect(resourceTitleExtension('Example', 'https://example.com', 'link')).toBeNull()
  })
})
