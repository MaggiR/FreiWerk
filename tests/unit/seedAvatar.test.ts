import { describe, it, expect } from 'vitest'
import {
  encodePng,
  renderSeedAvatarPixels,
  seedAvatarId,
  seedAvatarHue,
} from '../../server/utils/seedAvatar'

describe('seedAvatar', () => {
  it('creates stable avatar ids per email', () => {
    expect(seedAvatarId('demo@freiwerk.local')).toBe(
      seedAvatarId('demo@freiwerk.local'),
    )
    expect(seedAvatarId('demo@freiwerk.local')).not.toBe(
      seedAvatarId('admin@freiwerk.local'),
    )
  })

  it('encodes a valid PNG image', () => {
    const pixels = renderSeedAvatarPixels(seedAvatarHue(0))
    const png = encodePng(256, 256, pixels)
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect(png.length).toBeGreaterThan(80)
  })
})
