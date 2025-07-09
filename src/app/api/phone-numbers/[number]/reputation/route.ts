import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';
import { PhoneReputationService } from '@/lib/services/phoneReputationService';
import mongoose from 'mongoose';

// GET - Get stored reputation data for a phone number
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { number } = await params;
    const decodedNumber = decodeURIComponent(number);

    await connectToDatabase();

    // Verify the user has access to this phone number
    const phoneNumberRecord = await PhoneNumber.findOne({
      number: decodedNumber,
      assignedTo: new mongoose.Types.ObjectId(user.id),
      status: 'assigned'
    }).lean();

    if (!phoneNumberRecord) {
      return NextResponse.json({ 
        error: 'Phone number not found or not assigned to you' 
      }, { status: 404 });
    }

    // Get stored reputation data
    const reputationData = await PhoneReputationService.getStoredReputation(decodedNumber);
    const hasData = await PhoneReputationService.hasReputationData(decodedNumber);

    return NextResponse.json({
      success: true,
      hasData,
      reputation: reputationData,
      badge: PhoneReputationService.getReputationBadge(reputationData)
    });

  } catch (error) {
    console.error('Error getting phone number reputation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Check/refresh reputation data for a phone number
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { number } = await params;
    const decodedNumber = decodeURIComponent(number);
    
    const body = await request.json();
    const { forceRefresh = false } = body;

    await connectToDatabase();

    // Verify the user has access to this phone number
    const phoneNumberRecord = await PhoneNumber.findOne({
      number: decodedNumber,
      assignedTo: new mongoose.Types.ObjectId(user.id),
      status: 'assigned'
    }).lean();

    if (!phoneNumberRecord) {
      return NextResponse.json({ 
        error: 'Phone number not found or not assigned to you' 
      }, { status: 404 });
    }

    try {
      // Check reputation using the service
      const reputationData = await PhoneReputationService.checkReputation(
        decodedNumber,
        user.id,
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
      console.error('Error checking reputation:', serviceError);
      
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
    console.error('Error in reputation check endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 