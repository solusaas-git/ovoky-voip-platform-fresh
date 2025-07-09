import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { NotificationPreferencesModel } from '@/models/InternalNotification';
import { createDefaultPreferences } from '@/types/notifications';
import { getCurrentUser } from '@/lib/authService';

export async function GET(request: NextRequest) {
  try {
    // Get current user from authentication
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    let preferences = await NotificationPreferencesModel.findOne({ userId: currentUser.id });

    if (!preferences) {
      // Check if there are admin-defined global defaults
      const adminPreferences = await NotificationPreferencesModel.findOne({ 
        userId: { $exists: true } 
      }).sort({ createdAt: 1 }); // Get the first (likely admin) preferences

      let defaultPrefs;
      if (adminPreferences && currentUser.role !== 'admin') {
        // Use admin preferences as template for new users
        const adminPrefsObj = adminPreferences.toObject();
        const { _id, userId: adminUserId, createdAt, updatedAt, ...prefsToApply } = adminPrefsObj;
        defaultPrefs = {
          ...prefsToApply,
          userId: currentUser.id,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        console.log('Creating preferences for user based on admin defaults:', currentUser.id);
      } else {
        // Use system defaults (for admin or if no admin preferences exist)
        defaultPrefs = createDefaultPreferences(currentUser.id);
        console.log('Creating default preferences for user:', currentUser.id);
      }
      
      preferences = new NotificationPreferencesModel(defaultPrefs);
      await preferences.save();
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get current user from authentication
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // Remove userId from body if it exists (we use authenticated user)
    const { userId, ...updates } = body;

    await connectToDatabase();

    const updatedPreferences = await NotificationPreferencesModel.findOneAndUpdate(
      { userId: currentUser.id },
      { 
        ...updates,
        updatedAt: new Date()
      },
      { 
        new: true,
        upsert: true // Create if doesn't exist
      }
    );

    if (!updatedPreferences) {
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedPreferences);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 