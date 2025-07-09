import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import CustomerNotificationService from '@/services/CustomerNotificationService';
import SchedulerSettingsModel from '@/models/SchedulerSettings';
import { cronExecutionService } from '@/lib/services/cronExecutionService';
import { getCurrentUser } from '@/lib/authService';

// Security: Verify this is a legitimate cron request or admin manual trigger
async function verifyCronRequest(request: NextRequest) {
  // Get request information for debugging
  const userAgent = request.headers.get('user-agent') || '';
  const authorization = request.headers.get('authorization');
  const cronSecret = request.headers.get('x-vercel-cron-signature');
  const expectedSecret = process.env.CRON_SECRET;
  
  // Check for Vercel cron job authentication (multiple methods)
  const isVercelRequest = userAgent.includes('vercel') || userAgent.includes('Vercel');
  
  if (isVercelRequest) {
    // Vercel cron jobs might use different authentication methods
    // 1. Check for Authorization header with Bearer token
    if (expectedSecret && authorization === `Bearer ${expectedSecret}`) {
      return { authorized: true, isManual: false };
    }
    
    // 2. Check for x-vercel-cron-signature header
    if (expectedSecret && cronSecret === expectedSecret) {
      return { authorized: true, isManual: false };
    }
    
    // 3. Allow Vercel requests without secret (if no secret is configured)
    if (!expectedSecret) {
      return { authorized: true, isManual: false };
    }
    
    // 4. For now, allow all Vercel requests (temporary for debugging)
    return { authorized: true, isManual: false };
  }
  
  // Check for authenticated admin user (manual trigger)
  try {
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.role === 'admin') {
      return { authorized: true, isManual: true };
    }
  } catch (error) {
    // Authentication failed, continue to reject
  }
  
  return { authorized: false, isManual: false };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const jobName = 'Customer Notifications';
  const jobPath = '/api/cron/process-customer-notifications';
  let triggerType: 'manual' | 'vercel_cron' = 'vercel_cron';
  
  try {
    console.log('🕐 Cron job started: process-customer-notifications');
    
    // Verify this is a legitimate cron request or admin manual trigger
    const verification = await verifyCronRequest(request);
    if (!verification.authorized) {
      console.log('❌ Unauthorized cron request');
      
      // Record failed execution
      await cronExecutionService.recordExecution(
        jobName,
        jobPath,
        { status: 'failed', errorDetails: [{ error: 'Unauthorized request' }] },
        Date.now() - startTime
      );
      
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    triggerType = verification.isManual ? 'manual' : 'vercel_cron';
    console.log(`🔥 Customer Notifications job triggered: ${triggerType}`);

    await connectToDatabase();

    // Check if customer notifications are enabled in scheduler settings
    const settings = await SchedulerSettingsModel.findOne();
    if (settings && !settings.enabled) {
      console.log('⏸️ Customer notifications are disabled in scheduler settings');
      
      // Record skipped execution
      await cronExecutionService.recordExecution(
        jobName,
        jobPath,
        { status: 'skipped', notes: 'Customer notifications disabled in settings' },
        Date.now() - startTime,
        triggerType
      );
      
      return NextResponse.json({
        message: 'Customer notifications disabled in settings',
        processed: 0,
        skipped: true,
      });
    }

    let processedCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    try {
      console.log('📧 [CRON] Starting customer notification execution...');
      
      // Get CustomerNotificationService instance and execute scheduled notifications
      const customerNotificationService = CustomerNotificationService.getInstance();
      await customerNotificationService.executeScheduledNotifications();
      
      // Customer notification execution completed successfully
      processedCount = 1;

      const duration = Date.now() - startTime;
      
      // Record successful execution
      await cronExecutionService.recordExecution(
        jobName,
        jobPath,
        { status: 'success', processed: processedCount },
        duration,
        triggerType
      );

    } catch (error) {
      console.error('❌ [CRON] Error during customer notification execution:', error);
      failedCount = 1;
      errors.push({
        operation: 'customer_notification_execution',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Record failed execution
      await cronExecutionService.recordExecution(
        jobName,
        jobPath,
        { 
          status: 'failed', 
          processed: processedCount, 
          failed: failedCount,
          errorDetails: errors 
        },
        Date.now() - startTime,
        triggerType
      );
    }

    console.log(`✅ Customer notification cron job completed: ${processedCount} successful, ${failedCount} failed`);

    return NextResponse.json({
      message: `Customer notification execution completed: ${processedCount} successful, ${failedCount} failed`,
      processed: processedCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined,
      duration: Date.now() - startTime,
      triggered: triggerType,
    });

  } catch (error) {
    console.error('❌ Error in customer notification cron job:', error);
    
    // Record failed execution
    await cronExecutionService.recordExecution(
      jobName,
      jobPath,
      { 
        status: 'failed', 
        errorDetails: [{ error: error instanceof Error ? error.message : 'Unknown error' }] 
      },
      Date.now() - startTime,
      triggerType
    );
    
    return NextResponse.json(
      { error: 'Failed to process customer notifications' },
      { status: 500 }
    );
  }
}

// Support GET for Vercel cron jobs (Vercel uses GET requests for cron jobs)
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const jobName = 'Customer Notifications';
  const jobPath = '/api/cron/process-customer-notifications';
  let triggerType: 'manual' | 'vercel_cron' = 'vercel_cron';
  
  try {
    console.log('🕐 Cron job started via GET: process-customer-notifications');
    
    // Verify this is a legitimate cron request or admin manual trigger
    const verification = await verifyCronRequest(request);
    if (!verification.authorized) {
      console.log('❌ Unauthorized cron request via GET');
      
      // Record failed execution
      await cronExecutionService.recordExecution(
        jobName,
        jobPath,
        { status: 'failed', errorDetails: [{ error: 'Unauthorized request' }] },
        Date.now() - startTime
      );
      
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    triggerType = verification.isManual ? 'manual' : 'vercel_cron';
    console.log(`🔥 Customer Notifications job triggered via GET: ${triggerType}`);

    await connectToDatabase();

    // Check if customer notifications are enabled in scheduler settings
    const settings = await SchedulerSettingsModel.findOne();
    if (settings && !settings.enabled) {
      console.log('⏸️ Customer notifications are disabled in scheduler settings');
      
      // Record skipped execution
      await cronExecutionService.recordExecution(
        jobName,
        jobPath,
        { status: 'skipped', notes: 'Customer notifications disabled in settings' },
        Date.now() - startTime,
        triggerType
      );
      
      return NextResponse.json({
        message: 'Customer notifications disabled in settings',
        processed: 0,
        skipped: true,
      });
    }

    let processedCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    try {
      console.log('📧 [CRON] Starting customer notification execution...');
      
      // Get CustomerNotificationService instance and execute scheduled notifications
      const customerNotificationService = CustomerNotificationService.getInstance();
      await customerNotificationService.executeScheduledNotifications();
      
      // Customer notification execution completed successfully
      processedCount = 1;

      const duration = Date.now() - startTime;
      
      // Record successful execution
      await cronExecutionService.recordExecution(
        jobName,
        jobPath,
        { status: 'success', processed: processedCount },
        duration,
        triggerType
      );

    } catch (error) {
      console.error('❌ [CRON] Error during customer notification execution:', error);
      failedCount = 1;
      errors.push({
        operation: 'customer_notification_execution',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Record failed execution
      await cronExecutionService.recordExecution(
        jobName,
        jobPath,
        { 
          status: 'failed', 
          processed: processedCount, 
          failed: failedCount,
          errorDetails: errors 
        },
        Date.now() - startTime,
        triggerType
      );
    }

    console.log(`✅ Customer notification cron job completed: ${processedCount} successful, ${failedCount} failed`);

    return NextResponse.json({
      message: `Customer notification execution completed: ${processedCount} successful, ${failedCount} failed`,
      processed: processedCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined,
      duration: Date.now() - startTime,
      triggered: triggerType,
    });

  } catch (error) {
    console.error('❌ Error in customer notification cron job via GET:', error);
    
    // Record failed execution
    await cronExecutionService.recordExecution(
      jobName,
      jobPath,
      { 
        status: 'failed', 
        errorDetails: [{ error: error instanceof Error ? error.message : 'Unknown error' }] 
      },
      Date.now() - startTime,
      triggerType
    );
    
    return NextResponse.json(
      { error: 'Failed to process customer notifications' },
      { status: 500 }
    );
  }
} 