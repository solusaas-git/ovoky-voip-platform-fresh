import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import KpiSettingsModel, { IKpiSettings } from '@/models/KpiSettings';

// GET - Fetch KPI thresholds (public for all authenticated users)
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Try to find admin KPI settings first
    const adminSettings = await KpiSettingsModel.findOne({}).lean() as IKpiSettings | null;
    
    // If no admin settings found, return defaults
    if (!adminSettings) {
      const defaultThresholds = {
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
        refreshInterval: 300
      };
      
      return NextResponse.json(defaultThresholds);
    }

    // Return the admin's configured thresholds (without sensitive data)
    const publicThresholds = {
      costThresholds: adminSettings.costThresholds,
      asrThresholds: adminSettings.asrThresholds,
      acdThresholds: adminSettings.acdThresholds,
      totalMinutesThresholds: adminSettings.totalMinutesThresholds,
      currency: adminSettings.currency,
      refreshInterval: adminSettings.refreshInterval
    };

    return NextResponse.json(publicThresholds);
    
  } catch (error) {
    console.error('Error fetching KPI thresholds:', error);
    
    // Return defaults on error
    const defaultThresholds = {
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
      refreshInterval: 300
    };
    
    return NextResponse.json(defaultThresholds);
  }
} 