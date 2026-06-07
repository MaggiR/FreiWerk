// Augment nuxt-auth-utils session typing with our user shape.
import type { UserRole } from '../server/database/schema'

declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    displayName: string
    role: UserRole
  }

  interface UserSession {
    loggedInAt?: string
  }
}

export {}
