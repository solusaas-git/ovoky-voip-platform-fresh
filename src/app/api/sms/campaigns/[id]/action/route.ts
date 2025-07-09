import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import SmsCampaign from '@/models/SmsCampaign';
import SmsContactList from '@/models/SmsContactList';
import SmsTemplate from '@/models/SmsTemplate';
import SmsProvider from '@/models/SmsGateway';
import mongoose from 'mongoose';

// POST /api/sms/campaigns/[id]/action - Perform campaign action
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
    
    if (!action || !['start', 'pause', 'stop', 'archive', 'restart'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be one of: start, pause, stop, archive, restart' },
        { status: 400 }
      );
    }

    // Use the model methods for action validation and execution
    try {
      switch (action) {
        case 'start':
          if (!campaign.canStart()) {
            return NextResponse.json(
              { error: `Cannot start campaign with status '${campaign.status}'. Campaign must be in draft, paused, or scheduled status.` },
              { status: 400 }
            );
          }
          await campaign.start();
          break;
        case 'pause':
          if (!campaign.canPause()) {
            return NextResponse.json(
              { error: `Cannot pause campaign with status '${campaign.status}'. Campaign must be in sending status.` },
              { status: 400 }
            );
          }
          await campaign.pause();
          break;
        case 'stop':
          if (!campaign.canStop()) {
            return NextResponse.json(
              { error: `Cannot stop campaign with status '${campaign.status}'. Campaign must be in sending or paused status.` },
              { status: 400 }
            );
          }
          await campaign.stop();
          break;
        case 'archive':
          if (!campaign.canArchive()) {
            return NextResponse.json(
              { error: `Cannot archive campaign with status '${campaign.status}'. Campaign must be completed, failed, or stopped.` },
              { status: 400 }
            );
          }
          await campaign.archive();
          break;
        case 'restart':
          if (!campaign.canRestart()) {
            return NextResponse.json(
              { error: `Cannot restart campaign with status '${campaign.status}'. Campaign must be completed, stopped, or failed.` },
              { status: 400 }
            );
          }
          await campaign.restart();
          break;
      }

      // For start action, trigger campaign processing
      if (action === 'start') {
        // Trigger campaign processing in the background
        // In a production environment, you would use a job queue
        fetch(`${process.env.NEXTAUTH_URL}/api/sms/campaigns/${id}/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          }
        }).catch(error => {
          console.error('Failed to trigger campaign processing:', error);
        });
      }

      // Get related data separately to avoid populate issues
      const contactList = await SmsContactList.findById(campaign.contactListId).select('name contactCount');
      const template = campaign.templateId ? await SmsTemplate.findById(campaign.templateId).select('name') : null;
      const provider = await SmsProvider.findById(campaign.providerId).select('name');

      // Create response object with populated data
      const campaignResponse = {
        ...campaign.toObject(),
        contactListId: contactList,
        templateId: template,
        providerId: provider
      };

      return NextResponse.json({
        campaign: campaignResponse,
        message: `Campaign ${action}ed successfully`
      });
    } catch (actionError: any) {
      return NextResponse.json(
        { error: actionError.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error performing campaign action:', error);
    return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 });
  }
} 