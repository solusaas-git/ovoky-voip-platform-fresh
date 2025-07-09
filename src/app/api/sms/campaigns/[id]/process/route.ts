import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import SmsCampaign from '@/models/SmsCampaign';
import SmsContactList from '@/models/SmsContactList';
import SmsKeywordBlacklist from '@/models/SmsKeywordBlacklist';
import SmsSenderId from '@/models/SmsSenderId';
import RateDeckAssignment from '@/models/RateDeckAssignment';
import { smsQueueService } from '@/lib/services/SmsQueueService';
import mongoose from 'mongoose';

// POST /api/sms/campaigns/[id]/process - Process campaign messages
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

    if (campaign.status !== 'sending') {
      return NextResponse.json({ 
        error: 'Campaign must be in sending status to process messages' 
      }, { status: 400 });
    }

    // Get contact list separately
    const contactList = await SmsContactList.findById(campaign.contactListId);
    if (!contactList) {
      return NextResponse.json({ error: 'Contact list not found' }, { status: 404 });
    }

    // Get user's SMS rate deck assignment
    const rateDeckAssignment = await RateDeckAssignment.findOne({
      userId: session.user.id,
      rateDeckType: 'sms',
      isActive: true
    }).populate('rateDeckId');

    if (!rateDeckAssignment) {
      return NextResponse.json(
        { error: 'No SMS rate deck assigned to user' },
        { status: 400 }
      );
    }

    // Validate sender ID
    const senderIdDoc = await SmsSenderId.findOne({
      userId: session.user.id,
      senderId: campaign.senderId,
      status: 'approved'
    });

    if (!senderIdDoc) {
      return NextResponse.json(
        { error: 'Invalid or unapproved sender ID' },
        { status: 400 }
      );
    }

    // Check message against keyword blacklist
    const blacklistCheck = await SmsKeywordBlacklist.checkMessage(campaign.message);
    if (blacklistCheck.blocked) {
      campaign.status = 'failed';
      campaign.errorMessage = `Message contains blocked keywords: ${blacklistCheck.matchedKeywords.join(', ')}`;
      await campaign.save();
      
      return NextResponse.json(
        { 
          error: 'Message contains blocked keywords',
          blockedKeywords: blacklistCheck.matchedKeywords
        },
        { status: 400 }
      );
    }

    // Initialize SMS Queue Service if not already running
    try {
      await smsQueueService.initialize();
    } catch (error) {
      console.log('SMS Queue Service already initialized or error:', error);
    }

    // Queue the campaign for processing
    try {
      await smsQueueService.queueCampaign(campaign._id.toString());
      
      return NextResponse.json({
        success: true,
        message: 'Campaign queued for processing',
        campaignId: campaign._id,
        status: 'queued'
      });
    } catch (queueError) {
      console.error('Error queueing campaign:', queueError);
      
      // Mark campaign as failed
      campaign.status = 'failed';
      campaign.errorMessage = queueError instanceof Error ? queueError.message : 'Failed to queue campaign';
      await campaign.save();
      
      return NextResponse.json(
        { error: 'Failed to queue campaign for processing' },
        { status: 500 }
      );
    }

  } catch (error) {
    return NextResponse.json({ error: 'Failed to process campaign' }, { status: 500 });
  }
}

// Simulate SMS sending (replace with actual gateway integration)
async function simulateSMSSending(
  provider: any,
  to: string,
  message: string,
  from?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

  // Simulate 95% success rate
  const success = Math.random() > 0.05;
  
  if (success) {
    return {
      success: true,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  } else {
    return {
      success: false,
      error: 'Gateway temporarily unavailable'
    };
  }
} 