import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClient } from '@/lib/sippyClient';

// POST handler to test Sippy API connection
export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated and is an admin
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get Sippy API credentials from body or from settings
    let credentials;
    
    try {
      // Try to get credentials from request body first
      const body = await request.json();
      
      if (body && body.username && body.password && body.host) {
        credentials = {
          username: body.username,
          password: body.password,
          host: body.host
        };
        console.log('Using credentials from request body');
      }
    } catch {
      // No body or invalid JSON, continue to use stored credentials
      console.log('No valid credentials in request body, using stored credentials');
    }
    
    // If no credentials in body, use stored credentials
    if (!credentials) {
      credentials = await getSippyApiCredentials();
      
      if (!credentials) {
        return NextResponse.json({ error: 'Sippy API not configured' }, { status: 500 });
      }
    }
    
    console.log('Testing Sippy API connection with credentials:', {
      username: credentials.username,
      host: credentials.host,
      password: '********' // Don't log actual password
    });
    
    // Create Sippy client
    const sippyClient = new SippyClient(credentials);
    
    // Try to get account list as a test
    try {
      // Use a small limit to minimize data transfer
      const accounts = await sippyClient.getAccountsList({ limit: 1 });
      return NextResponse.json({ 
        success: true, 
        message: 'Connection successful',
        sample_data: accounts.length > 0 ? accounts[0] : null
      });
    } catch (error) {
      console.error('Error testing Sippy API connection:', error);
      return NextResponse.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to connect to Sippy API'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in test-connection endpoint:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'An unexpected error occurred' 
    }, { status: 500 });
  }
} 