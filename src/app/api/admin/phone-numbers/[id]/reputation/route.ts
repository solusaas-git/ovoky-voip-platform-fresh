import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authMiddleware';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';
import { PhoneReputationService } from '@/lib/services/phoneReputationService';

// GET - Get stored reputation data for a phone number (admin access)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify the user is an admin
    const authResult = await requireAdmin();
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    // Get the phone number by ID to get the actual number
    const phoneNumberRecord = await PhoneNumber.findById(id).lean();
    if (!phoneNumberRecord) {
      return NextResponse.json({ 
        error: 'Phone number not found' 
      }, { status: 404 });
    }

    // Get stored reputation data using the actual phone number
    const reputationData = await PhoneReputationService.getStoredReputation(phoneNumberRecord.number);
    const hasData = await PhoneReputationService.hasReputationData(phoneNumberRecord.number);

    return NextResponse.json({
      success: true,
      hasData,
      reputation: reputationData,
      badge: PhoneReputationService.getReputationBadge(reputationData)
    });

  } catch (error) {
    console.error('Error getting phone number reputation (admin):', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Check/refresh reputation data for a phone number (admin access)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify the user is an admin
    const authResult = await requireAdmin();
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { forceRefresh = false } = body;

    await connectToDatabase();

    // Get the phone number by ID to get the actual number
    const phoneNumberRecord = await PhoneNumber.findById(id).lean();
    if (!phoneNumberRecord) {
      return NextResponse.json({ 
        error: 'Phone number not found' 
      }, { status: 404 });
    }

    try {
      // Check reputation using the service
      const reputationData = await PhoneReputationService.checkReputation(
        phoneNumberRecord.number,
        authResult.user.id,
        forceRefresh
      );

      if (!reputationData) {
        return NextResponse.json({
          success: false,
          error: 'No reputation data available for this number'
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        reputation: reputationData,
        badge: PhoneReputationService.getReputationBadge(reputationData),
        message: forceRefresh ? 'Reputation data refreshed successfully' : 'Reputation data retrieved successfully'
      });

    } catch (serviceError) {
      console.error('Error checking reputation (admin):', serviceError);
      
      // Return specific error messages for better UX
      const errorMessage = serviceError instanceof Error ? serviceError.message : 'Unknown error';
      
      if (errorMessage.includes('No reputation provider available')) {
        return NextResponse.json({
          success: false,
          error: 'Reputation checking is not available for this country/region',
          details: errorMessage
        }, { status: 400 });
      }

      // For HTTP errors, return a user-friendly message but don't fail completely
      if (errorMessage.includes('HTTP 404') || errorMessage.includes('404')) {
        return NextResponse.json({
          success: true,
          reputation: {
            dangerLevel: 0,
            status: 'unknown',
            commentCount: 0,
            visitCount: 0,
            description: 'Number not found in reputation database',
            sourceUrl: ''
          },
          badge: PhoneReputationService.getReputationBadge(null),
          message: 'Number not found in reputation database - this is normal for many numbers'
        });
      }

      if (errorMessage.includes('HTTP')) {
        return NextResponse.json({
          success: false,
          error: 'Unable to fetch reputation data from provider',
          details: 'The reputation service may be temporarily unavailable'
        }, { status: 503 });
      }

      return NextResponse.json({
        success: false,
        error: 'Failed to check phone number reputation',
        details: errorMessage
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in admin reputation check endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 