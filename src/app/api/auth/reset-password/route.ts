import { NextRequest, NextResponse } from 'next/server';
import { verifyPasswordResetToken, resetPasswordWithToken } from '@/lib/passwordResetService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    // Validate required fields
    if (!token || !password) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          message: 'Token and password are required',
          code: 'MISSING_FIELDS'
        },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          message: 'Password must be at least 8 characters long',
          code: 'WEAK_PASSWORD'
        },
        { status: 400 }
      );
    }

    // Reset password
    const result = await resetPasswordWithToken(token, password);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Reset failed',
          message: result.message,
          code: 'RESET_FAILED'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Reset password error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
    
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

// Verify token endpoint (GET)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          message: 'Token is required',
          code: 'MISSING_TOKEN'
        },
        { status: 400 }
      );
    }

    // Verify token
    const result = await verifyPasswordResetToken(token);

    if (!result.valid) {
      return NextResponse.json(
        { 
          valid: false,
          message: result.message,
          code: 'INVALID_TOKEN'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      message: result.message,
      user: result.user
    });

  } catch (error) {
    console.error('Token verification error:', error);
    
    return NextResponse.json(
      { 
        valid: false,
        message: 'Error verifying token',
        code: 'VERIFICATION_ERROR'
      },
      { status: 500 }
    );
  }
} 