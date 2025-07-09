import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import InternalNotificationModel from '@/models/InternalNotification';
import { getCurrentUser } from '@/lib/authService';

export async function GET(request: NextRequest) {
  try {
    // Get current user from authentication
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const stats = await (InternalNotificationModel as unknown as { getUserStats: (userId: string) => Promise<any> }).getUserStats(currentUser.id);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    return NextResponse.json(
      { total: 0, unread: 0, byType: {}, byPriority: {}, todayCount: 0, weekCount: 0 },
      { status: 200 }
    );
  }
} 