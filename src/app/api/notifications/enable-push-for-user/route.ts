import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { NotificationPreferencesModel } from '@/models/InternalNotification';
import { createDefaultPreferences, NotificationType } from '@/types/notifications';
import { getCurrentUser } from '@/lib/authService';

export async function POST(request: NextRequest) {
  try {
    // Get current user from authentication
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Get or create user preferences
    let preferences = await NotificationPreferencesModel.findOne({ userId: currentUser.id });

    if (!preferences) {
      // Create default preferences if they don't exist
      const defaultPrefs = createDefaultPreferences(currentUser.id);
      preferences = new NotificationPreferencesModel(defaultPrefs);
    }

    // Enable push notifications globally
    preferences.enablePushNotifications = true;

    // Enable push notifications for all notification types by default
    const allNotificationTypes: NotificationType[] = [
      'ticket_created', 'ticket_updated', 'ticket_assigned', 'ticket_reply', 'ticket_resolved',
      'payment_success', 'payment_failed', 'low_balance', 'zero_balance',
      'phone_number_approved', 'phone_number_rejected', 'phone_number_purchased', 'phone_number_assigned',
      'system_maintenance', 'user_verification', 'admin_alert', 'rate_deck_updated', 'call_quality_alert', 'security_alert'
    ];

    allNotificationTypes.forEach(type => {
      if (preferences.typePreferences[type]) {
        preferences.typePreferences[type].enablePush = true;
      }
    });

    preferences.updatedAt = new Date();
    await preferences.save();

    console.log(`Push notifications enabled for user: ${currentUser.id}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Push notifications enabled successfully',
      preferences 
    });
  } catch (error) {
    console.error('Error enabling push notifications for user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 