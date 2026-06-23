const DRAG_THRESHOLD_PX = 4

/** Mouse drag-to-scroll for horizontal overflow rows (same rules as MotionCarousel). */
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
