import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import KpiSettingsModel from '@/models/KpiSettings';

// GET - Fetch KPI settings
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();
    
    // Get or create KPI settings with defaults
    const settings = await KpiSettingsModel.findOneAndUpdate(
      { userId: currentUser.id },
      {
        $setOnInsert: {
          userId: currentUser.id,
          costThresholds: {
            low: 1.0,
            medium: 10.0
          },
          asrThresholds: {
            critical: 50,
            poor: 70,
            fair: 85,
            good: 95
          },
          acdThresholds: {
            short: 30,
            normal: 120,
            long: 300
          },
          totalMinutesThresholds: {
            light: 60,
            moderate: 300,
            heavy: 600
          },
          currency: 'EUR',
          timezone: 'Europe/London',
          refreshInterval: 300,
          enableNotifications: true,
          notificationThresholds: {
            highCostAlert: true,
            lowAsrAlert: true,
            extremeUsageAlert: true
          }
        }
      },
      { 
        new: true, 
        upsert: true 
      }
    );

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching KPI settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Update KPI settings
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    
    await connectToDatabase();

    // Validate input
    const {
      costThresholds,
      asrThresholds,
      acdThresholds,
      totalMinutesThresholds,
      currency,
      timezone,
      refreshInterval,
      enableNotifications,
      notificationThresholds
    } = body;

    // Validation
    if (costThresholds) {
      if (costThresholds.low < 0 || costThresholds.medium < 0) {
        return NextResponse.json({ error: 'Cost thresholds must be positive numbers' }, { status: 400 });
      }
      if (costThresholds.low >= costThresholds.medium) {
        return NextResponse.json({ error: 'Cost thresholds must be in ascending order: low < medium' }, { status: 400 });
      }
    }

    if (asrThresholds) {
      const { critical, poor, fair, good } = asrThresholds;
      if (critical < 0 || poor < 0 || fair < 0 || good < 0 || 
          critical > 100 || poor > 100 || fair > 100 || good > 100) {
        return NextResponse.json({ error: 'ASR thresholds must be between 0 and 100' }, { status: 400 });
      }
      if (critical >= poor || poor >= fair || fair >= good) {
        return NextResponse.json({ error: 'ASR thresholds must be in ascending order: critical < poor < fair < good' }, { status: 400 });
      }
    }

    if (acdThresholds) {
      const { short, normal, long } = acdThresholds;
      if (short < 0 || normal < 0 || long < 0) {
        return NextResponse.json({ error: 'ACD thresholds must be positive numbers' }, { status: 400 });
      }
      if (short >= normal || normal >= long) {
        return NextResponse.json({ error: 'ACD thresholds must be in ascending order: short < normal < long' }, { status: 400 });
      }
    }

    if (totalMinutesThresholds) {
      const { light, moderate, heavy } = totalMinutesThresholds;
      if (light < 0 || moderate < 0 || heavy < 0) {
        return NextResponse.json({ error: 'Total minutes thresholds must be positive numbers' }, { status: 400 });
      }
      if (light >= moderate || moderate >= heavy) {
        return NextResponse.json({ error: 'Total minutes thresholds must be in ascending order: light < moderate < heavy' }, { status: 400 });
      }
    }

    if (refreshInterval && (refreshInterval < 30 || refreshInterval > 3600)) {
      return NextResponse.json({ error: 'Refresh interval must be between 30 and 3600 seconds' }, { status: 400 });
    }

    if (currency && !['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY'].includes(currency)) {
      return NextResponse.json({ error: 'Invalid currency code' }, { status: 400 });
    }

    // Update settings
    const updateData = {
      ...(costThresholds && { costThresholds }),
      ...(asrThresholds && { asrThresholds }),
      ...(acdThresholds && { acdThresholds }),
      ...(totalMinutesThresholds && { totalMinutesThresholds }),
      ...(currency && { currency }),
      ...(timezone && { timezone }),
      ...(typeof refreshInterval === 'number' && { refreshInterval }),
      ...(typeof enableNotifications === 'boolean' && { enableNotifications }),
      ...(notificationThresholds && { notificationThresholds })
    };

    const settings = await KpiSettingsModel.findOneAndUpdate(
      { userId: currentUser.id },
      { $set: updateData },
      { 
        new: true, 
        upsert: true,
        runValidators: true
      }
    );

    return NextResponse.json({
      success: true,
      message: 'KPI settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Error updating KPI settings:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('ValidationError')) {
        return NextResponse.json({ 
          error: 'Invalid data provided. Please check your settings and try again.' 
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: `Failed to update KPI settings: ${error.message}` 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'An unexpected error occurred while updating KPI settings' 
    }, { status: 500 });
  }
}

// DELETE - Reset KPI settings to defaults
export async function DELETE() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();
    
    // Delete existing settings to trigger defaults on next GET
    await KpiSettingsModel.deleteOne({ userId: currentUser.id });

    return NextResponse.json({
      success: true,
      message: 'KPI settings reset to defaults successfully'
    });
  } catch (error) {
    console.error('Error resetting KPI settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 