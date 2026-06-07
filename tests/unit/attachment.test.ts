import { describe, it, expect } from 'vitest'
import {
  ATTACHMENT_LABEL_MAX,
  normalizeAttachmentLabel,
} from '../../app/editor/attachmentExtension'
import { sanitizeRichText } from '../../server/utils/sanitize'

describe('normalizeAttachmentLabel', () => {
  it('trims and truncates labels to 100 characters', () => {
    expect(normalizeAttachmentLabel('  Mein Dokument  ')).toBe('Mein Dokument')
    expect(normalizeAttachmentLabel('x'.repeat(120)).length).toBe(ATTACHMENT_LABEL_MAX)
  })

  it('falls back to a default label', () => {
    expect(normalizeAttachmentLabel('   ')).toBe('Anhang')
  })
})

describe('sanitizeRichText attachment chips', () => {
  it('keeps attachment chip markup', () => {
    const clean = sanitizeRichText(
      '<a href="/uploads/file.pdf" class="attachment-chip" data-attachment data-label="Studie" data-mime="application/pdf" target="_blank" rel="noopener noreferrer nofollow"><span class="attachment-chip__icon" aria-hidden="true"></span><span class="attachment-chip__label">Studie</span></a>',
    )
    expect(clean).toContain('class="attachment-chip"')
    expect(clean).toContain('data-label="Studie"')
    expect(clean).toContain('attachment-chip__label')
  })
})
