import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import SmsMessage from '@/models/SmsMessage';
import SmsGateway from '@/models/SmsGateway';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const messageType = searchParams.get('messageType') || '';
    const skip = (page - 1) * limit;

    await connectToDatabase();

    // Build query
    const query: any = { userId: session.user.id };
    
    if (search) {
      query.$or = [
        { to: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    if (messageType) {
      query.messageType = messageType;
    }

    // Get messages with pagination
    const messages = await SmsMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await SmsMessage.countDocuments(query);

    // Get unique provider IDs and campaign IDs from messages
    const providerIds = [...new Set(messages.map(msg => msg.providerId).filter(Boolean))];
    const campaignIds = [...new Set(messages.map(msg => msg.campaignId).filter(Boolean))];
    
    // Fetch provider information using the SmsGateway model
    const providers = await SmsGateway.find({ 
      _id: { $in: providerIds } 
    }).select('_id name displayName').lean();

    // Fetch campaign information if there are any campaigns
    let campaigns: any[] = [];
    if (campaignIds.length > 0) {
      const SmsCampaign = (await import('@/models/SmsCampaign')).default;
      campaigns = await SmsCampaign.find({ 
        _id: { $in: campaignIds } 
      }).select('_id name').lean();
    }

    // Create lookup maps
    const providerMap = new Map();
    providers.forEach((provider: any) => {
      providerMap.set(provider._id.toString(), provider);
    });

    const campaignMap = new Map();
    campaigns.forEach((campaign: any) => {
      campaignMap.set(campaign._id.toString(), campaign);
    });

    // Transform messages to match expected format
    const transformedMessages = messages.map((message: any) => {
      const provider = message.providerId ? providerMap.get(message.providerId.toString()) : null;
      const campaign = message.campaignId ? campaignMap.get(message.campaignId.toString()) : null;
      
      return {
        _id: message._id,
        to: message.to,
        from: message.from,
        message: message.content, // Map content to message field
        status: message.status,
        cost: message.cost || 0,
        providerId: message.providerId,
        providerName: provider?.displayName || provider?.name || 'SMS Provider',
        providerResponse: message.providerResponse,
        sendingId: message.messageId,
        messageType: message.messageType || 'single',
        campaignId: message.campaignId,
        campaignName: campaign?.name || null,
        errorMessage: message.errorMessage || null, // Add error message for failed messages
        retryCount: message.retryCount || 0, // Add retry count
        maxRetries: message.maxRetries || 3, // Add max retries
        createdAt: message.createdAt,
        updatedAt: message.updatedAt
      };
    });

    return NextResponse.json({
      messages: transformedMessages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching SMS history:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch SMS history' 
    }, { status: 500 });
  }
} 