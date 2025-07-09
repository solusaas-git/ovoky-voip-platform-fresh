import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { PushSubscriptionModel } from '@/models/PushSubscription';
import { getCurrentUser } from '@/lib/authService';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const subscriptionData = await request.json();
    
    if (!subscriptionData || !subscriptionData.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
    }

    // Validate that the subscription has the required keys
    if (!subscriptionData.keys || !subscriptionData.keys.p256dh || !subscriptionData.keys.auth) {
      return NextResponse.json({ error: 'Invalid subscription keys' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if subscription already exists
    const existingSubscription = await PushSubscriptionModel.findOne({
      userId: user.id,
      endpoint: subscriptionData.endpoint
    });

    if (existingSubscription) {
      // Update existing subscription
      existingSubscription.keys = {
        p256dh: subscriptionData.keys.p256dh,
        auth: subscriptionData.keys.auth
      };
      existingSubscription.subscriptionData = subscriptionData;
      existingSubscription.isActive = true;
      existingSubscription.updatedAt = new Date();
      await existingSubscription.save();
      
      return NextResponse.json({ 
        success: true, 
        message: 'Subscription updated',
        subscription: existingSubscription 
      });
    }

    // Create new subscription
    const subscription = new PushSubscriptionModel({
      userId: user.id,
      endpoint: subscriptionData.endpoint,
      keys: {
        p256dh: subscriptionData.keys.p256dh,
        auth: subscriptionData.keys.auth
      },
      subscriptionData,
      isActive: true
    });

    await subscription.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription saved',
      subscription 
    });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    await PushSubscriptionModel.findOneAndUpdate(
      { userId: user.id },
      { isActive: false, updatedAt: new Date() }
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Push subscription removed successfully' 
    });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 