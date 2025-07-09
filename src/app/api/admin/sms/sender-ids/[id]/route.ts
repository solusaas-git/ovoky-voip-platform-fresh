import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import SmsSenderId from '@/models/SmsSenderId';
import { connectToDatabase } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, rejectionReason, suspensionReason } = body;

    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected', 'suspended'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await connectToDatabase();

    // Find and update the sender ID
    const updateData: any = { status };
    
    if (status === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }
    
    if (status === 'suspended' && suspensionReason) {
      updateData.suspensionReason = suspensionReason;
    }

    // Clear rejection/suspension reasons when approving
    if (status === 'approved') {
      updateData.rejectionReason = null;
      updateData.suspensionReason = null;
    }

    const senderId = await SmsSenderId.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!senderId) {
      return NextResponse.json({ error: 'Sender ID not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      senderId
    });
  } catch (error) {
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
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    await connectToDatabase();

    const senderId = await SmsSenderId.findByIdAndDelete(id);

    if (!senderId) {
      return NextResponse.json({ error: 'Sender ID not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Sender ID deleted successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 