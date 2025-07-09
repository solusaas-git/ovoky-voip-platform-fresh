import { NextRequest, NextResponse } from 'next/server';
import { EmailVerificationService } from '@/services/EmailVerificationService';
import User from '@/models/User';
import { connectToDatabase } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user already exists and is verified
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isEmailVerified) {
        return NextResponse.json(
          { message: 'Email already verified. Please proceed to login.' },
          { status: 400 }
        );
      }
      // User exists but not verified, allow resending verification
    }

    // Use provided name or fetch from database
    let userName = name;
    if (!userName && existingUser) {
      userName = existingUser.name;
    }
    if (!userName) {
      userName = 'User'; // Fallback if no name available
    }

    // Send verification email
    const verificationService = EmailVerificationService.getInstance();
    await verificationService.sendVerificationEmail(email, userName);

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email address'
    });

  } catch (error) {
    console.error('Error sending verification email:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('SMTP not configured')) {
        return NextResponse.json(
          { message: 'Email service is not configured. Please contact support.' },
          { status: 503 }
        );
      }
      if (error.message.includes('wait a moment')) {
        return NextResponse.json(
          { message: error.message },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Failed to send verification email. Please try again.' },
      { status: 500 }
    );
  }
} 