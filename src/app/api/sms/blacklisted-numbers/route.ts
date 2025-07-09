import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import SmsBlacklistedNumber from '@/models/SmsBlacklistedNumber';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    const blacklistedNumbers = await SmsBlacklistedNumber.findByUserId(session.user.id);
    
    return NextResponse.json({
      success: true,
      blacklistedNumbers: blacklistedNumbers.map(number => ({
        _id: number._id?.toString() || '',
        phoneNumber: number.phoneNumber,
        reason: number.reason,
        isGlobal: number.isGlobal,
        notes: number.notes,
        tags: number.tags,
        addedBy: number.addedBy,
        createdAt: number.createdAt.toISOString(),
        updatedAt: number.updatedAt.toISOString(),
      }))
    });
  } catch (error) {
    console.error('Failed to fetch blacklisted numbers:', error);
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
    const { phoneNumber, reason } = body;

    // Validate required fields
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Validate phone number format
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (!/^\+?[1-9]\d{6,19}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: 'Phone number must be in valid international format' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    try {
      const blacklistedNumber = await SmsBlacklistedNumber.addToBlacklist(
        session.user.id,
        phoneNumber,
        reason
      );

      return NextResponse.json({
        success: true,
        blacklistedNumber: {
          _id: blacklistedNumber._id?.toString() || '',
          phoneNumber: blacklistedNumber.phoneNumber,
          reason: blacklistedNumber.reason,
          isGlobal: blacklistedNumber.isGlobal,
          notes: blacklistedNumber.notes,
          tags: blacklistedNumber.tags,
          createdAt: blacklistedNumber.createdAt.toISOString(),
          updatedAt: blacklistedNumber.updatedAt.toISOString(),
        }
      });
    } catch (error: any) {
      if (error.message === 'Phone number is already blacklisted') {
        return NextResponse.json(
          { error: 'This phone number is already blacklisted' },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Failed to add blacklisted number:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 