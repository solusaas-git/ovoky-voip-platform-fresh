import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { PaymentGateway } from '@/models/PaymentGateway';
import { connectToDatabase } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Get only active gateways with limited information for users
    const gateways = await PaymentGateway.find({ isActive: true })
      .select('name provider settings.allowedCurrencies settings.minimumAmount settings.maximumAmount settings.processingFee settings.fixedFee')
      .sort({ createdAt: -1 });

    return NextResponse.json({ gateways });
  } catch (error) {
    console.error('Error fetching available payment gateways:', error);
    return NextResponse.json({ error: 'Failed to fetch payment gateways' }, { status: 500 });
  }
} 