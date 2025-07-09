import { NextRequest, NextResponse } from 'next/server';
import { sendPasswordResetEmail } from '@/lib/passwordResetService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { 
          error: 'Validation error',
          message: 'Email is required',
          code: 'MISSING_EMAIL'
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
          code: 'INVALID_EMAIL_FORMAT'
        },
        { status: 400 }
      );
    }

    // Send password reset email
    const result = await sendPasswordResetEmail(email.toLowerCase().trim());

    return NextResponse.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to process password reset request';
    
    return NextResponse.json(
      { 
        error: 'Server error',
        message: errorMessage,
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
} 