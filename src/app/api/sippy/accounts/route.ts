import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClient } from '@/lib/sippyClient';

// GET handler to retrieve all Sippy accounts (admin only)
export async function GET(request: NextRequest) {
  try {
    // Verify the user is authenticated and is an admin
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get query parameters for pagination
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '1000'; // Default to large limit to get all accounts
    const offset = searchParams.get('offset') || '0';
    
    console.log('Fetching all Sippy accounts with params:', { limit, offset });
    
    // Get Sippy API credentials from settings
    const credentials = await getSippyApiCredentials();
    
    if (!credentials) {
      return NextResponse.json({ error: 'Sippy API not configured' }, { status: 500 });
    }
    
    // Create Sippy client
    const sippyClient = new SippyClient(credentials);
    
    // Fetch all accounts from Sippy
    const accounts = await sippyClient.getAccountsList({
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    console.log(`Fetched ${accounts.length} Sippy accounts`);
    
    // Return accounts data
    return NextResponse.json({ 
      accounts,
      count: accounts.length
    });
  } catch (error) {
    console.error('Error fetching Sippy accounts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
} 