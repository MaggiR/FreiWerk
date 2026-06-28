import { sanitizeAuthRedirectPath } from '#shared/authRedirect'

export type AuthModalMode = 'login' | 'register'

export function useAuthModal() {
  const isOpen = useState('auth-modal-open', () => false)
  const mode = useState<AuthModalMode>('auth-modal-mode', () => 'login')
  const redirectPath = useState<string | null>('auth-modal-redirect', () => null)

  function open(authMode: AuthModalMode = 'login', redirect?: string | null) {
    mode.value = authMode
    const route = useRoute()
    const fallback = sanitizeAuthRedirectPath(route.fullPath) ?? route.path
    redirectPath.value =
      redirect !== undefined
        ? sanitizeAuthRedirectPath(redirect) ?? fallback
        : fallback
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
    redirectPath.value = null
  }

  function switchMode(authMode: AuthModalMode) {
    mode.value = authMode
  }

  return { isOpen, mode, redirectPath, open, close, switchMode }
}
