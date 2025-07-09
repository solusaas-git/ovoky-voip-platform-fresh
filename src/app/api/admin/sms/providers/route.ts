import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import SmsProvider from '@/models/SmsGateway';
import { connectToDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    const providers = await SmsProvider.find({})
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      providers
    });
  } catch (error) {
    console.error('Failed to fetch SMS providers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      displayName,
      type,
      provider,
      isActive,
      apiEndpoint,
      apiKey,
      apiSecret,
      supportedCountries,
      messagesPerSecond,
      messagesPerMinute,
      messagesPerHour,
      webhookUrl,
      settings
    } = body;

    await connectToDatabase();

    // Check if provider name already exists
    const existingProvider = await SmsProvider.findOne({ name });
    if (existingProvider) {
      return NextResponse.json(
        { error: 'Provider with this name already exists' },
        { status: 400 }
      );
    }

    const newProvider = new SmsProvider({
      name,
      displayName,
      type,
      provider,
      isActive,
      apiEndpoint,
      apiKey,
      apiSecret,
      supportedCountries: supportedCountries || [],
      rateLimit: {
        messagesPerSecond: messagesPerSecond || 10,
        messagesPerMinute: messagesPerMinute || 100,
        messagesPerHour: messagesPerHour || 1000
      },
      webhookUrl,
      settings: settings || {}
    });

    await newProvider.save();

    return NextResponse.json({
      success: true,
      provider: newProvider
    });
  } catch (error) {
    console.error('Failed to create SMS provider:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 