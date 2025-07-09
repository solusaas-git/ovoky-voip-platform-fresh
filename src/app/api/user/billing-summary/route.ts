import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { SMSBillingService } from '@/lib/services/smsBillingService';

/**
 * GET /api/user/billing-summary
 * Get current user's billing summary and usage
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const summary = await SMSBillingService.getUserBillingSummary(user.id);

    return NextResponse.json({
      summary: {
        currentUsage: summary.currentUsage,
        pendingBillings: summary.pendingBillings,
        lastBillingDate: summary.lastBillingDate?.toISOString(),
        nextBillingDate: summary.nextBillingDate?.toISOString(),
        settings: {
          billingFrequency: summary.settings?.billingFrequency,
          maxAmount: summary.settings?.maxAmount,
          maxMessages: summary.settings?.maxMessages,
          notificationThreshold: summary.settings?.notificationThreshold,
          autoProcessing: summary.settings?.autoProcessing,
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user billing summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing summary' },
      { status: 500 }
    );
  }
} 