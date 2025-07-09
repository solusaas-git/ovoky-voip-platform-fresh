import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import User from '@/models/User'
import { connectToDatabase } from './db'
import { initializeUserDefaults } from './userSetup'
import { sendAdminUserRegistrationNotification } from './adminNotifications'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login', // This will be bypassed when using signIn('google')
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        await connectToDatabase()
        
        if (account?.provider === 'google') {
          // Check if user already exists in our User collection
          let existingUser = await User.findOne({ email: user.email })
          
          if (!existingUser) {
            // Create new user with Google data
            const userData = {
              name: user.name || profile?.name || 'Google User',
              email: user.email!,
              password: '', // No password for OAuth users
              isEmailVerified: true, // Google users are pre-verified
              creationMethod: 'google' as const,
              googleId: account.providerAccountId,
              avatar: user.image || undefined,
            }
            
            existingUser = await User.create(userData)
            
            // Initialize default preferences for the new user
            try {
              await initializeUserDefaults(existingUser._id.toString(), 'user')
            } catch (prefError) {
              console.error('❌ Failed to initialize default preferences for Google user:', prefError)
            }
            
            // Send admin notification about new user registration
            try {
              await sendAdminUserRegistrationNotification({
                user: {
                  name: userData.name,
                  email: userData.email,
                  registrationDate: new Date().toLocaleString(),
                  ipAddress: undefined // IP address not available in OAuth flow
                }
              })
            } catch (adminNotificationError) {
              console.error('Failed to send admin registration notification:', adminNotificationError)
            }
          } else {
            // Update existing user with Google data if needed
            if (!existingUser.googleId) {
              existingUser.googleId = account.providerAccountId
              existingUser.avatar = user.image || undefined
              existingUser.isEmailVerified = true
              await existingUser.save()
            }
          }
        }
        
        return true
      } catch (error) {
        console.error('Error in signIn callback:', error)
        return false
      }
    },
    
    async session({ session, token }) {
      try {
        await connectToDatabase()
        
        if (session.user?.email) {
          const user = await User.findOne({ email: session.user.email })
          if (user) {
            session.user.id = user._id.toString()
            session.user.role = user.role
            session.user.sippyAccountId = user.sippyAccountId
            session.user.isEmailVerified = user.isEmailVerified
            session.user.isSuspended = user.isSuspended
            session.user.suspendedAt = user.suspendedAt
            session.user.suspensionReason = user.suspensionReason
            session.user.suspendedBy = user.suspendedBy
          }
        }
        
        return session
      } catch (error) {
        console.error('Error in session callback:', error)
        return session
      }
    },
    
    async jwt({ token, user, account }) {
      if (account && user) {
        token.accessToken = account.access_token
      }
      return token
    },
    
    async redirect({ url, baseUrl }) {
      // After successful Google OAuth, redirect to our token conversion handler
      if (url.startsWith(baseUrl)) {
        return `${baseUrl}/api/auth/google-signin`
      }
      return `${baseUrl}/api/auth/google-signin`
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
} 