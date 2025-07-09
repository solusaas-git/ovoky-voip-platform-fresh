import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import SmsCampaign from '@/models/SmsCampaign';
import SmsContactList from '@/models/SmsContactList';
import SmsContact from '@/models/SmsContact';
import SmsTemplate from '@/models/SmsTemplate';
import SmsProvider from '@/models/SmsGateway';
import RateDeckAssignment from '@/models/RateDeckAssignment';
import SmsRate from '@/models/SmsRate';
import mongoose from 'mongoose';

// Helper function to calculate estimated cost for a campaign
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

    console.log('[Cost Calculation] Rate deck assignment: Found');

    // Get contacts from the list
    const contacts = await SmsContact.find({
      contactListId: new mongoose.Types.ObjectId(contactListId),
      isActive: true
    }).lean();

    console.log(`[Cost Calculation] Found ${contacts.length} contacts in list ${contactListId}`);

    if (contacts.length === 0) {
      return { totalCost: 0, matchedContacts: 0, totalContacts: 0 };
    }

    // Find rate for the selected country
    const rate = await SmsRate.findOne({
      rateDeckId: rateDeckAssignment.rateDeckId,
      country: country
    });

    if (rate) {
      const totalCost = rate.rate * contacts.length;
      console.log(`[Cost Calculation] Found rate for ${country}: ${rate.rate} × ${contacts.length} contacts = ${totalCost}`);
      
      return {
        totalCost,
        matchedContacts: contacts.length,
        totalContacts: contacts.length
      };
    } else {
      console.log(`[Cost Calculation] No rate found for ${country}`);
      return {
        totalCost: 0,
        matchedContacts: 0,
        totalContacts: contacts.length
      };
    }
  } catch (error) {
    console.error('[Cost Calculation] Error:', error);
    return { totalCost: 0, matchedContacts: 0, totalContacts: 0 };
  }
};

// GET /api/sms/campaigns/[id] - Get single campaign
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
    })
    .populate('contactListId', 'name contactCount')
    .populate('templateId', 'name')
    .populate('providerId', 'name');
    
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 });
  }
}

// PUT /api/sms/campaigns/[id] - Update campaign
export async function PUT(
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
      scheduledAt
    } = body;

    console.log('🔧 Updating campaign with data:', {
      name,
      description,
      contactListId,
      templateId,
      message,
      senderId,
      providerId,
      country,
      scheduledAt
    });

    // Validation
    if (!name || !contactListId || !message || !senderId || !providerId || !country) {
      return NextResponse.json(
        { error: 'Missing required fields: name, contactListId, message, senderId, providerId, and country are required' },
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

    // Get contact count from the contact list
    const contactList = await SmsContactList.findById(contactListId);
    if (!contactList) {
      return NextResponse.json(
        { error: 'Contact list not found' },
        { status: 404 }
      );
    }

    // Get real contact count from database
    const realContactCount = await SmsContact.countDocuments({
      contactListId: contactListId,
      isActive: true
    });

    // Update the stored count if it's different
    if (contactList.contactCount !== realContactCount) {
      contactList.contactCount = realContactCount;
      await contactList.save();
    }

    const contactCount = realContactCount;
    const estimatedCost = await calculateEstimatedCost(contactListId, session.user.id, country);

    // Update campaign
    campaign.name = name;
    campaign.description = description || undefined;
    campaign.contactListId = contactListId;
    campaign.templateId = templateId || undefined;
    campaign.message = message;
    campaign.senderId = senderId;
    campaign.providerId = providerId;
    campaign.country = country;
    campaign.scheduledAt = scheduledAt ? new Date(scheduledAt) : undefined;
    campaign.contactCount = contactCount;
    campaign.estimatedCost = estimatedCost.totalCost;
    campaign.status = scheduledAt ? 'scheduled' : 'draft';

    console.log('💾 Saving campaign with updates:', {
      _id: campaign._id,
      name: campaign.name,
      contactListId: campaign.contactListId,
      templateId: campaign.templateId,
      senderId: campaign.senderId,
      providerId: campaign.providerId,
      country: campaign.country,
      status: campaign.status
    });

    await campaign.save();
    console.log('✅ Campaign saved successfully');

    // Populate the updated campaign
    await campaign.populate('contactListId', 'name contactCount');
    await campaign.populate('templateId', 'name');
    await campaign.populate('providerId', 'name');

    console.log('📤 Returning updated campaign');

    return NextResponse.json({
      campaign,
      message: 'Campaign updated successfully'
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

// DELETE /api/sms/campaigns/[id] - Delete campaign
export async function DELETE(
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
    
    // Check if campaign can be deleted
    if (['sending'].includes(campaign.status)) {
      return NextResponse.json(
        { error: 'Cannot delete campaign that is currently sending' },
        { status: 400 }
      );
    }

    await SmsCampaign.findByIdAndDelete(id);

    return NextResponse.json({
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
} 