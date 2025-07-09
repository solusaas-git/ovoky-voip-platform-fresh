import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import SmsSenderId from '@/models/SmsSenderId';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    const senderIds = await SmsSenderId.findByUserId(session.user.id);
    
    return NextResponse.json({
      success: true,
      senderIds: senderIds.map(senderId => ({
        _id: senderId._id?.toString() || '',
        senderId: senderId.senderId,
        description: senderId.description,
        status: senderId.status,
        type: senderId.senderId.match(/^(\+)?[0-9]+$/) ? 'numeric' : 'alphanumeric',
        usageCount: senderId.usageCount,
        lastUsedAt: senderId.lastUsedAt?.toISOString(),
        isDefault: senderId.isDefault,
        rejectionReason: senderId.rejectionReason,
        suspensionReason: senderId.suspensionReason,
        createdAt: senderId.createdAt.toISOString(),
        updatedAt: senderId.updatedAt.toISOString(),
      }))
    });
  } catch (error) {
    console.error('Failed to fetch sender IDs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { senderId, description, type } = body;

    // Validate required fields
    if (!senderId || !description) {
      return NextResponse.json(
        { error: 'Sender ID and description are required' },
        { status: 400 }
      );
    }

    // Validate sender ID format based on type
    if (type === 'alphanumeric') {
      // Alphanumeric sender IDs: max 11 characters, letters and numbers only
      if (senderId.length > 11) {
        return NextResponse.json(
          { error: 'Alphanumeric sender ID cannot exceed 11 characters' },
          { status: 400 }
        );
      }
      if (!/^[a-zA-Z0-9]+$/.test(senderId)) {
        return NextResponse.json(
          { error: 'Alphanumeric sender ID must contain only letters and numbers' },
          { status: 400 }
        );
      }
      if (/^\d+$/.test(senderId)) {
        return NextResponse.json(
          { error: 'Alphanumeric sender ID cannot be only digits' },
          { status: 400 }
        );
      }
    } else if (type === 'numeric') {
      // Numeric sender IDs: phone numbers with optional + prefix, up to 20 characters
      if (senderId.length > 20) {
        return NextResponse.json(
          { error: 'Numeric sender ID cannot exceed 20 characters' },
          { status: 400 }
        );
      }
      if (!/^(\+)?[0-9]+$/.test(senderId)) {
        return NextResponse.json(
          { error: 'Numeric sender ID must be a valid phone number (digits only, optional + prefix)' },
          { status: 400 }
        );
      }
      if (senderId.replace('+', '').length < 7) {
        return NextResponse.json(
          { error: 'Numeric sender ID must be at least 7 digits' },
          { status: 400 }
        );
      }
    }

    await connectToDatabase();

    // Check if sender ID already exists for this user
    const existingSenderId = await SmsSenderId.findOne({
      userId: session.user.id,
      senderId: senderId.toUpperCase()
    });

    if (existingSenderId) {
      return NextResponse.json(
        { error: 'This sender ID already exists' },
        { status: 400 }
      );
    }

    // Create new sender ID request
    const newSenderId = new SmsSenderId({
      userId: session.user.id,
      senderId: senderId.toUpperCase(),
      description,
      status: 'pending',
      usageCount: 0,
      isDefault: false,
    });

    await newSenderId.save();

    return NextResponse.json({
      success: true,
      senderId: {
        _id: newSenderId._id?.toString() || '',
        senderId: newSenderId.senderId,
        description: newSenderId.description,
        status: newSenderId.status,
        type: newSenderId.senderId.match(/^(\+)?[0-9]+$/) ? 'numeric' : 'alphanumeric',
        usageCount: newSenderId.usageCount,
        isDefault: newSenderId.isDefault,
        createdAt: newSenderId.createdAt.toISOString(),
        updatedAt: newSenderId.updatedAt.toISOString(),
      }
    });
  } catch (error) {
    console.error('Failed to create sender ID:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 