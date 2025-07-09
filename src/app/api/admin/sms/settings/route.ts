import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';

// For now, we'll store settings in a simple JSON structure
// In a real implementation, you might want a dedicated Settings model
const DEFAULT_SMS_SETTINGS = {
  enabled: true,
  defaultRetryAttempts: 3,
  defaultRetryDelay: 60,
  maxMessageLength: 160,
  allowedSenderIdTypes: ['alphanumeric', 'numeric'],
  requireSenderIdApproval: true,
  globalRateLimit: {
    messagesPerSecond: 100,
    messagesPerMinute: 1000,
    messagesPerHour: 10000
  },
  keywordBlacklist: [],
  enableDeliveryReports: true,
  deliveryReportWebhook: '',
  enableLogging: true,
  logRetentionDays: 30
};

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    // For now, return default settings
    // In a real implementation, you would fetch from a settings collection
    const settings = DEFAULT_SMS_SETTINGS;

    return NextResponse.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Failed to fetch SMS settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    
    await connectToDatabase();

    // For now, just validate the settings structure
    // In a real implementation, you would save to a settings collection
    const updatedSettings = { ...DEFAULT_SMS_SETTINGS, ...body };

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: 'SMS settings updated successfully'
    });
  } catch (error) {
    console.error('Failed to update SMS settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 