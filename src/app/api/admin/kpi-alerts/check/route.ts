import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { kpiAlertService } from '@/lib/services/kpiAlertService';

interface KpiData {
  costOfDay: number;
  asr: number;
  totalMinutes: number;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  currency: string;
}

// POST - Check KPI alerts for current user
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
    const { kpiData, userName, userEmail }: { 
      kpiData: KpiData; 
      userName: string; 
      userEmail: string; 
    } = body;

    if (!kpiData || !userName || !userEmail) {
      return NextResponse.json({ 
        error: 'Missing required fields: kpiData, userName, userEmail' 
      }, { status: 400 });
    }

    console.log('🔔 Checking KPI alerts for user:', userName);
    console.log('📊 KPI Data:', {
      costOfDay: kpiData.costOfDay,
      asr: kpiData.asr.toFixed(2) + '%',
      totalMinutes: kpiData.totalMinutes.toFixed(2),
      totalCalls: kpiData.totalCalls
    });

    // Check KPI alerts using the service
    await kpiAlertService.checkUserKpiAlerts(
      currentUser.id,
      kpiData,
      userName,
      userEmail
    );

    return NextResponse.json({
      success: true,
      message: 'KPI alerts checked successfully',
      userId: currentUser.id,
      kpiData: {
        costOfDay: kpiData.costOfDay,
        asr: parseFloat(kpiData.asr.toFixed(2)),
        totalMinutes: parseFloat(kpiData.totalMinutes.toFixed(2)),
        totalCalls: kpiData.totalCalls
      }
    });

  } catch (error) {
    console.error('Error checking KPI alerts:', error);
    
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: `Failed to check KPI alerts: ${error.message}` 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'An unexpected error occurred while checking KPI alerts' 
    }, { status: 500 });
  }
} 