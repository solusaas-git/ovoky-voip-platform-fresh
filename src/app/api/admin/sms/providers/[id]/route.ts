import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import SmsProvider from '@/models/SmsGateway';
import { connectToDatabase } from '@/lib/db';

export async function GET(
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

    const provider = await SmsProvider.findById(id);
    
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      provider
    });
  } catch (error) {
    console.error('Failed to fetch SMS provider:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    
    await connectToDatabase();

    const provider = await SmsProvider.findById(id);
    
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Update provider with new data
    const updatedProvider = await SmsProvider.findByIdAndUpdate(
      id,
      {
        name: body.name !== undefined ? body.name : provider.name,
        displayName: body.displayName !== undefined ? body.displayName : provider.displayName,
        type: body.type !== undefined ? body.type : provider.type,
        provider: body.provider !== undefined ? body.provider : provider.provider,
        isActive: body.isActive !== undefined ? body.isActive : provider.isActive,
        apiEndpoint: body.apiEndpoint !== undefined ? body.apiEndpoint : provider.apiEndpoint,
        // Only update sensitive fields if new values are provided
        apiKey: body.apiKey ? body.apiKey : provider.apiKey,
        apiSecret: body.apiSecret ? body.apiSecret : provider.apiSecret,
        supportedCountries: body.supportedCountries !== undefined ? body.supportedCountries : provider.supportedCountries,
        rateLimit: {
          messagesPerSecond: body.messagesPerSecond !== undefined ? body.messagesPerSecond : (provider.rateLimit?.messagesPerSecond || 10),
          messagesPerMinute: body.messagesPerMinute !== undefined ? body.messagesPerMinute : (provider.rateLimit?.messagesPerMinute || 100),
          messagesPerHour: body.messagesPerHour !== undefined ? body.messagesPerHour : (provider.rateLimit?.messagesPerHour || 1000)
        },
        webhookUrl: body.webhookUrl !== undefined ? body.webhookUrl : provider.webhookUrl,
        settings: body.settings !== undefined ? body.settings : (provider.settings || {})
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      provider: updatedProvider
    });
  } catch (error) {
    console.error('Failed to update SMS provider:', error);
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

    const provider = await SmsProvider.findById(id);
    
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    await SmsProvider.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Provider deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete SMS provider:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 