import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import PhoneNumberBilling from '@/models/PhoneNumberBilling';
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
  const jobName = 'Cleanup Tasks';
  const jobPath = '/api/cron/cleanup-expired-sessions';
  let triggerType: 'manual' | 'vercel_cron' = 'vercel_cron';
  
  try {
    console.log('🕐 Cron job started: cleanup-expired-sessions');
    
    // Verify this is a legitimate cron request or admin manual trigger
    const verificationResult = await verifyCronRequest(request);
    if (!verificationResult.authorized) {
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

    triggerType = verificationResult.isManual ? 'manual' : 'vercel_cron';
    console.log(`🔥 Cleanup Tasks job triggered: ${triggerType}`);

    await connectToDatabase();

    let totalProcessed = 0;
    let totalFailed = 0;
    const errors: any[] = [];

    try {
      console.log('🧹 [CRON] Starting cleanup tasks...');

      // Cleanup 1: Remove expired billing records older than 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const expiredBilling = await PhoneNumberBilling.deleteMany({
        status: 'failed',
        createdAt: { $lt: ninetyDaysAgo }
      });

      if (expiredBilling.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${expiredBilling.deletedCount} expired billing records`);
        totalProcessed += expiredBilling.deletedCount;
      }

      // Cleanup 2: Clean old cron job execution records
      await cronExecutionService.cleanupOldExecutions();
      console.log('🧹 Cleaned up old cron execution records');
      totalProcessed += 1; // Count the cleanup operation

      // Cleanup 3: Remove old unverified user accounts (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const unverifiedUsers = await User.deleteMany({
        emailVerified: false,
        createdAt: { $lt: thirtyDaysAgo }
      });

      if (unverifiedUsers.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${unverifiedUsers.deletedCount} unverified user accounts`);
        totalProcessed += unverifiedUsers.deletedCount;
      }

      const duration = Date.now() - startTime;
      console.log(`✅ [CRON] Cleanup tasks completed in ${duration}ms`);

      // Record successful execution
      await cronExecutionService.recordExecution(
        jobName,
        jobPath,
        { 
          status: 'success', 
          processed: totalProcessed,
          notes: `Cleaned up expired billing records, old executions, and unverified accounts`
        },
        duration,
        triggerType
      );

    } catch (error) {
      console.error('❌ [CRON] Error during cleanup tasks:', error);
      totalFailed = 1;
      errors.push({
        operation: 'cleanup_tasks',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Record failed execution
      await cronExecutionService.recordExecution(
        jobName,
        jobPath,
        { 
          status: 'failed', 
          processed: totalProcessed, 
          failed: totalFailed,
          errorDetails: errors 
        },
        Date.now() - startTime,
        triggerType
      );
    }

    console.log(`✅ Cleanup cron job completed: ${totalProcessed} items processed, ${totalFailed} failed`);

    return NextResponse.json({
      message: `Cleanup completed: ${totalProcessed} items processed, ${totalFailed} failed`,
      processed: totalProcessed,
      failed: totalFailed,
      errors: errors.length > 0 ? errors : undefined,
      duration: Date.now() - startTime,
      triggered: triggerType,
    });

  } catch (error) {
    console.error('❌ Error in cleanup cron job:', error);
    
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
      { error: 'Failed to process cleanup tasks' },
      { status: 500 }
    );
  }
}

// Support GET for Vercel cron jobs (Vercel uses GET requests for cron jobs)
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const jobName = 'Cleanup Tasks';
  const jobPath = '/api/cron/cleanup-expired-sessions';
  let triggerType: 'manual' | 'vercel_cron' = 'vercel_cron';
  
  try {
    console.log('🕐 Cron job started via GET: cleanup-expired-sessions');
    
    // Verify this is a legitimate cron request or admin manual trigger
    const verificationResult = await verifyCronRequest(request);
    if (!verificationResult.authorized) {
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

    triggerType = verificationResult.isManual ? 'manual' : 'vercel_cron';
    console.log(`🔥 Cleanup Tasks job triggered via GET: ${triggerType}`);

    await connectToDatabase();

    let totalProcessed = 0;
    let totalFailed = 0;
    const errors: any[] = [];

    try {
      console.log('🧹 [CRON] Starting cleanup tasks...');

      // Cleanup 1: Remove expired billing records older than 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const expiredBilling = await PhoneNumberBilling.deleteMany({
        status: 'failed',
        createdAt: { $lt: ninetyDaysAgo }
      });

      if (expiredBilling.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${expiredBilling.deletedCount} expired billing records`);
        totalProcessed += expiredBilling.deletedCount;
      }

      // Cleanup 2: Clean old cron job execution records
      await cronExecutionService.cleanupOldExecutions();
      console.log('🧹 Cleaned up old cron execution records');
      totalProcessed += 1; // Count the cleanup operation

      // Cleanup 3: Remove old unverified user accounts (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const unverifiedUsers = await User.deleteMany({
        emailVerified: false,
        createdAt: { $lt: thirtyDaysAgo }
      });

      if (unverifiedUsers.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${unverifiedUsers.deletedCount} unverified user accounts`);
        totalProcessed += unverifiedUsers.deletedCount;
      }

      const duration = Date.now() - startTime;
      console.log(`✅ [CRON] Cleanup tasks completed in ${duration}ms`);

      // Record successful execution
      await cronExecutionService.recordExecution(
        jobName,
        jobPath,
        { 
          status: 'success', 
          processed: totalProcessed,
          notes: `Cleaned up expired billing records, old executions, and unverified accounts`
        },
        duration,
        triggerType
      );

    } catch (error) {
      console.error('❌ [CRON] Error during cleanup tasks:', error);
      totalFailed = 1;
      errors.push({
        operation: 'cleanup_tasks',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Record failed execution
      await cronExecutionService.recordExecution(
        jobName,
        jobPath,
        { 
          status: 'failed', 
          processed: totalProcessed, 
          failed: totalFailed,
          errorDetails: errors 
        },
        Date.now() - startTime,
        triggerType
      );
    }

    console.log(`✅ Cleanup cron job completed: ${totalProcessed} items processed, ${totalFailed} failed`);

    return NextResponse.json({
      message: `Cleanup completed: ${totalProcessed} items processed, ${totalFailed} failed`,
      processed: totalProcessed,
      failed: totalFailed,
      errors: errors.length > 0 ? errors : undefined,
      duration: Date.now() - startTime,
      triggered: triggerType,
    });

  } catch (error) {
    console.error('❌ Error in cleanup cron job via GET:', error);
    
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
      { error: 'Failed to process cleanup tasks' },
      { status: 500 }
    );
  }
} 