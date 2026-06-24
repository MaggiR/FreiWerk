import type { ReferenceTargetType } from '~/utils/references'

export const DELIBERATION_HIGHLIGHT_CLASS = 'deliberation-target--highlight'
export const DELIBERATION_HIGHLIGHT_MS = 2000

export type DeliberationMainTab = 'arguments' | 'questions' | 'resources'

const DELIBERATION_TAB_BY_TYPE: Partial<Record<ReferenceTargetType, DeliberationMainTab>> = {
  argument: 'arguments',
  question: 'questions',
  answer: 'questions',
  resource: 'resources',
}

export function isDeliberationReferenceType(
  targetType: ReferenceTargetType,
): targetType is keyof typeof DELIBERATION_TAB_BY_TYPE {
  return targetType in DELIBERATION_TAB_BY_TYPE
}

export function deliberationTabFor(targetType: ReferenceTargetType): DeliberationMainTab | null {
  return DELIBERATION_TAB_BY_TYPE[targetType] ?? null
}

export function deliberationSelector(targetType: ReferenceTargetType, targetId: string): string {
  return `[data-deliberation-type="${targetType}"][data-deliberation-id="${targetId}"]`
}

/** Scroll to a deliberation element and replay the highlight pulse. */
export function scrollToDeliberationTarget(
  targetType: ReferenceTargetType,
  targetId: string,
): boolean {
  const target = document.querySelector<HTMLElement>(
    deliberationSelector(targetType, targetId),
  )
  if (!target) return false

  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  target.classList.remove(DELIBERATION_HIGHLIGHT_CLASS)
  void target.offsetWidth
  target.classList.add(DELIBERATION_HIGHLIGHT_CLASS)
  window.setTimeout(
    () => target.classList.remove(DELIBERATION_HIGHLIGHT_CLASS),
    DELIBERATION_HIGHLIGHT_MS,
  )
  return true
}
