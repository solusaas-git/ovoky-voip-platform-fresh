import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import SmsMessage from '@/models/SmsMessage';
import SmsCampaign from '@/models/SmsCampaign';
import { smsQueueService } from '@/lib/services/SmsQueueService';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    // Get counts before reset
    const queuedCount = await SmsMessage.countDocuments({ 
      status: { $in: ['queued', 'processing'] } 
    });

    if (queuedCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'Queue is already empty',
        resetCount: 0
      });
    }

    // Mark all queued and processing messages as failed
    const resetResult = await SmsMessage.updateMany(
      { status: { $in: ['queued', 'processing'] } },
      {
        $set: {
          status: 'failed',
          errorMessage: 'Queue reset by admin',
          failedAt: new Date()
        }
      }
    );

    // Update campaign counters for affected campaigns
    const affectedMessages = await SmsMessage.find({
      status: 'failed',
      errorMessage: 'Queue reset by admin',
      campaignId: { $exists: true, $ne: null }
    }).distinct('campaignId');

    // Update campaign failed counts
    for (const campaignId of affectedMessages) {
      const failedCount = await SmsMessage.countDocuments({
        campaignId,
        status: 'failed',
        errorMessage: 'Queue reset by admin'
      });

      await SmsCampaign.findByIdAndUpdate(campaignId, {
        $inc: { failedCount: failedCount },
        $set: { 
          status: 'failed',
          errorMessage: 'Queue reset by admin',
          completedAt: new Date()
        }
      });
    }

    // Reset the SMS queue service internal state
    smsQueueService.resetQueueService();

    console.log(`🔄 Admin ${user.email} reset SMS queue: ${resetResult.modifiedCount} messages marked as failed`);

    return NextResponse.json({
      success: true,
      message: `Successfully reset queue: ${resetResult.modifiedCount} messages marked as failed`,
      resetCount: resetResult.modifiedCount,
      affectedCampaigns: affectedMessages.length
    });

  } catch (error) {
    console.error('Failed to reset SMS queue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 