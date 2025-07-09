import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClient } from '@/lib/sippyClient';

// POST - Unblock a Sippy account
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can unblock accounts
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get account ID from params
    const { id } = await params;
    const accountId = parseInt(id);
    
    if (isNaN(accountId)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    // Get Sippy API credentials
    const credentials = await getSippyApiCredentials();
    if (!credentials) {
      return NextResponse.json({ error: 'Sippy API not configured' }, { status: 500 });
    }

    // Create Sippy client and unblock the account
    const sippyClient = new SippyClient(credentials);
    
    try {
      const result = await sippyClient.unblockAccount({
        i_account: accountId
      });

      if (result.result === 'OK') {
        return NextResponse.json({
          success: true,
          message: 'Account unblocked successfully',
          accountId,
          timestamp: new Date().toISOString()
        });
      } else {
        return NextResponse.json(
          { 
            error: 'Failed to unblock account',
            details: `Sippy API returned: ${result.result}`,
            accountId 
          }, 
          { status: 500 }
        );
      }

    } catch (error: any) {
      // Handle Sippy API errors
      if (error.message && error.message.includes('Sippy API Fault')) {
        return NextResponse.json(
          { 
            error: 'Sippy API error', 
            details: error.message,
            accountId 
          }, 
          { status: 500 }
        );
      }

      // Handle network/connection errors
      if (error.message && (
        error.message.includes('No response received') ||
        error.message.includes('Failed to get digest challenge') ||
        error.message.includes('timeout')
      )) {
        return NextResponse.json(
          { 
            error: 'Connection error', 
            details: 'Unable to connect to Sippy API',
            accountId 
          }, 
          { status: 503 }
        );
      }

      throw error;
    }

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to unblock account',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 