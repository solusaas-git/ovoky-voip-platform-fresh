import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/db'
import User from '@/models/User'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function GET(request: NextRequest) {
  try {
    // Get the NextAuth session
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.email) {
      return NextResponse.redirect(new URL('/login?error=oauth_error', request.url))
    }

    await connectToDatabase()
    
    // Find the user in our database
    const user = await User.findOne({ email: session.user.email })
    
    if (!user) {
      return NextResponse.redirect(new URL('/login?error=user_not_found', request.url))
    }

    // Create our own JWT token for compatibility with existing auth system
    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' })

    // Create redirect response and set our auth cookie
    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Google sign-in token conversion error:', error)
    return NextResponse.redirect(new URL('/login?error=oauth_error', request.url))
  }
}

export async function POST(request: NextRequest) {
  // This route is no longer used
  return NextResponse.json(
    { error: 'This route is no longer used' },
    { status: 404 }
  )
} 