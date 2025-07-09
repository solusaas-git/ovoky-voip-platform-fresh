import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClientFactory } from '@/lib/sippy';

// GET handler to retrieve Sippy account data
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
    
    // Get the Sippy account ID from the params - ensure params is properly accessed
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
    
    // Create specialized dashboard client for optimized performance
    const dashboardClient = SippyClientFactory.createDashboardClient(credentials);
    
    // Fetch account information from Sippy using dashboard client
    // This returns raw XML for compatibility with existing dashboard parsers
    const accountInfo = await dashboardClient.getAccountInfo({ i_account: accountId });
    
    // Return account data (raw XML as expected by dashboard)
    return NextResponse.json({ accountInfo });
  } catch (error) {
    console.error('Error fetching Sippy account data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch account data' },
      { status: 500 }
    );
  }
} 