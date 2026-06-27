/** Viewport width at or below this value is treated as phone (tab bar navigation). */
export const PHONE_MAX_WIDTH = 767

/** Sidebar is visible at this viewport width and above. */
export const SIDEBAR_MIN_WIDTH = 768

/** Minimum content-area width (viewport minus sidebar inset) for the motion split layout. */
export const CONTENT_SPLIT_MIN_WIDTH = 1024

export function readSidebarInsetPx(): number {
  if (!import.meta.client || window.innerWidth < SIDEBAR_MIN_WIDTH) return 0
  const shell = document.querySelector('.app-shell')
  if (!shell) return 0
  const raw = getComputedStyle(shell).getPropertyValue('--sidebar-inset').trim()
  if (!raw) return 0
  return parseFloat(raw) || 0
}

export function contentAreaWidth(): number {
  if (!import.meta.client) return 0
  return window.innerWidth - readSidebarInsetPx()
}

export function isContentSplitWide(): boolean {
  return contentAreaWidth() >= CONTENT_SPLIT_MIN_WIDTH
}

export function isPhoneViewport(): boolean {
  return window.innerWidth <= PHONE_MAX_WIDTH
}
