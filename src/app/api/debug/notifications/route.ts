import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { InternalNotificationModel } from '@/models/InternalNotification';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId parameter required' }, { status: 400 });
    }

    // Get recent notifications for the user
    const notifications = await InternalNotificationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(10);

    // Get count by status
    const counts = await InternalNotificationModel.aggregate([
      { $match: { userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    return NextResponse.json({
      userId,
      totalNotifications: notifications.length,
      recentNotifications: notifications,
      statusCounts: counts
    });

  } catch (error) {
    console.error('Error fetching debug notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 