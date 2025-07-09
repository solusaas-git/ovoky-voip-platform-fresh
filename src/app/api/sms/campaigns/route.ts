import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import SmsCampaign from '@/models/SmsCampaign';
import SmsContactList from '@/models/SmsContactList';
import SmsContact from '@/models/SmsContact';
import SmsMessage from '@/models/SmsMessage';
import RateDeckAssignment from '@/models/RateDeckAssignment';
import SmsRate from '@/models/SmsRate';
import mongoose from 'mongoose';

// Helper function to calculate estimated cost for a campaign (only when needed)
const calculateEstimatedCost = async (contactListId: string, userId: string, country: string) => {
  try {
    console.log(`[Cost Calculation] Starting for userId: ${userId}, contactListId: ${contactListId}, country: ${country}`);

    // Get user's SMS rate deck assignment
    const rateDeckAssignment = await RateDeckAssignment.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      rateDeckType: 'sms',
      isActive: true
    }).populate('rateDeckId');

    if (!rateDeckAssignment) {
      console.log('[Cost Calculation] No rate deck assignment found');
      return { totalCost: 0, matchedContacts: 0, totalContacts: 0 };
    }

    // Get contact count from stored value (no need to query contacts again)
    const contactList = await SmsContactList.findById(contactListId).select('contactCount');
    const contactCount = contactList?.contactCount || 0;

    console.log(`[Cost Calculation] Using stored contact count: ${contactCount}`);

    if (contactCount === 0) {
      return { totalCost: 0, matchedContacts: 0, totalContacts: 0 };
    }

    // Find rate for the selected country
    const rate = await SmsRate.findOne({
      rateDeckId: rateDeckAssignment.rateDeckId,
      country: country
    });

    if (!rate) {
      console.log(`[Cost Calculation] No rate found for country: ${country}`);
      return { totalCost: 0, matchedContacts: 0, totalContacts: contactCount };
    }

    console.log(`[Cost Calculation] Rate found: ${rate.rate} per SMS for ${country}`);

    // Simple multiplication: rate × contact count
    const totalCost = contactCount * rate.rate;
    const result = {
      totalCost: Math.round(totalCost * 100) / 100,
      matchedContacts: contactCount,
      totalContacts: contactCount
    };

    console.log(`[Cost Calculation] Result:`, result);
    return result;
  } catch (error) {
    console.error('Error calculating estimated cost:', error);
    return { totalCost: 0, matchedContacts: 0, totalContacts: 0 };
  }
};

// GET /api/sms/campaigns - List campaigns (SUPER OPTIMIZED - USE STORED DATA)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Single query to get all campaigns with populated contact list data
    const campaigns = await SmsCampaign.find({ userId: session.user.id })
      .populate('contactListId', 'name contactCount') // Get stored contact count
      .sort({ createdAt: -1 })
      .lean(); // Use lean() for better performance

    if (campaigns.length === 0) {
      return NextResponse.json({
        campaigns: [],
        total: 0
      });
    }

    // Transform campaigns using ONLY stored data (no additional queries!)
    const enhancedCampaigns = campaigns.map((campaign: any) => {
      // Use stored contact count from contact list
      const contactCount = campaign.contactListId?.contactCount || 0;
      
      // All statistics are already stored in campaign document
      // No need for additional queries!
      
      return {
        _id: campaign._id,
        name: campaign.name,
        description: campaign.description,
        status: campaign.status,
        contactCount: contactCount, // From contact list (updated on import/delete)
        sentCount: campaign.sentCount, // Stored in campaign (updated by queue service)
        failedCount: campaign.failedCount, // Stored in campaign (updated by queue service)
        deliveredCount: campaign.deliveredCount, // Stored in campaign (updated by queue service)
        scheduledAt: campaign.scheduledAt,
        createdAt: campaign.createdAt,
        message: campaign.message,
        estimatedCost: campaign.estimatedCost, // Stored in campaign (calculated once)
        actualCost: campaign.actualCost, // Stored in campaign (updated by queue service)
        progress: campaign.progress, // Stored in campaign (updated by queue service)
        // Include the raw IDs needed for editing
        contactListId: campaign.contactListId?._id || campaign.contactListId,
        templateId: campaign.templateId?._id || campaign.templateId,
        providerId: campaign.providerId?._id || campaign.providerId,
        senderId: campaign.senderId,
        country: campaign.country
      };
    });

    return NextResponse.json({
      campaigns: enhancedCampaigns,
      total: enhancedCampaigns.length
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

// POST /api/sms/campaigns - Create campaign
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { 
      name, 
      description, 
      contactListId, 
      templateId, 
      message, 
      senderId, 
      providerId,
      country,
      scheduledAt,
      status = 'draft'
    } = body;

    // Validate required fields
    if (!name || !contactListId || !templateId || !senderId || !providerId || !country) {
      return NextResponse.json(
        { error: 'Missing required fields: name, contactListId, templateId, senderId, providerId, and country are required' },
        { status: 400 }
      );
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(contactListId) || !mongoose.Types.ObjectId.isValid(providerId)) {
      return NextResponse.json(
        { error: 'Invalid contact list or gateway ID' },
        { status: 400 }
      );
    }

    if (templateId && !mongoose.Types.ObjectId.isValid(templateId)) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      );
    }

    // Get contact list with stored count (no need to recount!)
    const contactList = await SmsContactList.findById(contactListId);
    if (!contactList) {
      return NextResponse.json(
        { error: 'Contact list not found' },
        { status: 404 }
      );
    }

    // Use stored contact count (updated by contact import/delete operations)
    const contactCount = contactList.contactCount;

    // Calculate estimated cost using stored contact count
    const costData = await calculateEstimatedCost(contactListId, session.user.id, country);

    const campaignData = {
      userId: session.user.id,
      name,
      description: description || '',
      contactListId: new mongoose.Types.ObjectId(contactListId),
      templateId: templateId ? new mongoose.Types.ObjectId(templateId) : null,
      message: message || '',
      senderId,
      providerId: new mongoose.Types.ObjectId(providerId),
      country,
      contactCount: contactCount, // Store the contact count
      estimatedCost: costData.totalCost, // Store the calculated cost
      matchedContacts: costData.matchedContacts,
      totalContacts: costData.totalContacts,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status,
      // Initialize counters (will be updated by queue service)
      sentCount: 0,
      failedCount: 0,
      deliveredCount: 0,
      actualCost: 0,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const newCampaign = await SmsCampaign.create(campaignData);
    
    // Populate the campaign with related data
    await newCampaign.populate('contactListId', 'name contactCount');
    await newCampaign.populate('templateId', 'name');
    await newCampaign.populate('providerId', 'name');

    return NextResponse.json({
      campaign: newCampaign,
      message: 'Campaign created successfully'
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
} 