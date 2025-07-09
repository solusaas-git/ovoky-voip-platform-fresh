import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import SchedulerSettingsModel from '@/models/SchedulerSettings';
import { SchedulerService } from '@/services/SchedulerService';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Get the scheduler settings (there should only be one document)
    let schedulerSettings = await SchedulerSettingsModel.findOne();
    
    // If no settings exist, create default settings
    if (!schedulerSettings) {
      schedulerSettings = new SchedulerSettingsModel({
        enabled: true,
        checkInterval: 360, // 6 hours in minutes
        timezone: 'Europe/London',
      });
      await schedulerSettings.save();
    }

    return NextResponse.json(schedulerSettings);
  } catch (error) {
    console.error('Error fetching scheduler settings:', error);
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

    // Validate input
    const {
      enabled,
      checkInterval,
      timezone
    } = body;

    // Basic validation
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Enabled must be a boolean value' }, { status: 400 });
    }

    if (typeof checkInterval !== 'number' || checkInterval < 30 || checkInterval > 10080) {
      return NextResponse.json({ 
        error: 'Check interval must be between 30 minutes and 7 days (10080 minutes)' 
      }, { status: 400 });
    }

    if (!timezone || typeof timezone !== 'string') {
      return NextResponse.json({ error: 'Valid timezone is required' }, { status: 400 });
    }

    // Check if scheduler settings already exist
    let schedulerSettings = await SchedulerSettingsModel.findOne();

    const settingsData = {
      enabled: Boolean(enabled),
      checkInterval: Number(checkInterval),
      timezone: timezone.trim(),
    };

    if (schedulerSettings) {
      // Update existing settings
      Object.assign(schedulerSettings, settingsData);
      await schedulerSettings.save();
    } else {
      // Create new settings
      schedulerSettings = new SchedulerSettingsModel(settingsData);
      await schedulerSettings.save();
    }

    // Apply the new settings to the scheduler service
    try {
      const scheduler = SchedulerService.getInstance();
      await scheduler.updateFromDatabaseSettings();
    } catch (schedulerError) {
      console.error('Error applying scheduler settings:', schedulerError);
      // Don't fail the request if scheduler update fails
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduler settings updated successfully',
      settings: schedulerSettings
    });
  } catch (error) {
    console.error('Error saving scheduler settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 