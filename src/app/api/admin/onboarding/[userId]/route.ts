import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import UserOnboardingModel from '@/models/UserOnboarding';
import User, { UserRole } from '@/models/User';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    // Check if user is admin
    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { userId } = await params;

    // Get user info
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get onboarding data
    const onboarding = await UserOnboardingModel.findOne({ userId });

    // Return user info with onboarding data (or null if it doesn't exist)
    return NextResponse.json({ 
      success: true, 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        sippyAccountId: user.sippyAccountId,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt
      },
      onboarding: onboarding || null
    });
  } catch (error) {
    console.error('Error fetching user onboarding data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch onboarding data' 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    // Check if user is admin
    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { userId } = await params;
    const data = await request.json();

    // Check if this is a review-only update (only contains approved, adminNotes, reviewedBy, reviewedAt)
    const isReviewOnlyUpdate = Object.keys(data).every(key => 
      ['approved', 'adminNotes'].includes(key)
    );

    if (isReviewOnlyUpdate) {
      // For review-only updates, find existing onboarding or return error if none exists
      const existingOnboarding = await UserOnboardingModel.findOne({ userId });
      
      if (!existingOnboarding) {
        return NextResponse.json({ 
          error: 'No onboarding data found to review' 
        }, { status: 404 });
      }

      // Update only the review fields
      const updatedOnboarding = await UserOnboardingModel.findOneAndUpdate(
        { userId },
        {
          approved: data.approved,
          adminNotes: data.adminNotes,
          reviewedBy: currentUser.id,
          reviewedAt: new Date(),
        },
        { 
          new: true, 
          runValidators: true
        }
      );

      return NextResponse.json({ 
        success: true, 
        onboarding: updatedOnboarding 
      });
    } else {
      // For full onboarding data updates, allow upsert
      const updatedOnboarding = await UserOnboardingModel.findOneAndUpdate(
        { userId },
        {
          ...data,
          userId, // Ensure userId is set for new documents
          reviewedBy: currentUser.id,
          reviewedAt: new Date(),
        },
        { 
          new: true, 
          runValidators: true,
          upsert: true // Create if doesn't exist only for full data
        }
      );

      return NextResponse.json({ 
        success: true, 
        onboarding: updatedOnboarding 
      });
    }
  } catch (error) {
    console.error('Error updating onboarding data:', error);
    return NextResponse.json({ 
      error: 'Failed to update onboarding data' 
    }, { status: 500 });
  }
} 