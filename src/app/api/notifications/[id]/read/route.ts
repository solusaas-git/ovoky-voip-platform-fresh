import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import InternalNotificationModel from '@/models/InternalNotification';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    await connectToDatabase();

    const result = await InternalNotificationModel.updateOne(
      { _id: id, userId },
      { status: 'read', readAt: new Date() }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 