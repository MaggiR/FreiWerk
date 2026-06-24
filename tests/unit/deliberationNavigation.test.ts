import { describe, it, expect } from 'vitest'
import {
  deliberationTabFor,
  isDeliberationReferenceType,
} from '../../app/utils/deliberationNavigation'

describe('deliberationTabFor', () => {
  it('maps deliberation reference types to main tabs', () => {
    expect(deliberationTabFor('argument')).toBe('arguments')
    expect(deliberationTabFor('question')).toBe('questions')
    expect(deliberationTabFor('answer')).toBe('questions')
    expect(deliberationTabFor('resource')).toBe('resources')
  })

  it('returns null for non-deliberation types', () => {
    expect(deliberationTabFor('post')).toBeNull()
    expect(deliberationTabFor('motion_excerpt')).toBeNull()
  })
})

describe('isDeliberationReferenceType', () => {
  it('recognizes deliberation element references', () => {
    expect(isDeliberationReferenceType('argument')).toBe(true)
    expect(isDeliberationReferenceType('post')).toBe(false)
  })
})
