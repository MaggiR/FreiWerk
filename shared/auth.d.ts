// Augment nuxt-auth-utils session typing with our user shape.
import type { UserRole } from '../server/database/schema'

declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    displayName: string
    role: UserRole
    avatarUrl: string | null
    // True until the member completes the initial profile setup (Stammdaten).
    needsOnboarding: boolean
  }

  interface UserSession {
    loggedInAt?: string
  }
}

export {}
