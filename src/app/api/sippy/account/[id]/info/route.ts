import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClient } from '@/lib/sippyClient';

// GET - Get Sippy account information
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get account ID from params
    const { id } = await params;
    const accountId = parseInt(id);
    
    if (isNaN(accountId)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    // Check if user has permission to access this account
    if (currentUser.role !== 'admin' && currentUser.sippyAccountId !== accountId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get Sippy API credentials
    const credentials = await getSippyApiCredentials();
    if (!credentials) {
      return NextResponse.json({ error: 'Sippy API not configured' }, { status: 500 });
    }

    // Create Sippy client and get account info
    const sippyClient = new SippyClient(credentials);
    
    try {
      const accountInfo = await sippyClient.getAccountInfo({
        i_account: accountId
      });

      return NextResponse.json({
        accountId,
        accountInfo,
        timestamp: new Date().toISOString()
      });

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
        error: 'Failed to get account information',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 