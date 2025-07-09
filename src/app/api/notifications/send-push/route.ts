import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { PushSubscriptionModel } from '@/models/PushSubscription';
import { getCurrentUser } from '@/lib/authService';
import webpush from 'web-push';

// Configure web-push with VAPID keys only if they are available
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const webPushContact = 'mailto:admin@example.com';

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(webPushContact, vapidPublicKey, vapidPrivateKey);
  } catch (error) {
    console.warn('Failed to configure VAPID details:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if VAPID is configured
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json({ 
        error: 'Push notifications not configured - VAPID keys missing' 
      }, { status: 503 });
    }

    const user = await getCurrentUser();
    
    // Allow internal requests (for notification creation) or authenticated users
    const authHeader = request.headers.get('authorization');
    const internalApiKey = process.env.INTERNAL_API_KEY;
    const isInternalRequest = authHeader === `Bearer ${internalApiKey}` && internalApiKey;
    
    // For internal requests or when no internal API key is set, allow if request is from localhost
    const isLocalRequest = request.headers.get('host')?.includes('localhost') || 
                          request.headers.get('x-forwarded-for') === '127.0.0.1';
    
    if (!user && !isInternalRequest && !isLocalRequest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, notification } = await request.json();

    if (!userId || !notification) {
      return NextResponse.json(
        { error: 'userId and notification are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Get active push subscriptions for the user
    const subscriptions = await PushSubscriptionModel.find({ 
      userId, 
      isActive: true 
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({ 
        message: 'No active push subscriptions found for user' 
      });
    }

    const pushPromises = subscriptions.map(async (sub) => {
      try {
        const payload = JSON.stringify({
          title: notification.title,
          body: notification.message,
          icon: '/icons/notification-icon.svg',
          badge: '/icons/notification-badge.svg',
          tag: notification.type,
          data: {
            notificationId: notification.id,
            actionUrl: notification.actionUrl,
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
        console.log('Push notification sent successfully to:', sub.endpoint);
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

    return NextResponse.json({
      success: true,
      message: `Push notifications sent. Success: ${successCount}, Failed: ${failureCount}`,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: 'Promise rejected' })
    });

  } catch (error) {
    console.error('Error sending push notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 