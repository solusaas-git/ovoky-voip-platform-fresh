import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import SmsSenderId from '@/models/SmsSenderId';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();
    
    const senderId = await SmsSenderId.findOne({
      _id: id,
      userId: session.user.id
    });

    if (!senderId) {
      return NextResponse.json({ error: 'Sender ID not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      senderId: {
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
      }
    });
  } catch (error) {
    console.error('Failed to fetch sender ID:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();
    
    const senderId = await SmsSenderId.findOne({
      _id: id,
      userId: session.user.id
    });

    if (!senderId) {
      return NextResponse.json({ error: 'Sender ID not found' }, { status: 404 });
    }

    // Only allow deletion of pending or rejected sender IDs
    if (senderId.status === 'approved') {
      return NextResponse.json(
        { error: 'Cannot delete approved sender ID' },
        { status: 400 }
      );
    }

    await SmsSenderId.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Sender ID deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete sender ID:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 