/** Ensures only one debate message context menu is open at a time. */
export function useDebateMessageMenu() {
  const activePostId = useState<string | null>('debate-message-menu-id', () => null)

  function openMenu(postId: string) {
    activePostId.value = postId
  }

  function closeMenu(postId?: string) {
    if (postId === undefined || activePostId.value === postId) {
      activePostId.value = null
    }
  }

  function isMenuOpen(postId: string): boolean {
    return activePostId.value === postId
  }

  return { activePostId, openMenu, closeMenu, isMenuOpen }
}
