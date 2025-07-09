import { NextRequest, NextResponse } from 'next/server';
import { EmailVerificationService } from '@/services/EmailVerificationService';
import User from '@/models/User';
import { connectToDatabase } from '@/lib/db';
import { SippyCredentials } from '@/lib/sippyClient';
import { initializeUserDefaults } from '@/lib/userSetup';
import { sendAdminUserRegistrationNotification } from '@/lib/adminNotifications';

interface SippyCredentialsStore {
  [userId: string]: SippyCredentials;
}

// In-memory store for Sippy credentials
// In a production app, these would be encrypted and stored in a database
const sippyCredentialsStore: SippyCredentialsStore = {};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, sippyAccountId, sippyCredentials } = body;

    // Validate required fields (sippyAccountId is now optional - will be assigned by admin)
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isEmailVerified) {
        return NextResponse.json(
          { message: 'User already exists with verified email. Please login instead.' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { 
            message: 'Registration in progress. Please check your email for verification code.',
            requiresVerification: true,
            email: existingUser.email
          },
          { status: 200 }
        );
      }
    }

    // Create user data object
    const userData: {
      name: string;
      email: string;
      password: string;
      isEmailVerified: boolean;
      creationMethod: string;
      sippyAccountId?: number;
    } = {
      name,
      email,
      password,
      isEmailVerified: false, // Explicitly set to false
      creationMethod: 'signup', // User registered via signup form
    };

    // Only add sippyAccountId if provided (for backwards compatibility)
    if (sippyAccountId) {
      userData.sippyAccountId = sippyAccountId;
    }

    // Create the user (unverified)
    const user = await User.create(userData);
    const userId = user._id.toString();

    // Store Sippy credentials in memory if provided
    if (sippyCredentials) {
      sippyCredentialsStore[userId] = sippyCredentials;
    }

    // Initialize default preferences for the new user
    try {
      await initializeUserDefaults(userId, 'user');
      console.log(`✅ Default preferences initialized for new user: ${email}`);
    } catch (prefError) {
      // Log the error but don't fail registration
      console.error('❌ Failed to initialize default preferences for new user:', prefError);
    }

    // Send verification email
    try {
      const verificationService = EmailVerificationService.getInstance();
      await verificationService.sendVerificationEmail(email, name);
      
      // Send admin notification about new user registration
      try {
        await sendAdminUserRegistrationNotification({
          user: {
            name,
            email,
            registrationDate: new Date().toLocaleString(),
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
          }
        });
      } catch (adminNotificationError) {
        // Log error but don't fail registration
        console.error('Failed to send admin registration notification:', adminNotificationError);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Registration successful! Please check your email for a verification code.',
        requiresVerification: true,
        email: email,
        userId: userId
      });
    } catch (emailError) {
      // If email sending fails, we still want to indicate successful registration
      // but with a different message
      return NextResponse.json({
        success: true,
        message: 'Registration successful! However, we encountered an issue sending the verification email. Please contact support.',
        requiresVerification: true,
        email: email,
        userId: userId,
        emailError: true
      });
    }

  } catch (error) {
    // Handle specific validation errors
    if (error instanceof Error) {
      if (error.message.includes('duplicate key') || error.message.includes('E11000')) {
        return NextResponse.json(
          { message: 'User with this email already exists' },
          { status: 400 }
        );
      }
      if (error.message.includes('validation failed')) {
        return NextResponse.json(
          { message: 'Please check your input and try again' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Registration failed' },
      { status: 400 }
    );
  }
} 