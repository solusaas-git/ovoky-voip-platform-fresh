import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import SmsContactList from '@/models/SmsContactList';
import SmsContact from '@/models/SmsContact';
import SmsCampaign from '@/models/SmsCampaign';
import mongoose from 'mongoose';

// GET /api/sms/contact-lists/[id] - Get single contact list
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
      return NextResponse.json({ error: 'Invalid contact list ID' }, { status: 400 });
    }

    const contactList = await SmsContactList.findOne({
      _id: id,
      userId: session.user.id,
      isActive: true
    });

    if (!contactList) {
      return NextResponse.json({ error: 'Contact list not found' }, { status: 404 });
    }

    // Get usage information and real contact count
    const isUsed = await contactList.isUsedInCampaigns();
    const realContactCount = await SmsContact.countDocuments({
      contactListId: id,
      isActive: true
    });

    // Update the stored count if it's different
    if (contactList.contactCount !== realContactCount) {
      contactList.contactCount = realContactCount;
      await contactList.save();
    }

    return NextResponse.json({
      success: true,
      contactList: {
        ...contactList.toObject(),
        contactCount: realContactCount,
        canDelete: !isUsed
      }
    });

  } catch (error) {
    console.error('Error fetching contact list:', error);
    return NextResponse.json({ error: 'Failed to fetch contact list' }, { status: 500 });
  }
}

// PUT /api/sms/contact-lists/[id] - Update contact list
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
      return NextResponse.json({ error: 'Invalid contact list ID' }, { status: 400 });
    }

    const contactList = await SmsContactList.findOne({
      _id: id,
      userId: session.user.id,
      isActive: true
    });

    if (!contactList) {
      return NextResponse.json({ error: 'Contact list not found' }, { status: 404 });
    }

    const { name, description, tags } = await request.json();

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Contact list name is required' },
        { status: 400 }
      );
    }

    // Update contact list
    contactList.name = name.trim();
    contactList.description = description?.trim() || undefined;
    contactList.tags = Array.isArray(tags) ? tags : [];

    await contactList.save();

    // Get updated usage information and real contact count
    const isUsed = await contactList.isUsedInCampaigns();
    const realContactCount = await SmsContact.countDocuments({
      contactListId: id,
      isActive: true
    });

    // Update the stored count if it's different
    if (contactList.contactCount !== realContactCount) {
      contactList.contactCount = realContactCount;
      await contactList.save();
    }

    return NextResponse.json({
      success: true,
      contactList: {
        ...contactList.toObject(),
        contactCount: realContactCount,
        canDelete: !isUsed
      },
      message: 'Contact list updated successfully'
    });

  } catch (error) {
    console.error('Error updating contact list:', error);
    return NextResponse.json({ error: 'Failed to update contact list' }, { status: 500 });
  }
}

// DELETE /api/sms/contact-lists/[id] - Delete contact list
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
      return NextResponse.json({ error: 'Invalid contact list ID' }, { status: 400 });
    }

    const contactList = await SmsContactList.findOne({
      _id: id,
      userId: session.user.id
    });

    if (!contactList) {
      return NextResponse.json({ error: 'Contact list not found' }, { status: 404 });
    }

    // Check if contact list is used in campaigns
    const isUsed = await contactList.isUsedInCampaigns();
    
    if (isUsed) {
      return NextResponse.json(
        { 
          error: 'Cannot delete contact list that is used in active campaigns',
          canDelete: false
        },
        { status: 400 }
      );
    }

    // Soft delete all contacts in this list first
    await SmsContact.updateMany(
      {
        contactListId: id,
        userId: session.user.id,
        isActive: true
      },
      {
        $set: { isActive: false }
      }
    );

    // Soft delete the contact list
    contactList.isActive = false;
    await contactList.save();

    return NextResponse.json({
      success: true,
      message: 'Contact list and all its contacts deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting contact list:', error);
    return NextResponse.json({ error: 'Failed to delete contact list' }, { status: 500 });
  }
} 