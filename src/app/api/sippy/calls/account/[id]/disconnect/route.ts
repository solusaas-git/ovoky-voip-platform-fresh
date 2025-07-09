import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClient } from '@/lib/sippyClient';

interface ActiveCall {
  I_CONNECTION?: string | number;
  ID?: string | number;
  i_call?: string | number;
}



// POST handler to disconnect all calls for a specific account
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
    
    // Get the account ID from the params
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing account ID parameter' }, { status: 400 });
    }
    
    const accountId = parseInt(id, 10);
    if (isNaN(accountId)) {
      return NextResponse.json({ error: 'Invalid account ID format' }, { status: 400 });
    }
    
    // For non-admin users, ensure they can only disconnect calls for their own account
    if (currentUser.role !== 'admin' && currentUser.sippyAccountId !== accountId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get Sippy API credentials from settings
    const credentials = await getSippyApiCredentials();
    
    if (!credentials) {
      return NextResponse.json({ error: 'Sippy API not configured' }, { status: 500 });
    }
    
    // Create Sippy client
    const sippyClient = new SippyClient(credentials);

    console.log('Disconnecting all calls for account:', accountId);
    
    // First, get all active calls for the account
    const activeCalls = await sippyClient.listActiveCalls({ i_account: accountId });
    console.log('Found active calls:', activeCalls);
    
    if (!activeCalls || activeCalls.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No active calls to disconnect',
        disconnectedCount: 0 
      });
    }
    
    // Disconnect each call individually
    const disconnectPromises = activeCalls.map(async (call: ActiveCall) => {
      try {
        // Use I_CONNECTION as primary call ID, fallback to ID or i_call
        const callId = call.I_CONNECTION || call.ID || call.i_call;
        if (!callId) {
          throw new Error('No valid call ID found');
        }
        const numericCallId = parseInt(String(callId), 10);
        
        if (isNaN(numericCallId)) {
          throw new Error(`Invalid call ID: ${callId}`);
        }
        
        await sippyClient.disconnectCall({ i_call: numericCallId });
        return { success: true, callId: callId };
      } catch (error) {
        console.error('Failed to disconnect call:', call.I_CONNECTION || call.ID || call.i_call, error);
        return { success: false, callId: call.I_CONNECTION || call.ID || call.i_call, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
    
    const results = await Promise.allSettled(disconnectPromises);
    const successful = results.filter(result => result.status === 'fulfilled' && result.value.success).length;
    const failed = results.length - successful;
    
    console.log(`Disconnect all calls result: ${successful} successful, ${failed} failed`);
    
    return NextResponse.json({ 
      success: true, 
      message: `Disconnected ${successful} calls${failed > 0 ? `, ${failed} failed` : ''}`,
      disconnectedCount: successful,
      failedCount: failed,
      results: results.map(result => result.status === 'fulfilled' ? result.value : { success: false, error: 'Promise rejected' })
    });
  } catch (error) {
    console.error('Error disconnecting all calls:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect all calls' },
      { status: 500 }
    );
  }
} 