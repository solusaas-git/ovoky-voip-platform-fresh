import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import SmsBilling from '@/models/SmsBilling';
import SmsMessage from '@/models/SmsMessage';
import User from '@/models/User';
import { Country }   from '@/models/Country';
import mongoose from 'mongoose';

/**
 * POST /api/admin/sms/billing/today
 * Process today's SMS messages for billing
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase();

    // Get today's date range
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    console.log(`🔄 Processing today's SMS billing: ${todayStart.toISOString()} to ${todayEnd.toISOString()}`);

    // Get all users who have sent messages today
    const usersWithMessages = await SmsMessage.aggregate([
      {
        $match: {
          status: { $in: ['sent', 'delivered'] },
          $or: [
            { sentAt: { $gte: todayStart, $lt: todayEnd } },
            { deliveredAt: { $gte: todayStart, $lt: todayEnd } },
            { createdAt: { $gte: todayStart, $lt: todayEnd } }
          ]
        }
      },
      {
        $group: {
          _id: '$userId',
          messageCount: { $sum: 1 },
          totalCost: { $sum: '$cost' }
        }
      }
    ]);

    console.log(`📊 Found ${usersWithMessages.length} users with messages today`);

    let billingsCreated = 0;
    let totalMessagesProcessed = 0;
    let totalCostProcessed = 0;

    // Process each user
    for (const userStat of usersWithMessages) {
      const userId = userStat._id.toString();
      
      try {
        // Check if billing already exists for today
        const existingBilling = await SmsBilling.findOne({
          userId: userStat._id,
          billingPeriodStart: { $gte: todayStart },
          billingPeriodEnd: { $lte: todayEnd }
        });

        if (existingBilling) {
          console.log(`⏭️ Billing already exists for user ${userId} today`);
          continue;
        }

        // Create billing for today's period
        const billing = await SmsBilling.createBillingForPeriod(
          userId,
          todayStart,
          todayEnd
        );

        if (billing) {
          billingsCreated++;
          totalMessagesProcessed += billing.totalMessages;
          totalCostProcessed += billing.totalCost;
          console.log(`✅ Created today's billing for user ${userId}: ${billing.totalMessages} messages, $${billing.totalCost}`);
        }

      } catch (error) {
        console.error(`❌ Error creating today's billing for user ${userId}:`, error);
      }
    }

    const summary = {
      billingsCreated,
      totalMessagesProcessed,
      totalCostProcessed: Math.round(totalCostProcessed * 1000) / 1000,
      period: `${todayStart.toISOString().split('T')[0]} to ${todayEnd.toISOString().split('T')[0]}`,
      processedBy: user.email,
      processedAt: new Date().toISOString()
    };

    console.log('📋 Today\'s SMS billing summary:', summary);

    return NextResponse.json({
      message: `Today's SMS billing processed successfully`,
      summary
    });

  } catch (error) {
    console.error('Error processing today\'s SMS billing:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process today\'s SMS billing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 