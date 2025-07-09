import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClientFactory } from '@/lib/sippy';

// GET handler to retrieve active calls for a specific account
export async function GET(
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
    
    // Get the Sippy account ID from the params
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing ID parameter' }, { status: 400 });
    }
    
    const accountId = parseInt(id, 10);
    
    if (isNaN(accountId)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }
    
    // For non-admin users, ensure they can only access their own account
    if (currentUser.role !== 'admin' && currentUser.sippyAccountId !== accountId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get Sippy API credentials from settings
    const credentials = await getSippyApiCredentials();
    
    if (!credentials) {
      return NextResponse.json({ error: 'Sippy API not configured' }, { status: 500 });
    }
    
    // Create specialized calls client for robust XML parsing
    const callsClient = SippyClientFactory.createCallsClient(credentials);
    
    // Fetch active calls using the new calls client with robust parsing
    const calls = await callsClient.getActiveCalls({ i_account: accountId });
    
    // Return calls data - always return an array (even if empty)
    return NextResponse.json({ calls });
  } catch (error) {
    console.error('❌ Error fetching Sippy active calls data:', error);
    
    // Enhanced error handling
    let errorMessage = 'Failed to fetch active calls data';
    let errorType = 'unknown';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('timeout')) {
        errorType = 'timeout';
        errorMessage = 'Active calls request timed out. Please try again.';
      } else if (error.message.includes('Sippy API Fault')) {
        errorType = 'sippy_fault';
      } else if (error.message.includes('No response received')) {
        errorType = 'network';
        errorMessage = 'Network connectivity issue. Check Sippy API endpoint and credentials.';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        errorType,
        calls: [], // Always return empty array on error to prevent frontend crashes
        debugInfo: {
          originalError: error instanceof Error ? error.message : 'Unknown error',
          suggestion: errorType === 'timeout' 
            ? 'Check network connectivity and try again'
            : 'Verify Sippy API configuration and credentials'
        }
      },
      { status: 500 }
    );
  }
} 