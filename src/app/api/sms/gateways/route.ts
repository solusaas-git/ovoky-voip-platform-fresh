import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import SmsProvider from '@/models/SmsGateway';
import { connectToDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const gateways = await SmsProvider.find({ isActive: true })
      .sort({ name: 1 });

    return NextResponse.json({
      success: true,
      gateways
    });
  } catch (error) {
    console.error('Failed to fetch SMS gateways:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 