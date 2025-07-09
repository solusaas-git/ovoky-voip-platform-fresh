import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
      sippyAccountId?: number
      isEmailVerified: boolean
      isSuspended?: boolean
      suspendedAt?: Date
      suspensionReason?: string
      suspendedBy?: string
    }
  }

  interface User {
    id: string
    role: string
    sippyAccountId?: number
    isEmailVerified: boolean
    isSuspended?: boolean
    suspendedAt?: Date
    suspensionReason?: string
    suspendedBy?: string
  }
} 