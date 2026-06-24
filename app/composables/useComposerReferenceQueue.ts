import type { ReferenceDraft } from '~/utils/references'

/** Cross-component queue for adding a reference to the debate composer. */
export function useComposerReferenceQueue() {
  const pendingReference = useState<ReferenceDraft | null>(
    'composer-pending-reference',
    () => null,
  )
  const focusDebate = useState<boolean>('composer-focus-debate', () => false)

  function queueReference(ref: ReferenceDraft, options?: { focusDebate?: boolean }) {
    pendingReference.value = ref
    if (options?.focusDebate) {
      focusDebate.value = true
    }
  }

  function consumePendingReference(): ReferenceDraft | null {
    const ref = pendingReference.value
    pendingReference.value = null
    return ref
  }

  function clearFocusDebate() {
    focusDebate.value = false
  }

  return {
    pendingReference,
    focusDebate,
    queueReference,
    consumePendingReference,
    clearFocusDebate,
  }
}
