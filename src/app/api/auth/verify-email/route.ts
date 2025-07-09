import { NextRequest, NextResponse } from 'next/server';
import { EmailVerificationService } from '@/services/EmailVerificationService';
import User from '@/models/User';
import { connectToDatabase } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otpCode } = body;

    // Validate required fields
    if (!email || !otpCode) {
      return NextResponse.json(
        { message: 'Email and verification code are required' },
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

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otpCode)) {
      return NextResponse.json(
        { message: 'Verification code must be 6 digits' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { message: 'User not found. Please complete registration first.' },
        { status: 404 }
      );
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return NextResponse.json(
        { message: 'Email already verified. Please proceed to login.' },
        { status: 400 }
      );
    }

    // Verify OTP
    const verificationService = EmailVerificationService.getInstance();
    const verificationResult = await verificationService.verifyOTP(email, otpCode);

    if (!verificationResult.isValid) {
      return NextResponse.json(
        { message: verificationResult.message },
        { status: 400 }
      );
    }

    // Update user verification status
    user.isEmailVerified = true;
    user.emailVerifiedAt = new Date();
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! You can now log in to your account.'
    });

  } catch (error) {
    console.error('Error verifying email:', error);
    return NextResponse.json(
      { message: 'Failed to verify email. Please try again.' },
      { status: 500 }
    );
  }
} 