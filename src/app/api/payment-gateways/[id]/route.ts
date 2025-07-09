import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { PaymentGateway } from '@/models/PaymentGateway';
import { connectToDatabase } from '@/lib/db';

// TypeScript interface
interface PaymentGatewayUpdateData {
  updatedBy: string;
  updatedAt: Date;
  name?: string;
  configuration?: Record<string, any>;
  settings?: Record<string, any>;
  isActive?: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();
    
    const gateway = await PaymentGateway.findById(id)
      .select('-configuration.secretKey -configuration.clientSecret -configuration.accessToken -configuration.keySecret -configuration.webhookSecret');

    if (!gateway) {
      return NextResponse.json({ error: 'Payment gateway not found' }, { status: 404 });
    }

    return NextResponse.json({ gateway });
  } catch (error) {
    console.error('Error fetching payment gateway:', error);
    return NextResponse.json({ error: 'Failed to fetch payment gateway' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, configuration, settings, isActive } = body;

    await connectToDatabase();

    const gateway = await PaymentGateway.findById(id);
    if (!gateway) {
      return NextResponse.json({ error: 'Payment gateway not found' }, { status: 404 });
    }

    // If making this gateway active, deactivate other gateways of the same provider
    if (isActive && !gateway.isActive) {
      await PaymentGateway.updateMany(
        { provider: gateway.provider, isActive: true, _id: { $ne: id } },
        { isActive: false, updatedBy: user.id, updatedAt: new Date() }
      );
    }

    // Update gateway
    const updateData: PaymentGatewayUpdateData = {
      updatedBy: user.id,
      updatedAt: new Date()
    };

    if (name) updateData.name = name;
    if (configuration) {
      // Merge configuration, keeping existing values if not provided
      updateData.configuration = {
        ...gateway.configuration,
        ...configuration
      };
    }
    if (settings) {
      updateData.settings = {
        ...gateway.settings,
        ...settings
      };
    }
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const updatedGateway = await PaymentGateway.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('-configuration.secretKey -configuration.clientSecret -configuration.accessToken -configuration.keySecret -configuration.webhookSecret');

    return NextResponse.json({ 
      message: 'Payment gateway updated successfully',
      gateway: updatedGateway 
    });
  } catch (error) {
    console.error('Error updating payment gateway:', error);
    return NextResponse.json({ error: 'Failed to update payment gateway' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const gateway = await PaymentGateway.findByIdAndDelete(id);
    if (!gateway) {
      return NextResponse.json({ error: 'Payment gateway not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Payment gateway deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment gateway:', error);
    return NextResponse.json({ error: 'Failed to delete payment gateway' }, { status: 500 });
  }
} 