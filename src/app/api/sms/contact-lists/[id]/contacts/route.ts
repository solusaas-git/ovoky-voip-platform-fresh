import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import SmsContact from '@/models/SmsContact';
import SmsContactList from '@/models/SmsContactList';
import mongoose from 'mongoose';

// GET /api/sms/contact-lists/[id]/contacts - Get contacts from a list
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

    // Verify contact list belongs to user
    const contactList = await SmsContactList.findOne({
      _id: id,
      userId: session.user.id
    });

    if (!contactList) {
      return NextResponse.json({ error: 'Contact list not found' }, { status: 404 });
    }

    // Get pagination and search parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    // Build search query
    const searchQuery: any = {
      contactListId: id,
      userId: session.user.id,
      isActive: true
    };

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      searchQuery.$or = [
        { phoneNumber: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { address: searchRegex },
        { city: searchRegex }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await SmsContact.countDocuments(searchQuery);

    // Get contacts from the list with pagination
    const contacts = await SmsContact.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      success: true,
      contacts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

// POST /api/sms/contact-lists/[id]/contacts - Add a contact to a list
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
      return NextResponse.json({ error: 'Invalid contact list ID' }, { status: 400 });
    }

    // Verify contact list belongs to user
    const contactList = await SmsContactList.findOne({
      _id: id,
      userId: session.user.id
    });

    if (!contactList) {
      return NextResponse.json({ error: 'Contact list not found' }, { status: 404 });
    }

    const {
      phoneNumber,
      firstName,
      lastName,
      address,
      city,
      zipCode,
      dateOfBirth,
      customFields
    } = await request.json();

    // Validate required fields
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Check for duplicate phone number within user's contacts
    const existingContact = await SmsContact.findOne({
      userId: session.user.id,
      phoneNumber: normalizedPhone
    });

    if (existingContact) {
      return NextResponse.json(
        { error: 'A contact with this phone number already exists' },
        { status: 400 }
      );
    }

    // Create new contact
    const contact = new SmsContact({
      userId: session.user.id,
      contactListId: id,
      phoneNumber: normalizedPhone,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      address: address || undefined,
      city: city || undefined,
      zipCode: zipCode || undefined,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      customFields: customFields || {},
      isActive: true
    });

    await contact.save();

    // Update contact list count
    await contactList.updateContactCount();

    return NextResponse.json({
      success: true,
      contact,
      message: 'Contact added successfully'
    });

  } catch (error) {
    console.error('Error adding contact:', error);
    return NextResponse.json({ error: 'Failed to add contact' }, { status: 500 });
  }
} 