import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { smsQueueService } from '@/lib/services/SmsQueueService';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get queue statistics
    const stats = await smsQueueService.getQueueStats();

    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Failed to fetch SMS queue stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 