import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import SmsCampaign from '@/models/SmsCampaign';
import { smsQueueService } from '@/lib/services/SmsQueueService';
import mongoose from 'mongoose';

// POST /api/sms/campaigns/[id]/queue-control - Control campaign queue processing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
    }

    const campaign = await SmsCampaign.findOne({ 
      _id: id, 
      userId: session.user.id 
    });
    
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const { action } = await request.json();
    
    if (!action || !['pause', 'resume'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be one of: pause, resume' },
        { status: 400 }
      );
    }

    try {
      if (action === 'pause') {
        await smsQueueService.pauseCampaign(campaign._id.toString());
        campaign.status = 'paused';
        await campaign.save();
        
        return NextResponse.json({
          success: true,
          message: 'Campaign processing paused',
          campaignId: campaign._id,
          status: 'paused'
        });
      } else if (action === 'resume') {
        await smsQueueService.resumeCampaign(campaign._id.toString());
        campaign.status = 'sending';
        await campaign.save();
        
        return NextResponse.json({
          success: true,
          message: 'Campaign processing resumed',
          campaignId: campaign._id,
          status: 'sending'
        });
      }
    } catch (queueError) {
      console.error(`Error ${action}ing campaign:`, queueError);
      return NextResponse.json(
        { error: `Failed to ${action} campaign processing` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error controlling campaign queue:', error);
    return NextResponse.json({ error: 'Failed to control campaign' }, { status: 500 });
  }
} 