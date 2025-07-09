import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { smsSimulationProvider } from '@/lib/services/SmsSimulationProvider';

/**
 * Reset SMS simulation provider tracking
 * POST /api/admin/sms/simulation/reset
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type = 'all', campaignId } = body;

    switch (type) {
      case 'delivery-tracking':
        smsSimulationProvider.clearDeliveryReportTracking(campaignId);
        break;
      case 'all':
        smsSimulationProvider.reset();
        break;
      default:
        return NextResponse.json({ error: 'Invalid reset type' }, { status: 400 });
    }

    const stats = smsSimulationProvider.getDeliveryTrackingStats();

    return NextResponse.json({
      success: true,
      message: `Simulation provider ${type} reset completed`,
      stats
    });

  } catch (error) {
    console.error('Error resetting simulation provider:', error);
    return NextResponse.json(
      { error: 'Failed to reset simulation provider' },
      { status: 500 }
    );
  }
}

/**
 * Get simulation provider tracking stats
 * GET /api/admin/sms/simulation/reset
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = smsSimulationProvider.getDeliveryTrackingStats();

    return NextResponse.json({
      success: true,
      deliveryTracking: stats
    });

  } catch (error) {
    console.error('Error getting simulation provider stats:', error);
    return NextResponse.json(
      { error: 'Failed to get simulation provider stats' },
      { status: 500 }
    );
  }
} 