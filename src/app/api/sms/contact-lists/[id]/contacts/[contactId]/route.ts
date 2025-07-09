import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import SmsContact from '@/models/SmsContact';
import SmsContactList from '@/models/SmsContactList';
import mongoose from 'mongoose';

// GET /api/sms/contact-lists/[id]/contacts/[contactId] - Get single contact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { id, contactId } = await params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(contactId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Verify contact list belongs to user
    const contactList = await SmsContactList.findOne({
      _id: id,
      userId: session.user.id
    });

    if (!contactList) {
      return NextResponse.json({ error: 'Contact list not found' }, { status: 404 });
    }

    // Get the contact
    const contact = await SmsContact.findOne({
      _id: contactId,
      contactListId: id,
      userId: session.user.id,
      isActive: true
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      contact
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 });
  }
}

// PUT /api/sms/contact-lists/[id]/contacts/[contactId] - Update contact
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { id, contactId } = await params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(contactId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Verify contact list belongs to user
    const contactList = await SmsContactList.findOne({
      _id: id,
      userId: session.user.id
    });

    if (!contactList) {
      return NextResponse.json({ error: 'Contact list not found' }, { status: 404 });
    }

    // Get the contact
    const contact = await SmsContact.findOne({
      _id: contactId,
      contactListId: id,
      userId: session.user.id
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
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

    // Check for duplicate phone number (excluding current contact)
    const existingContact = await SmsContact.findOne({
      userId: session.user.id,
      phoneNumber: phoneNumber.replace(/[\s\-\(\)]/g, ''),
      _id: { $ne: contactId }
    });

    if (existingContact) {
      return NextResponse.json(
        { error: 'A contact with this phone number already exists' },
        { status: 400 }
      );
    }

    // Update contact
    contact.phoneNumber = phoneNumber;
    contact.firstName = firstName || undefined;
    contact.lastName = lastName || undefined;
    contact.address = address || undefined;
    contact.city = city || undefined;
    contact.zipCode = zipCode || undefined;
    contact.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined;
    contact.customFields = customFields || {};

    await contact.save();

    return NextResponse.json({
      success: true,
      contact,
      message: 'Contact updated successfully'
    });

  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}

// DELETE /api/sms/contact-lists/[id]/contacts/[contactId] - Delete contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { id, contactId } = await params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(contactId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Verify contact list belongs to user
    const contactList = await SmsContactList.findOne({
      _id: id,
      userId: session.user.id
    });

    if (!contactList) {
      return NextResponse.json({ error: 'Contact list not found' }, { status: 404 });
    }

    // Get and delete the contact
    const contact = await SmsContact.findOne({
      _id: contactId,
      contactListId: id,
      userId: session.user.id
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Soft delete by marking as inactive
    contact.isActive = false;
    await contact.save();

    // Update contact list count
    await contactList.updateContactCount();

    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
} 