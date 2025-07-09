import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import InternalNotificationModel, { NotificationPreferencesModel } from '@/models/InternalNotification';
import { PushSubscriptionModel } from '@/models/PushSubscription';
import { NotificationType, NotificationTemplates, createDefaultPreferences } from '@/types/notifications';
import { getCurrentUser } from '@/lib/authService';
import webpush from 'web-push';

// Configure web-push with VAPID keys only if they are available
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const webPushContact = process.env.WEB_PUSH_CONTACT || 'mailto:admin@example.com';

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(webPushContact, vapidPublicKey, vapidPrivateKey);
  } catch (error) {
    console.warn('Failed to configure VAPID details:', error);
  }
}

// Interface for notification query
interface NotificationQuery {
  userId: string;
  status?: { $in: string[] };
  type?: { $in: NotificationType[] };
  $or?: Array<{
    title?: { $regex: string; $options: string };
    message?: { $regex: string; $options: string };
  }>;
}

export async function GET(request: NextRequest) {
  try {
    // Get current user from authentication
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Parse query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const search = url.searchParams.get('search');
    const types = url.searchParams.get('types')?.split(',') as NotificationType[];
    const statuses = url.searchParams.get('statuses')?.split(',');
    const priorities = url.searchParams.get('priorities')?.split(',');

    // Build query using authenticated user
    const query: NotificationQuery = { userId: currentUser.id };

    if (statuses?.length) {
      query.status = { $in: statuses };
    }

    if (types?.length) {
      query.type = { $in: types };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await InternalNotificationModel.countDocuments(query);
    const notifications = await InternalNotificationModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);

    return NextResponse.json({ notifications, total });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get current user from authentication
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'type is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Get user preferences to check if notification should be created
    let preferences = await NotificationPreferencesModel.findOne({ userId: currentUser.id });
    
    if (!preferences) {
      // Create default preferences
      const defaultPrefs = createDefaultPreferences(currentUser.id);
      preferences = new NotificationPreferencesModel(defaultPrefs);
      await preferences.save();
    }

    // Check if user wants this type of notification
    const typePrefs = preferences.typePreferences[type];
    if (!typePrefs?.enabled) {
      return NextResponse.json({ message: 'Notification type disabled for user' }, { status: 200 });
    }

    // Check do not disturb
    if (preferences.isInDoNotDisturbPeriod && preferences.isInDoNotDisturbPeriod()) {
      return NextResponse.json({ message: 'User in do not disturb period' }, { status: 200 });
    }

    // Get notification template
    if (!NotificationTemplates[type as NotificationType]) {
      return NextResponse.json(
        { error: 'Invalid notification type' },
        { status: 400 }
      );
    }
    
    const template = NotificationTemplates[type as NotificationType];
    
    // Create notification object
    const notificationData = {
      userId: currentUser.id,
      type,
      title: template.getTitle(data),
      message: template.getMessage(data),
      priority: typePrefs?.priority || 'medium',
      status: 'unread',
      data,
      icon: template.icon,
      sound: preferences.soundTheme || template.sound,
      showToast: typePrefs?.showToast ?? true,
      showPush: typePrefs?.enablePush ?? false,
      persistent: ['urgent', 'high'].includes(typePrefs?.priority || 'medium')
    };

    // Save to database
    const notification = new InternalNotificationModel(notificationData);
    await notification.save();

    // Send push notification if enabled (moved inline to avoid authentication issues)
    if (preferences.enablePushNotifications && typePrefs?.enablePush && vapidPublicKey && vapidPrivateKey) {
      try {
        // Get active push subscriptions for the user
        const subscriptions = await PushSubscriptionModel.find({ 
          userId: currentUser.id, 
          isActive: true 
        });

        if (subscriptions.length > 0) {
          const pushPromises = subscriptions.map(async (sub) => {
            try {
              const payload = JSON.stringify({
                title: notification.title,
                body: notification.message,
                icon: '/icons/notification-icon.svg',
                badge: '/icons/notification-badge.svg',
                tag: notification.type,
                data: {
                  notificationId: notification._id,
                  actionUrl: data?.actionUrl,
                  type: notification.type
                },
                actions: [
                  {
                    action: 'view',
                    title: 'View'
                  },
                  {
                    action: 'dismiss',
                    title: 'Dismiss'
                  }
                ]
              });

              await webpush.sendNotification(sub.subscriptionData, payload);
              return { success: true, endpoint: sub.endpoint };
            } catch (error) {
              console.error('Failed to send push notification to:', sub.endpoint, error);
              
              // If subscription is invalid, mark it as inactive
              if (error instanceof Error && (
                error.message.includes('410') || // Gone
                error.message.includes('invalid') ||
                error.message.includes('expired')
              )) {
                await PushSubscriptionModel.findByIdAndUpdate(sub._id, { 
                  isActive: false,
                  updatedAt: new Date()
                });
              }
              
              return { success: false, endpoint: sub.endpoint, error: error instanceof Error ? error.message : 'Unknown error' };
            }
          });

          const results = await Promise.allSettled(pushPromises);
          const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
          const failureCount = results.length - successCount;

          console.log(`Push notifications sent: ${successCount} successful, ${failureCount} failed`);
        }
      } catch (error) {
        console.error('Error sending push notifications:', error);
      }
    }

    return NextResponse.json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 