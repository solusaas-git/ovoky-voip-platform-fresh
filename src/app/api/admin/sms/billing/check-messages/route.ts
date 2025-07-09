import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import SmsMessage from '@/models/SmsMessage';
import SmsBilling from '@/models/SmsBilling';
import User from '@/models/User';
import mongoose from 'mongoose';

/**
 * GET /api/admin/sms/billing/check-messages
 * Check overall SMS messages statistics and billing status
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const days = parseInt(searchParams.get('days') || '30');

    // Date range for analysis
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    console.log(`🔍 Checking SMS messages from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Build query
    const messageQuery: any = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    if (userId) {
      messageQuery.userId = new mongoose.Types.ObjectId(userId);
    }

    // Get overall message statistics
    const messageStats = await SmsMessage.aggregate([
      { $match: messageQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalCost: { $sum: '$cost' }
        }
      }
    ]);

    // Get daily breakdown
    const dailyBreakdown = await SmsMessage.aggregate([
      { $match: messageQuery },
      {
        $addFields: {
          dateToUse: {
            $ifNull: [
              '$sentAt',
              { $ifNull: ['$deliveredAt', '$createdAt'] }
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$dateToUse' } },
            status: '$status'
          },
          count: { $sum: 1 },
          totalCost: { $sum: '$cost' }
        }
      },
      { $sort: { '_id.date': -1, '_id.status': 1 } }
    ]);

    // Get user breakdown (if not filtering by specific user)
    let userBreakdown = [];
    if (!userId) {
      userBreakdown = await SmsMessage.aggregate([
        { $match: messageQuery },
        {
          $group: {
            _id: '$userId',
            totalMessages: { $sum: 1 },
            sentMessages: {
              $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered']] }, 1, 0] }
            },
            failedMessages: {
              $sum: { $cond: [{ $in: ['$status', ['failed', 'undelivered']] }, 1, 0] }
            },
            totalCost: { $sum: '$cost' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        { $sort: { totalCost: -1 } },
        { $limit: 20 }
      ]);
    }

    // Get billing status for the period
    const billingQuery: any = {
      billingPeriodStart: { $gte: startDate },
      billingPeriodEnd: { $lte: endDate }
    };

    if (userId) {
      billingQuery.userId = new mongoose.Types.ObjectId(userId);
    }

    const billingStats = await SmsBilling.aggregate([
      { $match: billingQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalCost' },
          totalMessages: { $sum: '$totalMessages' }
        }
      }
    ]);

    // Get unbilled messages (messages without corresponding billing records)
    const unbilledAnalysis = await SmsMessage.aggregate([
      { 
        $match: {
          ...messageQuery,
          status: { $in: ['sent', 'delivered'] }
        }
      },
      {
        $lookup: {
          from: 'sms_billing',
          let: { 
            msgUserId: '$userId',
            msgDate: { $ifNull: ['$sentAt', { $ifNull: ['$deliveredAt', '$createdAt'] }] }
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$userId', '$$msgUserId'] },
                    { $gte: ['$$msgDate', '$billingPeriodStart'] },
                    { $lt: ['$$msgDate', '$billingPeriodEnd'] }
                  ]
                }
              }
            }
          ],
          as: 'billingRecord'
        }
      },
      {
        $group: {
          _id: {
            userId: '$userId',
            hasBilling: { $gt: [{ $size: '$billingRecord' }, 0] }
          },
          count: { $sum: 1 },
          totalCost: { $sum: '$cost' }
        }
      },
      {
        $group: {
          _id: '$_id.hasBilling',
          users: { $sum: 1 },
          messages: { $sum: '$count' },
          totalCost: { $sum: '$totalCost' }
        }
      }
    ]);

    // Transform data for response
    const messageStatsMap = messageStats.reduce((acc, stat) => {
      acc[stat._id] = {
        count: stat.count,
        totalCost: Math.round(stat.totalCost * 1000) / 1000
      };
      return acc;
    }, {} as any);

    const billingStatsMap = billingStats.reduce((acc, stat) => {
      acc[stat._id] = {
        count: stat.count,
        totalAmount: Math.round(stat.totalAmount * 1000) / 1000,
        totalMessages: stat.totalMessages
      };
      return acc;
    }, {} as any);

    const unbilledData = unbilledAnalysis.find(item => item._id === false) || { users: 0, messages: 0, totalCost: 0 };
    const billedData = unbilledAnalysis.find(item => item._id === true) || { users: 0, messages: 0, totalCost: 0 };

    const response = {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days
      },
      messageStats: {
        total: messageStats.reduce((sum, stat) => sum + stat.count, 0),
        totalCost: Math.round(messageStats.reduce((sum, stat) => sum + stat.totalCost, 0) * 1000) / 1000,
        byStatus: messageStatsMap
      },
      billingStats: {
        total: billingStats.reduce((sum, stat) => sum + stat.count, 0),
        totalAmount: Math.round(billingStats.reduce((sum, stat) => sum + stat.totalAmount, 0) * 1000) / 1000,
        totalMessagesBilled: billingStats.reduce((sum, stat) => sum + stat.totalMessages, 0),
        byStatus: billingStatsMap
      },
      unbilledAnalysis: {
        unbilledMessages: unbilledData.messages,
        unbilledCost: Math.round(unbilledData.totalCost * 1000) / 1000,
        unbilledUsers: unbilledData.users,
        billedMessages: billedData.messages,
        billedCost: Math.round(billedData.totalCost * 1000) / 1000,
        billedUsers: billedData.users
      },
      dailyBreakdown: dailyBreakdown.map(item => ({
        date: item._id.date,
        status: item._id.status,
        count: item.count,
        totalCost: Math.round(item.totalCost * 1000) / 1000
      })),
      userBreakdown: userBreakdown.map(item => ({
        userId: item._id,
        userEmail: item.userInfo?.[0]?.email || 'Unknown',
        userName: item.userInfo?.[0]?.name || item.userInfo?.[0]?.company || 'Unknown',
        totalMessages: item.totalMessages,
        sentMessages: item.sentMessages,
        failedMessages: item.failedMessages,
        totalCost: Math.round(item.totalCost * 1000) / 1000
      }))
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error checking SMS messages:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check SMS messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 