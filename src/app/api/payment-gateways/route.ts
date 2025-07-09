import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { PaymentGateway, IPaymentGateway } from '@/models/PaymentGateway';
import { connectToDatabase } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    const gateways = await PaymentGateway.find({})
      .select('-configuration.secretKey -configuration.clientSecret -configuration.accessToken -configuration.keySecret -configuration.webhookSecret')
      .sort({ createdAt: -1 });

    return NextResponse.json({ gateways });
  } catch (error) {
    console.error('Error fetching payment gateways:', error);
    return NextResponse.json({ error: 'Failed to fetch payment gateways' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, provider, configuration, settings, isActive } = body;

    if (!name || !provider || !configuration) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    // If making this gateway active, deactivate other gateways of the same provider
    if (isActive) {
      await PaymentGateway.updateMany(
        { provider, isActive: true },
        { isActive: false, updatedBy: user.id, updatedAt: new Date() }
      );
    }

    const gateway = new PaymentGateway({
      name,
      provider,
      configuration,
      settings: {
        allowedCurrencies: settings?.allowedCurrencies || ['USD'],
        minimumAmount: settings?.minimumAmount || 10,
        maximumAmount: settings?.maximumAmount || 10000,
        processingFee: settings?.processingFee || 2.9,
        fixedFee: settings?.fixedFee || 0.30
      },
      isActive: isActive || false,
      createdBy: user.id,
      updatedBy: user.id
    });

    await gateway.save();

    // Return without sensitive data
    const gatewayResponse = gateway.toObject();
    delete gatewayResponse.configuration.secretKey;
    delete gatewayResponse.configuration.clientSecret;
    delete gatewayResponse.configuration.accessToken;
    delete gatewayResponse.configuration.keySecret;
    delete gatewayResponse.configuration.webhookSecret;

    return NextResponse.json({ 
      message: 'Payment gateway created successfully',
      gateway: gatewayResponse 
    });
  } catch (error) {
    console.error('Error creating payment gateway:', error);
    return NextResponse.json({ error: 'Failed to create payment gateway' }, { status: 500 });
  }
} 