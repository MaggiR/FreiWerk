import type { ReferenceTargetType } from '~/utils/references'

export interface DeliberationNavTarget {
  targetType: ReferenceTargetType
  targetId: string
}

export function useDeliberationNav() {
  const pending = useState<DeliberationNavTarget | null>('deliberation-nav-target', () => null)

  function navigateTo(target: DeliberationNavTarget) {
    pending.value = { ...target }
  }

  function clearPending() {
    pending.value = null
  }

  return { pending, navigateTo, clearPending }
}
