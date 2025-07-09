import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import UserNotificationSettingsModel from '@/models/UserNotificationSettings';
import User from '@/models/User';
import connectToDatabase from '@/lib/db';

// GET handler to fetch user notification settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: userId } = await params;

    // Allow users to access their own settings or admins to access any settings
    if (currentUser.role !== 'admin' && currentUser.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectToDatabase();

    // Get user info
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get or create user notification settings
    let settings = await UserNotificationSettingsModel.findOne({ userId: userId });
    
    if (!settings) {
      // Create default settings for user
      settings = await UserNotificationSettingsModel.create({
        userId: userId,
        userEmail: user.email,
        lowBalanceThreshold: 10.0000,
        zeroBalanceThreshold: 0.0000,
        negativeBalanceThreshold: -0.0001,
        enableLowBalanceNotifications: true,
        enableZeroBalanceNotifications: true,
        enableNegativeBalanceNotifications: true,
        notificationFrequencyHours: 24,
        currency: 'EUR'
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching user notification settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST/PUT handler to update user notification settings
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: userId } = await params;

    // Allow users to update their own settings or admins to update any settings
    if (currentUser.role !== 'admin' && currentUser.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    await connectToDatabase();

    // Get user info
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate input
    const {
      lowBalanceThreshold,
      zeroBalanceThreshold,
      negativeBalanceThreshold,
      enableLowBalanceNotifications,
      enableZeroBalanceNotifications,
      enableNegativeBalanceNotifications,
      notificationFrequencyHours,
      currency = 'EUR'
    } = body;

    // Basic validation
    if (typeof lowBalanceThreshold !== 'number' || lowBalanceThreshold < 0) {
      return NextResponse.json({ error: 'Low balance threshold must be a non-negative number' }, { status: 400 });
    }

    if (typeof notificationFrequencyHours !== 'number' || notificationFrequencyHours < 1 || notificationFrequencyHours > 168) {
      return NextResponse.json({ error: 'Notification frequency must be between 1 and 168 hours' }, { status: 400 });
    }

    // Upsert user notification settings
    const settings = await UserNotificationSettingsModel.findOneAndUpdate(
      { userId: userId },
      {
        userId: userId,
        userEmail: user.email,
        lowBalanceThreshold,
        zeroBalanceThreshold,
        negativeBalanceThreshold,
        enableLowBalanceNotifications: Boolean(enableLowBalanceNotifications),
        enableZeroBalanceNotifications: Boolean(enableZeroBalanceNotifications),
        enableNegativeBalanceNotifications: Boolean(enableNegativeBalanceNotifications),
        notificationFrequencyHours,
        currency: currency.toUpperCase()
      },
      { 
        upsert: true, 
        new: true, 
        runValidators: true 
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Notification settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Error updating user notification settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 