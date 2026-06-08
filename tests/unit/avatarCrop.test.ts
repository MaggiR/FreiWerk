import { describe, it, expect } from 'vitest'
import { clampOffset, containScale, coverScale } from '../../app/utils/avatarCrop'

describe('avatarCrop helpers', () => {
  it('computes cover scale for portrait and landscape images', () => {
    expect(coverScale(400, 800, 280)).toBeCloseTo(0.7)
    expect(coverScale(1200, 600, 280)).toBeCloseTo(280 / 600)
  })

  it('computes contain scale as the maximum zoom-out level', () => {
    expect(containScale(400, 800, 280)).toBeCloseTo(0.35)
    expect(containScale(1200, 600, 280)).toBeCloseTo(280 / 1200)
    expect(containScale(400, 800, 280)).toBeLessThan(coverScale(400, 800, 280))
  })

  it('clamps offsets so the crop stays within image bounds', () => {
    const clamped = clampOffset(400, -400, 800, 800, 1, 280)
    expect(clamped.offsetX).toBe(260)
    expect(clamped.offsetY).toBe(-260)
  })
})
