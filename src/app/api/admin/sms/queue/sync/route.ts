import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SmsQueueService } from '@/lib/services/SmsQueueService';

/**
 * POST /api/admin/sms/queue/sync
 * Manually trigger campaign counter synchronization
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required', message: 'You must be logged in to access this resource', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { campaignId } = body;

    const queueService = SmsQueueService.getInstance();
    
    if (campaignId) {
      // Sync specific campaign
      await queueService.synchronizeCampaignCounters(campaignId);
      
      return NextResponse.json({
        success: true,
        message: `Campaign ${campaignId} counters synchronized`,
        timestamp: new Date().toISOString()
      });
    } else {
      // Sync all campaigns
      await queueService.synchronizeCampaignCounters();
      
      return NextResponse.json({
        success: true,
        message: 'All campaign counters synchronized',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error in campaign sync API:', error);
    
    return NextResponse.json(
      { 
        error: 'Synchronization failed', 
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'SYNC_ERROR'
      },
      { status: 500 }
    );
  }
} 