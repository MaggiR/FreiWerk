const DRAG_THRESHOLD_PX = 4

/** Mouse drag-to-scroll and horizontal wheel for horizontal overflow rows. */
export function useHorizontalDragScroll(options?: {
  onScroll?: () => void
  onDragEnd?: (el: HTMLElement) => void
}) {
  const scrollEl = ref<HTMLElement | null>(null)
  const isDragging = ref(false)

  let dragStartX = 0
  let dragStartScroll = 0
  let hasDragged = false
  let activePointerId: number | null = null

  function onWheel(event: WheelEvent) {
    const el = scrollEl.value
    if (!el) return

    const absX = Math.abs(event.deltaX)
    const absY = Math.abs(event.deltaY)
    const horizontalIntent = absX > absY || event.shiftKey
    if (!horizontalIntent) return

    const delta = event.shiftKey && absX <= absY ? event.deltaY : event.deltaX
    if (delta === 0) return

    const maxScroll = el.scrollWidth - el.clientWidth
    if (maxScroll <= 1) return

    const next = el.scrollLeft + delta
    const clamped = Math.max(0, Math.min(maxScroll, next))
    if (clamped === el.scrollLeft) return

    event.preventDefault()
    el.scrollLeft = clamped
    options?.onScroll?.()
  }

  watchEffect((onCleanup) => {
    const el = scrollEl.value
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    onCleanup(() => el.removeEventListener('wheel', onWheel))
  })

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    const el = scrollEl.value
    if (!el) return
    activePointerId = event.pointerId
    hasDragged = false
    dragStartX = event.clientX
    dragStartScroll = el.scrollLeft
  }

  function onPointerMove(event: PointerEvent) {
    if (activePointerId !== event.pointerId) return
    const el = scrollEl.value
    if (!el) return
    const delta = event.clientX - dragStartX
    if (!isDragging.value) {
      if (Math.abs(delta) <= DRAG_THRESHOLD_PX) return
      isDragging.value = true
      hasDragged = true
      el.setPointerCapture(event.pointerId)
    }
    el.scrollLeft = dragStartScroll - delta
    options?.onScroll?.()
  }

  function onPointerUp(event: PointerEvent) {
    if (activePointerId !== event.pointerId) return
    const el = scrollEl.value
    if (isDragging.value) {
      el?.releasePointerCapture(event.pointerId)
      if (el) options?.onDragEnd?.(el)
    }
    isDragging.value = false
    activePointerId = null
    options?.onScroll?.()
  }

  function onClickCapture(event: MouseEvent) {
    if (hasDragged) {
      event.preventDefault()
      event.stopPropagation()
    }
    hasDragged = false
  }

  return {
    scrollEl,
    isDragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onClickCapture,
  }
}
