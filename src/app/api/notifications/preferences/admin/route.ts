import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { NotificationPreferencesModel } from '@/models/InternalNotification';
import { createDefaultPreferences } from '@/types/notifications';
import { getCurrentUser } from '@/lib/authService';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    // Get current user from authentication
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    // Get admin's preferences to use as global defaults
    let adminPreferences = await NotificationPreferencesModel.findOne({ userId: currentUser.id });

    if (!adminPreferences) {
      // Create default preferences for admin
      const defaultPrefs = createDefaultPreferences(currentUser.id);
      adminPreferences = new NotificationPreferencesModel(defaultPrefs);
      await adminPreferences.save();
    }

    // Get stats about current user preferences and total users
    const totalUsersInSystem = await User.countDocuments();
    const totalUsersWithPreferences = await NotificationPreferencesModel.countDocuments();
    const enabledPushUsers = await NotificationPreferencesModel.countDocuments({ enablePushNotifications: true });
    const enabledSoundUsers = await NotificationPreferencesModel.countDocuments({ enableSounds: true });

    return NextResponse.json({
      globalDefaults: adminPreferences,
      stats: {
        totalUsers: totalUsersInSystem,
        usersWithPreferences: totalUsersWithPreferences,
        enabledPushUsers,
        enabledSoundUsers
      }
    });
  } catch (error) {
    console.error('Error fetching admin notification preferences:', error);
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

    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { applyToAllUsers = false, ...updates } = body;

    // Filter out MongoDB internal fields that shouldn't be updated
    const {
      _id,
      __v,
      userId,
      createdAt,
      updatedAt,
      ...cleanUpdates
    } = updates;

    await connectToDatabase();

    // Update admin's preferences first (these serve as global defaults)
    const adminPreferences = await NotificationPreferencesModel.findOneAndUpdate(
      { userId: currentUser.id },
      { 
        ...cleanUpdates,
        updatedAt: new Date()
      },
      { 
        new: true,
        upsert: true // Create if doesn't exist
      }
    );

    let appliedToUsers = 0;

    // If requested, apply to all existing users
    if (applyToAllUsers) {
      // Get all users from the system
      const allUsers = await User.find({}, { _id: 1 }).lean();
      
      for (const user of allUsers) {
        if (user._id.toString() === currentUser.id) {
          continue; // Skip admin user
        }

        // Update existing preferences or create new ones with admin defaults
        await NotificationPreferencesModel.findOneAndUpdate(
          { userId: user._id.toString() },
          { 
            ...cleanUpdates,
            userId: user._id.toString(),
            updatedAt: new Date()
          },
          { 
            upsert: true, // Create if doesn't exist
            new: true
          }
        );
        appliedToUsers++;
      }
    }

    return NextResponse.json({
      success: true,
      adminPreferences,
      appliedToUsers,
      message: applyToAllUsers 
        ? `Settings updated and applied to ${appliedToUsers} users`
        : 'Admin settings updated as global defaults'
    });
  } catch (error) {
    console.error('Error updating admin notification preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Reset all users to current admin defaults
export async function POST(request: NextRequest) {
  try {
    // Get current user from authentication
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    // Get admin's current preferences
    const adminPreferences = await NotificationPreferencesModel.findOne({ userId: currentUser.id });

    if (!adminPreferences) {
      return NextResponse.json(
        { error: 'Admin preferences not found' },
        { status: 404 }
      );
    }

    // Get all users from the system
    const allUsers = await User.find({}, { _id: 1 }).lean();
    
    // Apply admin preferences to all other users
    const adminPrefsObj = adminPreferences.toObject();
    const { _id, userId, createdAt, ...prefsToApply } = adminPrefsObj;

    let appliedToUsers = 0;

    for (const user of allUsers) {
      if (user._id.toString() === currentUser.id) {
        continue; // Skip admin user
      }

      await NotificationPreferencesModel.findOneAndUpdate(
        { userId: user._id.toString() },
        { 
          ...prefsToApply,
          userId: user._id.toString(),
          updatedAt: new Date()
        },
        { 
          upsert: true, // Create if doesn't exist
          new: true
        }
      );
      appliedToUsers++;
    }

    return NextResponse.json({
      success: true,
      appliedToUsers,
      message: `Reset ${appliedToUsers} users to admin defaults`
    });
  } catch (error) {
    console.error('Error resetting user preferences to admin defaults:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 