import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClient } from '@/lib/sippyClient';

// POST handler to disconnect a specific call
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify the user is authenticated
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Await params before accessing its properties
    const { id } = await params;
    
    // Get the call ID from the params
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing call ID parameter' }, { status: 400 });
    }
    
    // Get Sippy API credentials from settings
    const credentials = await getSippyApiCredentials();
    
    if (!credentials) {
      return NextResponse.json({ error: 'Sippy API not configured' }, { status: 500 });
    }
    
    // Create Sippy client
    const sippyClient = new SippyClient(credentials);

    console.log('Disconnecting call with ID:', id);
    
    // Convert string ID to number for Sippy API
    const callId = parseInt(id, 10);
    if (isNaN(callId)) {
      return NextResponse.json({ error: 'Invalid call ID format' }, { status: 400 });
    }
    
    // Disconnect the call using Sippy API
    const result = await sippyClient.disconnectCall({ i_call: callId });
    console.log('Disconnect call result:', result);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Call disconnected successfully',
      callId: id,
      result 
    });
  } catch (error) {
    console.error('Error disconnecting call:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect call' },
      { status: 500 }
    );
  }
} 