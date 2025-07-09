import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import SmsSenderId from '@/models/SmsSenderId';

export async function PATCH(
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

    // Only allow setting approved sender IDs as default
    if (senderId.status !== 'approved') {
      return NextResponse.json(
        { error: 'Only approved sender IDs can be set as default' },
        { status: 400 }
      );
    }

    // Remove default flag from all other sender IDs for this user
    await SmsSenderId.updateMany(
      { userId: session.user.id, _id: { $ne: id } },
      { $set: { isDefault: false } }
    );

    // Set this sender ID as default
    await SmsSenderId.findByIdAndUpdate(id, {
      isDefault: true
    });

    return NextResponse.json({
      success: true,
      message: 'Default sender ID updated successfully'
    });
  } catch (error) {
    console.error('Failed to set default sender ID:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 