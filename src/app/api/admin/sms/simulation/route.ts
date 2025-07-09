import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { smsSimulationProvider } from '@/lib/services/SmsSimulationProvider';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get simulation statistics and configurations
    const stats = smsSimulationProvider.getDeliveryTrackingStats();

    return NextResponse.json({
      success: true,
      simulation: stats
    });
  } catch (error) {
    console.error('Failed to fetch simulation stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { action, configType, config } = await request.json();

    if (action === 'updateConfig' && configType && config) {
      smsSimulationProvider.updateConfig(configType, config);
      
      return NextResponse.json({
        success: true,
        message: `Configuration updated for ${configType}`
      });
    } else if (action === 'reset') {
      smsSimulationProvider.reset();
      
      return NextResponse.json({
        success: true,
        message: 'Simulation provider reset successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action or missing parameters' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Failed to update simulation config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 