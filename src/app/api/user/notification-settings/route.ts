import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import UserNotificationSettingsModel from '@/models/UserNotificationSettings';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Get user's notification settings
    const settings = await UserNotificationSettingsModel.findOne({ 
      userId: currentUser.id 
    });

    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching user notification settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 