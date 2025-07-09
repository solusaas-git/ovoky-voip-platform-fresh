import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import InternalNotificationModel from '@/models/InternalNotification';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    await connectToDatabase();

    const result = await InternalNotificationModel.updateMany(
      { userId, status: 'unread' },
      { status: 'read', readAt: new Date() }
    );

    return NextResponse.json({ count: result.modifiedCount });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 