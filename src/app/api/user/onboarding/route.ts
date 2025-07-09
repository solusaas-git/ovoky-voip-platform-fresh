import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import UserOnboardingModel from '@/models/UserOnboarding';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const data = await request.json();

    // Validate required fields
    if (!data.companyName || !data.address || !data.phoneNumber || 
        !data.preferredContactMethods || !data.servicesInterested || !data.trafficVolume) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Check if onboarding already exists
    const existingOnboarding = await UserOnboardingModel.findOne({ userId: user.id });
    
    if (existingOnboarding) {
      // Update existing onboarding
      const updatedOnboarding = await UserOnboardingModel.findOneAndUpdate(
        { userId: user.id },
        {
          ...data,
          completed: true,
          completedAt: new Date(),
        },
        { new: true, runValidators: true }
      );

      return NextResponse.json({ 
        success: true, 
        onboarding: updatedOnboarding 
      });
    } else {
      // Create new onboarding
      const onboarding = new UserOnboardingModel({
        userId: user.id,
        ...data,
        completed: true,
        completedAt: new Date(),
      });

      await onboarding.save();

      return NextResponse.json({ 
        success: true, 
        onboarding 
      });
    }
  } catch (error) {
    console.error('Error saving onboarding data:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ 
        error: 'Invalid data provided',
        details: error.message 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Failed to save onboarding data' 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const onboarding = await UserOnboardingModel.findOne({ userId: user.id });

    // Return success response with onboarding data or null if not found
    return NextResponse.json({ 
      success: true, 
      onboarding: onboarding || null
    });
  } catch (error) {
    console.error('Error fetching onboarding data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch onboarding data' 
    }, { status: 500 });
  }
} 