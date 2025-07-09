import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import SmsCampaign from '@/models/SmsCampaign';
import mongoose from 'mongoose';

/**
 * GET /api/sms/campaigns/[id]/progress - Get real-time campaign progress
 * Supports both regular JSON response and Server-Sent Events (SSE)
 */
export async function GET(
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
    }).select('name status contactCount sentCount failedCount deliveredCount progress actualCost startedAt completedAt');
    
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check if client wants Server-Sent Events
    const acceptHeader = request.headers.get('accept');
    const isSSE = acceptHeader?.includes('text/event-stream');

    if (isSSE) {
      // Return Server-Sent Events stream for real-time updates
      return handleSSEConnection(campaign, id);
    } else {
      // Return regular JSON response
      return NextResponse.json({
        campaignId: campaign._id,
        name: campaign.name,
        status: campaign.status,
        progress: {
          percentage: campaign.progress,
          contactCount: campaign.contactCount,
          sentCount: campaign.sentCount,
          failedCount: campaign.failedCount,
          deliveredCount: campaign.deliveredCount,
          remainingCount: Math.max(0, campaign.contactCount - campaign.sentCount - campaign.failedCount)
        },
        costs: {
          actualCost: campaign.actualCost
        },
        timestamps: {
          startedAt: campaign.startedAt,
          completedAt: campaign.completedAt
        },
        lastUpdated: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error fetching campaign progress:', error);
    return NextResponse.json({ error: 'Failed to fetch campaign progress' }, { status: 500 });
  }
}

/**
 * Handle Server-Sent Events connection for real-time updates
 */
function handleSSEConnection(campaign: any, campaignId: string): Response {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial data
      const initialData = {
        campaignId: campaign._id,
        name: campaign.name,
        status: campaign.status,
        progress: {
          percentage: campaign.progress,
          contactCount: campaign.contactCount,
          sentCount: campaign.sentCount,
          failedCount: campaign.failedCount,
          deliveredCount: campaign.deliveredCount,
          remainingCount: Math.max(0, campaign.contactCount - campaign.sentCount - campaign.failedCount)
        },
        costs: {
          actualCost: campaign.actualCost
        },
        timestamps: {
          startedAt: campaign.startedAt,
          completedAt: campaign.completedAt
        },
        lastUpdated: new Date().toISOString()
      };

      const data = `data: ${JSON.stringify(initialData)}\n\n`;
      controller.enqueue(encoder.encode(data));

      // Set up polling interval for updates
      const interval = setInterval(async () => {
        try {
          await connectToDatabase();
          const updatedCampaign = await SmsCampaign.findById(campaignId)
            .select('name status contactCount sentCount failedCount deliveredCount progress actualCost startedAt completedAt');
          
          if (updatedCampaign) {
            const updateData = {
              campaignId: updatedCampaign._id,
              name: updatedCampaign.name,
              status: updatedCampaign.status,
              progress: {
                percentage: updatedCampaign.progress,
                contactCount: updatedCampaign.contactCount,
                sentCount: updatedCampaign.sentCount,
                failedCount: updatedCampaign.failedCount,
                deliveredCount: updatedCampaign.deliveredCount,
                remainingCount: Math.max(0, updatedCampaign.contactCount - updatedCampaign.sentCount - updatedCampaign.failedCount)
              },
              costs: {
                actualCost: updatedCampaign.actualCost
              },
              timestamps: {
                startedAt: updatedCampaign.startedAt,
                completedAt: updatedCampaign.completedAt
              },
              lastUpdated: new Date().toISOString()
            };

            const data = `data: ${JSON.stringify(updateData)}\n\n`;
            controller.enqueue(encoder.encode(data));

            // Close connection if campaign is completed
            if (['completed', 'stopped', 'failed'].includes(updatedCampaign.status)) {
              clearInterval(interval);
              controller.close();
            }
          }
        } catch (error) {
          console.error('Error in SSE update:', error);
          // Send error event
          const errorData = `event: error\ndata: ${JSON.stringify({ error: 'Update failed' })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
        }
      }, 2000); // Update every 2 seconds

      // Clean up on connection close
      const cleanup = () => {
        clearInterval(interval);
        controller.close();
      };

      // Set up cleanup after 5 minutes to prevent long-running connections
      setTimeout(cleanup, 5 * 60 * 1000);
    },

    cancel() {
      // Handle client disconnect
      console.log('SSE connection cancelled for campaign:', campaignId);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
} 