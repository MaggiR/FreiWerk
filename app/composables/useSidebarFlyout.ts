interface FlyoutPosition {
  top: number
  left: number
}

const FLYOUT_GAP_PX = 6
const CLOSE_DELAY_MS = 120

/** Positions a sidebar submenu in a body teleported panel (escapes rail overflow clipping). */
export function useSidebarFlyout(align: 'top' | 'bottom' = 'top') {
  const open = ref(false)
  const pos = ref<FlyoutPosition>({ top: 0, left: 0 })
  const triggerRef = ref<HTMLElement | null>(null)
  const panelRef = ref<HTMLElement | null>(null)
  let closeTimer: ReturnType<typeof setTimeout> | null = null

  function clearCloseTimer() {
    if (closeTimer) {
      clearTimeout(closeTimer)
      closeTimer = null
    }
  }

  function updatePosition() {
    const root = triggerRef.value
    if (!root) return

    const trigger = root.querySelector<HTMLElement>('.appnav__item--head') ?? root
    const rect = trigger.getBoundingClientRect()
    let top = rect.top
    if (align === 'bottom') {
      const panelHeight = panelRef.value?.offsetHeight ?? 0
      top = panelHeight > 0 ? rect.bottom - panelHeight : rect.bottom
    }

    pos.value = {
      top,
      left: rect.right + FLYOUT_GAP_PX,
    }
  }

  function show() {
    if (import.meta.client && !window.matchMedia('(min-width: 768px)').matches) return
    clearCloseTimer()
    updatePosition()
    open.value = true
    nextTick(() => {
      updatePosition()
    })
  }

  function hide() {
    clearCloseTimer()
    open.value = false
  }

  function scheduleHide() {
    clearCloseTimer()
    closeTimer = setTimeout(hide, CLOSE_DELAY_MS)
  }

  function onTriggerEnter() {
    show()
  }

  function onTriggerLeave() {
    scheduleHide()
  }

  function onPanelEnter() {
    clearCloseTimer()
    open.value = true
  }

  function onPanelLeave() {
    scheduleHide()
  }

  if (import.meta.client) {
    onMounted(() => {
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
    })

    onUnmounted(() => {
      clearCloseTimer()
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    })
  }

  watch(open, (visible) => {
    if (visible) nextTick(updatePosition)
  })

  return {
    open,
    pos,
    triggerRef,
    panelRef,
    show,
    hide,
    reposition: updatePosition,
    onTriggerEnter,
    onTriggerLeave,
    onPanelEnter,
    onPanelLeave,
  }
}
