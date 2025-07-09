import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClient } from '@/lib/sippyClient';
import { z } from 'zod';

const updateAccountSchema = z.object({
  max_sessions: z.union([
    z.number().refine(val => (val >= 1 && val <= 1000) || val === -1, {
      message: "Number must be between 1-1000 or -1 for unlimited"
    }),
    z.string().toLowerCase().refine(val => val === 'unlimited', {
      message: "String value must be 'unlimited'"
    })
  ]).optional(),
  max_calls_per_second: z.union([
    z.number().refine(val => val >= 0.1 && val <= 100, {
      message: "Number must be between 0.1-100"
    }),
    z.string().toLowerCase().refine(val => val === 'unlimited', {
      message: "String value must be 'unlimited'"
    })
  ]).optional()
}).refine(data => data.max_sessions !== undefined || data.max_calls_per_second !== undefined, {
  message: "At least one parameter must be provided"
});

// PUT - Update Sippy account parameters
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can update account parameters
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get account ID from params
    const { id } = await params;
    const accountId = parseInt(id);
    
    if (isNaN(accountId)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    console.log('API received body:', JSON.stringify(body, null, 2));
    const validatedData = updateAccountSchema.parse(body);

    // Get Sippy API credentials
    const credentials = await getSippyApiCredentials();
    if (!credentials) {
      return NextResponse.json({ error: 'Sippy API not configured' }, { status: 500 });
    }

    // Create Sippy client and update account
    const sippyClient = new SippyClient(credentials);
    
    const updateParams: { i_account: number; max_sessions?: number | string; max_calls_per_second?: number | string } = {
      i_account: accountId
    };

    if (validatedData.max_sessions !== undefined) {
      updateParams.max_sessions = validatedData.max_sessions;
    }

    if (validatedData.max_calls_per_second !== undefined) {
      updateParams.max_calls_per_second = validatedData.max_calls_per_second;
    }

    const result = await sippyClient.updateAccount(updateParams);

    return NextResponse.json({
      success: true,
      accountId,
      result: result.result,
      updatedParameters: validatedData,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error updating Sippy account:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        }, 
        { status: 400 }
      );
    }

    // Handle Sippy API errors
    if (error.message && error.message.includes('Sippy API Fault')) {
      return NextResponse.json(
        { 
          error: 'Sippy API error', 
          details: error.message 
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
          details: 'Unable to connect to Sippy API' 
        }, 
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to update account parameters',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 