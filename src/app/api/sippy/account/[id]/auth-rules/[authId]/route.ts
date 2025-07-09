import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { SippyClient } from '@/lib/sippyClient';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';

// GET - Get specific authentication rule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; authId: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, authId } = await params;
    const accountId = parseInt(id);
    const authenticationId = parseInt(authId);
    
    if (isNaN(accountId) || isNaN(authenticationId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Check if user has access to this account
    if (user.role !== 'admin' && user.sippyAccountId !== accountId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const credentials = await getSippyApiCredentials();
    if (!credentials) {
      return NextResponse.json({ error: 'Sippy API not configured' }, { status: 500 });
    }

    const sippyClient = new SippyClient(credentials);
    const result = await sippyClient.getAuthRuleInfo({ i_authentication: authenticationId });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting auth rule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update authentication rule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; authId: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, authId } = await params;
    const accountId = parseInt(id);
    const authenticationId = parseInt(authId);
    
    if (isNaN(accountId) || isNaN(authenticationId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Check if user has access to this account
    if (user.role !== 'admin' && user.sippyAccountId !== accountId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    const credentials = await getSippyApiCredentials();
    if (!credentials) {
      return NextResponse.json({ error: 'Sippy API not configured' }, { status: 500 });
    }

    const sippyClient = new SippyClient(credentials);
    const result = await sippyClient.updateAuthRule({
      i_authentication: authenticationId,
      ...body,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating auth rule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete authentication rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; authId: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, authId } = await params;
    const accountId = parseInt(id);
    const authenticationId = parseInt(authId);
    
    if (isNaN(accountId) || isNaN(authenticationId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Check if user has access to this account
    if (user.role !== 'admin' && user.sippyAccountId !== accountId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const credentials = await getSippyApiCredentials();
    if (!credentials) {
      return NextResponse.json({ error: 'Sippy API not configured' }, { status: 500 });
    }

    const sippyClient = new SippyClient(credentials);
    const result = await sippyClient.delAuthRule({ i_authentication: authenticationId });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting auth rule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 