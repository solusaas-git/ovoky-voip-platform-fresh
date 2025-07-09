import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import SmsBlacklistedNumber from '@/models/SmsBlacklistedNumber';

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
    
    const blacklistedNumber = await SmsBlacklistedNumber.findOne({
      _id: id,
      userId: session.user.id,
      isGlobal: false // Only allow users to delete their own blacklisted numbers
    });

    if (!blacklistedNumber) {
      return NextResponse.json({ error: 'Blacklisted number not found' }, { status: 404 });
    }

    await SmsBlacklistedNumber.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Blacklisted number removed successfully'
    });
  } catch (error) {
    console.error('Failed to delete blacklisted number:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 