import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { AccountActivationService } from '@/services/AccountActivationService';
import { initializeUserDefaults } from '@/lib/userSetup';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify the user is authenticated and is an admin
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { sippyAccountId } = await request.json();

    if (!sippyAccountId || typeof sippyAccountId !== 'number') {
      return NextResponse.json(
        { error: 'Valid sippyAccountId is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const { id } = await params;

    // Find and update the user
    const user = await User.findByIdAndUpdate(
      id,
      {
        sippyAccountId,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Initialize default preferences for the activated user
    try {
      const userRole = user.role === 'admin' ? 'admin' : 'user';
      await initializeUserDefaults(user._id.toString(), userRole);
      console.log(`✅ Default preferences initialized for activated user: ${user.email} (role: ${userRole})`);
    } catch (prefError) {
      // Log the error but don't fail activation
      console.error('❌ Failed to initialize default preferences for activated user:', prefError);
    }

    // Send activation email
    try {
      const activationService = AccountActivationService.getInstance();
      await activationService.sendActivationEmail(
        user.email,
        user.name,
        sippyAccountId
      );
      
      console.log(`Account activated and email sent for user ${user.email}`);
      
      return NextResponse.json({
        success: true,
        message: 'Account activated and notification email sent',
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          sippyAccountId: user.sippyAccountId,
          isEmailVerified: user.isEmailVerified
        }
      });
    } catch (emailError) {
      console.error('Failed to send activation email:', emailError);
      
      // Account was activated but email failed
      return NextResponse.json({
        success: true,
        message: 'Account activated successfully, but failed to send notification email',
        emailError: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          sippyAccountId: user.sippyAccountId,
          isEmailVerified: user.isEmailVerified
        }
      });
    }

  } catch (error) {
    console.error('Error activating user account:', error);
    return NextResponse.json(
      { error: 'Failed to activate account' },
      { status: 500 }
    );
  }
} 