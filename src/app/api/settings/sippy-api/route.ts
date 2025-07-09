import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import Settings from '@/models/Settings';
import { connectToDatabase } from '@/lib/db';

// Keys for Sippy API settings
const SIPPY_USERNAME_KEY = 'sippy_api_username';
const SIPPY_PASSWORD_KEY = 'sippy_api_password';
const SIPPY_HOST_KEY = 'sippy_api_host';

// GET handler to retrieve Sippy API settings
export async function GET() {
  // Verify the user is authenticated and is an admin
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Retrieve settings
    const username = await Settings.getSetting(SIPPY_USERNAME_KEY);
    const password = await Settings.getSetting(SIPPY_PASSWORD_KEY);
    const host = await Settings.getSetting(SIPPY_HOST_KEY);
    
    return NextResponse.json({
      username,
      password,
      host,
    });
  } catch (error) {
    console.error('Error retrieving Sippy API settings:', error);
    return NextResponse.json({ error: 'Failed to retrieve settings' }, { status: 500 });
  }
}

// POST handler to save Sippy API settings
export async function POST(request: NextRequest) {
  // Verify the user is authenticated and is an admin
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  try {
    // Parse request body
    const data = await request.json();
    
    // Validate required fields
    if (!data.username || !data.password || !data.host) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    
    // Connect to the database
    await connectToDatabase();
    
    // Save settings
    await Settings.setSetting(SIPPY_USERNAME_KEY, data.username, false);
    await Settings.setSetting(SIPPY_PASSWORD_KEY, data.password, true); // Encrypt password
    await Settings.setSetting(SIPPY_HOST_KEY, data.host, false);
    
    return NextResponse.json({
      success: true,
      message: 'Sippy API settings saved successfully',
    });
  } catch (error) {
    console.error('Error saving Sippy API settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
} 