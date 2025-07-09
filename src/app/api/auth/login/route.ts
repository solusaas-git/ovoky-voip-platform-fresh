import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/authService';
import { SippyCredentials } from '@/lib/sippyClient';

interface SippyCredentialsStore {
  [userId: string]: SippyCredentials;
}

// In-memory store for Sippy credentials
// In a production app, these would be encrypted and stored in a database
const sippyCredentialsStore: SippyCredentialsStore = {};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, sippyCredentials } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          message: 'Email and password are required',
          code: 'MISSING_CREDENTIALS'
        },
        { status: 400 }
      );
    }



    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          message: 'Please enter a valid email address',
          code: 'INVALID_EMAIL'
        },
        { status: 400 }
      );
    }

    // Login the user
    const { user, token } = await loginUser({ email, password });

    // Store Sippy credentials in memory if provided
    if (sippyCredentials) {
      sippyCredentialsStore[user.id] = sippyCredentials;
    }

    // Create response with user data
    const response = NextResponse.json({
      user,
      sippyCredentials: sippyCredentialsStore[user.id],
    });

    // Set HTTP-only cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    
    // Handle specific error cases
    if (errorMessage.includes('Invalid credentials')) {
      return NextResponse.json(
        { 
          error: 'Authentication failed',
          message: 'Invalid email or password. Please check your credentials and try again.',
          code: 'INVALID_CREDENTIALS'
        },
        { status: 401 }
      );
    } else if (errorMessage.includes('Email not verified')) {
      return NextResponse.json(
        { 
          error: 'Email verification required',
          message: 'Please verify your email address before logging in. Check your email for the verification code.',
          code: 'EMAIL_NOT_VERIFIED'
        },
        { status: 403 }
      );
    } else if (errorMessage.includes('User not found')) {
      return NextResponse.json(
        { 
          error: 'Authentication failed',
          message: 'No account found with this email address. Please check your email or create a new account.',
          code: 'USER_NOT_FOUND'
        },
        { status: 401 }
      );
    } else {
      // Generic server error
      return NextResponse.json(
        { 
          error: 'Server error',
          message: 'An unexpected error occurred. Please try again later.',
          code: 'INTERNAL_ERROR'
        },
        { status: 500 }
      );
    }
  }
} 