import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getCurrentUser } from '@/lib/authService';
import SmsContact from '@/models/SmsContact';
import SmsContactList from '@/models/SmsContactList';

interface CreateContactRequest {
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  zipCode?: string;
  city?: string;
  customFields?: { [key: string]: string };
  listId?: string;
}

interface UpdateContactRequest extends CreateContactRequest {
  isActive?: boolean;
}

// GET /api/sms/contacts - Get user's contacts
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');

    // Build query
    const query: any = { userId: user.id };
    
    if (listId) {
      query.listId = listId;
    }

    if (search) {
      query.$or = [
        { phoneNumber: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [contacts, total] = await Promise.all([
      SmsContact.find(query)
        .populate('listId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SmsContact.countDocuments(query)
    ]);

    return NextResponse.json({
      contacts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get contacts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/sms/contacts - Create new contact
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateContactRequest = await request.json();
    const { phoneNumber, firstName, lastName, dateOfBirth, zipCode, city, customFields, listId } = body;

    // Validate required fields
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Validate phone number format
    const phoneRegex = /^\+?\d{7,15}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    // Check if contact already exists for this user
    const existingContact = await SmsContact.findOne({
      userId: user.id,
      phoneNumber
    });

    if (existingContact) {
      return NextResponse.json({ error: 'Contact with this phone number already exists' }, { status: 400 });
    }

    // Validate list if provided
    if (listId) {
      const list = await SmsContactList.findOne({
        _id: listId,
        userId: user.id
      });

      if (!list) {
        return NextResponse.json({ error: 'Invalid contact list' }, { status: 400 });
      }
    }

    // Create contact
    const contact = new SmsContact({
      userId: user.id,
      phoneNumber,
      firstName,
      lastName,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      zipCode,
      city,
      customFields: customFields || {},
      listId: listId || undefined
    });

    await contact.save();

    // Update list contact count if needed
    if (listId) {
      await SmsContactList.findByIdAndUpdate(listId, {
        $inc: { contactCount: 1 }
      });
    }

    return NextResponse.json({ contact }, { status: 201 });

  } catch (error) {
    console.error('Create contact error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/sms/contacts - Bulk update contacts
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contactIds, updates } = body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: 'Contact IDs are required' }, { status: 400 });
    }

    // Update contacts
    const result = await SmsContact.updateMany(
      { 
        _id: { $in: contactIds },
        userId: user.id 
      },
      { $set: updates }
    );

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Bulk update contacts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/sms/contacts - Bulk delete contacts
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contactIds = searchParams.get('ids')?.split(',') || [];

    if (contactIds.length === 0) {
      return NextResponse.json({ error: 'Contact IDs are required' }, { status: 400 });
    }

    // Get contacts to update list counts
    const contactsToDelete = await SmsContact.find({
      _id: { $in: contactIds },
      userId: user.id
    }).select('listId');

    // Delete contacts
    const result = await SmsContact.deleteMany({
      _id: { $in: contactIds },
      userId: user.id
    });

    // Update list contact counts
    const listUpdates = new Map();
    for (const contact of contactsToDelete) {
      if (contact.listId) {
        const currentCount = listUpdates.get(contact.listId.toString()) || 0;
        listUpdates.set(contact.listId.toString(), currentCount + 1);
      }
    }

    for (const [listId, count] of listUpdates) {
      await SmsContactList.findByIdAndUpdate(listId, {
        $inc: { contactCount: -count }
      });
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Bulk delete contacts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 