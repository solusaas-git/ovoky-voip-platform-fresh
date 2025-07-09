import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { kpiAlertService } from '@/lib/services/kpiAlertService';
import { connectToDatabase } from '@/lib/db';
import UserModel from '@/models/User';
import KpiSettingsModel from '@/models/KpiSettings';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClient } from '@/lib/sippyClient';

// TypeScript interface for CDR records
interface CdrRecord {
  cost: string | number;
  duration: string | number;
  result: string | number;
  currency?: string;
  callId?: string;
  callStart?: string | Date;
  callEnd?: string | Date;
  fromNumber?: string;
  toNumber?: string;
  direction?: string;
  status?: string;
}

// POST - Test KPI alerts with current data
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
    const { forceAlert = false } = body;

    await connectToDatabase();

    // Get current user's account info
    const user = await UserModel.findById(currentUser.id);
    if (!user || !user.sippyAccountId) {
      return NextResponse.json({ 
        error: 'User account or Sippy account ID not found' 
      }, { status: 400 });
    }

    // Get user's KPI settings for debugging
    let settings = await KpiSettingsModel.findOne({ userId: currentUser.id });
    if (!settings) {
      console.log('⚠️ No KPI settings found for user, creating defaults...');
      settings = new KpiSettingsModel({ userId: currentUser.id });
      await settings.save();
    }

    console.log('🔧 Current KPI Settings:', {
      enableNotifications: settings.enableNotifications,
      costThresholds: settings.costThresholds,
      asrThresholds: settings.asrThresholds,
      totalMinutesThresholds: settings.totalMinutesThresholds,
      notificationThresholds: settings.notificationThresholds
    });

    // Get Sippy API credentials
    const credentials = await getSippyApiCredentials();
    if (!credentials) {
      return NextResponse.json({ 
        error: 'Sippy API credentials not configured' 
      }, { status: 500 });
    }

    // Fetch today's CDR data
    const sippyClient = new SippyClient(credentials);
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    console.log('🔍 Fetching CDR data for KPI alert test...');
    
    let allCdrs: CdrRecord[] = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    // Fetch all CDRs for today
    while (hasMore) {
      try {
        const response = await sippyClient.getAccountCDRs({
          i_account: user.sippyAccountId,
          start_date: startOfDay.toISOString().split('T')[0],
          end_date: endOfDay.toISOString().split('T')[0],
          limit: limit,
          offset: offset
        });

        if (response && Array.isArray(response) && response.length > 0) {
          allCdrs = allCdrs.concat(response as unknown as CdrRecord[]);
          offset += limit;
          
          if (response.length < limit) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error('Error fetching CDRs:', error);
        hasMore = false;
      }
    }

    console.log(`📊 Fetched ${allCdrs.length} CDR records for alert testing`);

    // Calculate KPIs from CDR data
    let totalCost = 0;
    let totalDuration = 0;
    let successfulCalls = 0;
    let failedCalls = 0;
    let currency = 'EUR';

    for (const cdr of allCdrs) {
      const cost = parseFloat(String(cdr.cost)) || 0;
      const duration = parseInt(String(cdr.duration)) || 0;
      const result = parseInt(String(cdr.result));
      
      totalCost += cost;
      totalDuration += duration;
      
      if (result === 0 || result === 200) {
        successfulCalls++;
      } else {
        failedCalls++;
      }
      
      if (cdr.currency) {
        currency = cdr.currency;
      }
    }

    const totalCalls = successfulCalls + failedCalls;
    const asr = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
    const totalMinutes = totalDuration / 60;

    const kpiData = {
      costOfDay: totalCost,
      asr,
      totalMinutes,
      totalCalls,
      successfulCalls,
      failedCalls,
      currency
    };

    console.log('📈 Calculated KPIs for alert testing:', kpiData);

    // If forceAlert is true, temporarily modify the data to trigger alerts
    let testKpiData = { ...kpiData };
    if (forceAlert) {
      testKpiData = {
        ...kpiData,
        costOfDay: Math.max(kpiData.costOfDay, 300), // Force high cost (> 250 threshold)
        asr: Math.min(kpiData.asr, 30), // Force low ASR (< 60 threshold)
        totalMinutes: Math.max(kpiData.totalMinutes, 10000) // Force extreme usage (> 9000 threshold)
      };
      console.log('🧪 Modified KPIs to force alerts:', testKpiData);
      
      // Debug which alerts should be triggered
      console.log('🔍 Alert Trigger Analysis:');
      console.log(`High Cost Alert: ${testKpiData.costOfDay} > ${settings.costThresholds.medium} = ${testKpiData.costOfDay > settings.costThresholds.medium} (enabled: ${settings.notificationThresholds.highCostAlert})`);
      console.log(`Low ASR Alert: ${testKpiData.asr} < ${settings.asrThresholds.fair} = ${testKpiData.asr < settings.asrThresholds.fair} (enabled: ${settings.notificationThresholds.lowAsrAlert})`);
      console.log(`Extreme Usage Alert: ${testKpiData.totalMinutes} > ${settings.totalMinutesThresholds.heavy} = ${testKpiData.totalMinutes > settings.totalMinutesThresholds.heavy} (enabled: ${settings.notificationThresholds.extremeUsageAlert})`);
    }

    // Reset alerts to allow testing
    if (forceAlert) {
      kpiAlertService.resetDailyAlerts();
      console.log('🔄 Alert status reset for testing');
    }

    // Test the alert system
    console.log('🚀 Starting KPI alert check...');
    await kpiAlertService.checkUserKpiAlerts(
      currentUser.id,
      testKpiData,
      user.name,
      user.email
    );

    // Get alert status after checking
    const alertStatus = kpiAlertService.getAlertStatus();
    console.log('📋 Alert Status After Check:', alertStatus.get(currentUser.id));

    return NextResponse.json({
      success: true,
      message: 'KPI alert test completed',
      kpiData: testKpiData,
      originalKpiData: forceAlert ? kpiData : undefined,
      alertsTriggered: forceAlert ? 'Forced alerts for testing' : 'Natural alerts based on actual data',
      settings: {
        enableNotifications: settings.enableNotifications,
        costThresholds: settings.costThresholds,
        asrThresholds: settings.asrThresholds,
        totalMinutesThresholds: settings.totalMinutesThresholds,
        notificationThresholds: settings.notificationThresholds
      },
      alertAnalysis: forceAlert ? {
        highCostShouldTrigger: testKpiData.costOfDay > settings.costThresholds.medium && settings.notificationThresholds.highCostAlert,
        lowAsrShouldTrigger: testKpiData.asr < settings.asrThresholds.fair && settings.notificationThresholds.lowAsrAlert,
        extremeUsageShouldTrigger: testKpiData.totalMinutes > settings.totalMinutesThresholds.heavy && settings.notificationThresholds.extremeUsageAlert
      } : undefined
    });

  } catch (error) {
    console.error('Error testing KPI alerts:', error);
    
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: `Failed to test KPI alerts: ${error.message}` 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'An unexpected error occurred while testing KPI alerts' 
    }, { status: 500 });
  }
} 