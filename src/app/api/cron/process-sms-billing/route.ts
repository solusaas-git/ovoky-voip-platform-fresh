import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import SmsBilling from '@/models/SmsBilling';
import User from '@/models/User';
import mongoose from 'mongoose';

interface ProcessingSummary {
  usersProcessed: number;
  billingsCreated: number;
  billingsProcessed: number;
  totalCost: number;
  errors: Array<{
    userId: string;
    userEmail: string;
    error: string;
  }>;
}

/**
 * POST /api/cron/process-sms-billing
 * Create and process SMS billing records for all users
 * This endpoint is designed to be called by a cron job
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is an admin request or internal cron
    const user = await getCurrentUser();
    
    // Allow internal cron requests (check for API key) or admin users
    const authHeader = request.headers.get('authorization');
    const internalApiKey = process.env.INTERNAL_API_KEY;
    
    const isInternalRequest = authHeader === `Bearer ${internalApiKey}` && internalApiKey;
    const isAdminRequest = user && user.role === 'admin';
    
    if (!isInternalRequest && !isAdminRequest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const startTime = Date.now();
    const summary: ProcessingSummary = {
      usersProcessed: 0,
      billingsCreated: 0,
      billingsProcessed: 0,
      totalCost: 0,
      errors: []
    };

    // Get billing period from query params or use default (previous day)
    const { searchParams } = new URL(request.url);
    const billingType = searchParams.get('type') || 'daily'; // daily, weekly, monthly
    const specificDate = searchParams.get('date'); // Format: YYYY-MM-DD

    let periodStart: Date;
    let periodEnd: Date;
    const now = new Date();

    if (specificDate) {
      // Process specific date
      periodStart = new Date(specificDate);
      periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
    } else {
      // Calculate period based on billing type
      
      switch (billingType) {
        case 'weekly':
          // Previous week (Monday to Sunday)
          periodEnd = new Date(now);
          periodEnd.setDate(periodEnd.getDate() - now.getDay() + 1); // Last Monday
          periodEnd.setHours(0, 0, 0, 0);
          periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
          
        case 'monthly':
          // Previous month
          periodEnd = new Date(now.getFullYear(), now.getMonth(), 1);
          periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          break;
          
        default: // daily
          // Previous day (yesterday 00:00 to today 00:00)
          periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      }
    }

    console.log(`🔄 Processing SMS billing for period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);
    console.log(`📅 Current date: ${now.toISOString()}`);

    // Get all active users with Sippy account IDs
    const users = await User.find({
      sippyAccountId: { $exists: true, $ne: null },
      status: { $ne: 'suspended' }
    }).select('_id email sippyAccountId').lean();

    console.log(`👥 Found ${users.length} users to process SMS billing for`);

    // Step 1: Create billing records for users who have SMS usage
    for (const user of users) {
      try {
        // Check if billing already exists for this period
        const existingBilling = await SmsBilling.findOne({
          userId: user._id,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd
        });

        if (existingBilling) {
          console.log(`⚠️ SMS billing already exists for user ${user.email} for this period`);
          continue;
        }

        // Create billing record for the period
        const billing = await SmsBilling.createBillingForPeriod(
          user._id.toString(),
          periodStart,
          periodEnd
        );

        if (billing) {
          summary.billingsCreated++;
          summary.totalCost += billing.totalCost;
          console.log(`📝 Created SMS billing for ${user.email}: $${billing.totalCost} for ${billing.totalMessages} messages`);
        }

        summary.usersProcessed++;

      } catch (error) {
        console.error(`❌ Error creating SMS billing for user ${user.email}:`, error);
        summary.errors.push({
          userId: user._id.toString(),
          userEmail: user.email,
          error: error instanceof Error ? error.message : 'Unknown error during billing creation'
        });
      }
    }

    console.log(`📋 Step 1 completed: Created ${summary.billingsCreated} billing records`);

    // Step 2: Process pending billing records (charge via Sippy)
    try {
      await SmsBilling.processPendingBillings();
      
      // Count processed billings
      const processedBillings = await SmsBilling.find({
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        status: { $in: ['paid', 'failed'] }
      });

      summary.billingsProcessed = processedBillings.length;
      
      console.log(`💳 Step 2 completed: Processed ${summary.billingsProcessed} billing records`);

    } catch (error) {
      console.error('❌ Error processing pending SMS billings:', error);
      summary.errors.push({
        userId: 'system',
        userEmail: 'system',
        error: `Billing processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    const requestDuration = Date.now() - startTime;

    // Log final summary
    console.log(`📊 SMS Billing Process Summary:`, {
      period: `${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`,
      usersProcessed: summary.usersProcessed,
      billingsCreated: summary.billingsCreated,
      billingsProcessed: summary.billingsProcessed,
      totalCost: summary.totalCost,
      errors: summary.errors.length,
      duration: `${requestDuration}ms`
    });

    return NextResponse.json({
      success: true,
      message: 'SMS billing processing completed',
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
        type: billingType
      },
      summary,
      requestDuration
    });

  } catch (error) {
    console.error('❌ SMS billing process failed:', error);
    return NextResponse.json(
      { 
        error: 'SMS billing process failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/process-sms-billing
 * Get status of SMS billing processing
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Get recent billing statistics
    const recentBillings = await SmsBilling.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalCost: { $sum: '$totalCost' },
          totalMessages: { $sum: '$totalMessages' }
        }
      }
    ]);

    const stats = {
      pending: { count: 0, totalCost: 0, totalMessages: 0 },
      paid: { count: 0, totalCost: 0, totalMessages: 0 },
      failed: { count: 0, totalCost: 0, totalMessages: 0 },
      cancelled: { count: 0, totalCost: 0, totalMessages: 0 }
    };

    recentBillings.forEach(item => {
      if (item._id in stats) {
        stats[item._id as keyof typeof stats] = {
          count: item.count,
          totalCost: item.totalCost,
          totalMessages: item.totalMessages
        };
      }
    });

    return NextResponse.json({
      success: true,
      stats,
      period: 'Last 7 days'
    });

  } catch (error) {
    console.error('Error fetching SMS billing stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SMS billing stats' },
      { status: 500 }
    );
  }
} 