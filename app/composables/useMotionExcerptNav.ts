export interface MotionExcerptNavTarget {
  motionId: string
  excerptText: string
}

export function useMotionExcerptNav() {
  const pending = useState<MotionExcerptNavTarget | null>('motion-excerpt-nav-target', () => null)

  function navigateTo(target: MotionExcerptNavTarget) {
    pending.value = {
      motionId: target.motionId,
      excerptText: target.excerptText.trim(),
    }
  }

  function clearPending() {
    pending.value = null
  }

  return { pending, navigateTo, clearPending }
}
