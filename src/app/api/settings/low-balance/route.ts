import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import connectToDatabase from '@/lib/db';
import { LowBalanceSettings } from '@/models/NotificationLog';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Get the low balance settings (there should only be one document)
    let lowBalanceSettings = await LowBalanceSettings.findOne();
    
    // If no settings exist, create default settings
    if (!lowBalanceSettings) {
      lowBalanceSettings = new LowBalanceSettings({
        lowBalanceThreshold: 10.0000,
        zeroBalanceThreshold: 0.0000,
        negativeBalanceThreshold: -1.0000,
        enableLowBalanceNotifications: true,
        enableZeroBalanceNotifications: true,
        enableNegativeBalanceNotifications: true,
        notificationFrequencyHours: 24,
      });
      await lowBalanceSettings.save();
    }

    return NextResponse.json(lowBalanceSettings);
  } catch (error) {
    console.error('Error fetching low balance settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    await connectToDatabase();

    // Check if low balance settings already exist
    let lowBalanceSettings = await LowBalanceSettings.findOne();

    const settingsData = {
      lowBalanceThreshold: parseFloat(body.lowBalanceThreshold) || 10.0000,
      zeroBalanceThreshold: parseFloat(body.zeroBalanceThreshold) || 0.0000,
      negativeBalanceThreshold: parseFloat(body.negativeBalanceThreshold) || -1.0000,
      enableLowBalanceNotifications: body.enableLowBalanceNotifications === true,
      enableZeroBalanceNotifications: body.enableZeroBalanceNotifications === true,
      enableNegativeBalanceNotifications: body.enableNegativeBalanceNotifications === true,
      notificationFrequencyHours: parseInt(body.notificationFrequencyHours) || 24,
    };

    if (lowBalanceSettings) {
      // Update existing settings
      Object.assign(lowBalanceSettings, settingsData);
      await lowBalanceSettings.save();
    } else {
      // Create new settings
      lowBalanceSettings = new LowBalanceSettings(settingsData);
      await lowBalanceSettings.save();
    }

    return NextResponse.json(lowBalanceSettings);
  } catch (error) {
    console.error('Error saving low balance settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  return POST(request); // Same logic for updates
} 