import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import UserModel from '@/models/User';
import { getCurrentUser } from '@/lib/authService';

export async function POST() {
  try {
    const user = await getCurrentUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectToDatabase();

    // Update user to mark that we've asked for notification permission
    await UserModel.findByIdAndUpdate(
      user.id,
      { 
        notificationPermissionRequested: true,
        notificationPermissionRequestedAt: new Date()
      },
      { new: true }
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Notification permission request status updated' 
    });
  } catch (error) {
    console.error('Error updating notification permission request status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectToDatabase();

    // Get user's notification permission request status
    const userData = await UserModel.findById(user.id).select('notificationPermissionRequested notificationPermissionRequestedAt');

    return NextResponse.json({ 
      hasBeenAsked: userData?.notificationPermissionRequested || false,
      askedAt: userData?.notificationPermissionRequestedAt || null
    });
  } catch (error) {
    console.error('Error getting notification permission request status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Development only - reset notification permission request status
export async function DELETE() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  }

  try {
    const user = await getCurrentUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectToDatabase();

    // Reset notification permission request status
    await UserModel.findByIdAndUpdate(
      user.id,
      { 
        $unset: {
          notificationPermissionRequested: 1,
          notificationPermissionRequestedAt: 1
        }
      },
      { new: true }
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Notification permission request status reset' 
    });
  } catch (error) {
    console.error('Error resetting notification permission request status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 