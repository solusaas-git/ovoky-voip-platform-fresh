import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import SmsBilling from '@/models/SmsBilling';

/**
 * GET /api/admin/sms/billing-stats
 * Get SMS billing statistics for dashboard widget
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase();

    // Get current date for filtering
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Aggregate billing stats
    const stats = await SmsBilling.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalCost: { $sum: '$totalCost' },
          totalMessages: { $sum: '$totalMessages' },
          successfulMessages: { $sum: '$successfulMessages' },
          failedMessages: { $sum: '$failedMessages' }
        }
      }
    ]);

    // Get stats for different time periods
    const monthlyStats = await SmsBilling.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth }
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

    const weeklyStats = await SmsBilling.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfWeek }
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

    const dailyStats = await SmsBilling.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay }
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

    // Get top users by billing amount
    const topUsers = await SmsBilling.aggregate([
      {
        $match: {
          status: 'paid',
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: '$userId',
          totalCost: { $sum: '$totalCost' },
          totalMessages: { $sum: '$totalMessages' },
          billingCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          email: '$user.email',
          name: '$user.name',
          company: '$user.company',
          totalCost: 1,
          totalMessages: 1,
          billingCount: 1
        }
      },
      {
        $sort: { totalCost: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Transform stats into organized format
    const organizedStats = {
      pending: { count: 0, totalCost: 0, totalMessages: 0 },
      paid: { count: 0, totalCost: 0, totalMessages: 0 },
      failed: { count: 0, totalCost: 0, totalMessages: 0 },
      cancelled: { count: 0, totalCost: 0, totalMessages: 0 }
    };

    stats.forEach(stat => {
      if (organizedStats[stat._id as keyof typeof organizedStats]) {
        organizedStats[stat._id as keyof typeof organizedStats] = {
          count: stat.count,
          totalCost: stat.totalCost,
          totalMessages: stat.totalMessages
        };
      }
    });

    // Transform monthly stats
    const monthlyOrganized = {
      pending: { count: 0, totalCost: 0, totalMessages: 0 },
      paid: { count: 0, totalCost: 0, totalMessages: 0 },
      failed: { count: 0, totalCost: 0, totalMessages: 0 },
      cancelled: { count: 0, totalCost: 0, totalMessages: 0 }
    };

    monthlyStats.forEach(stat => {
      if (monthlyOrganized[stat._id as keyof typeof monthlyOrganized]) {
        monthlyOrganized[stat._id as keyof typeof monthlyOrganized] = {
          count: stat.count,
          totalCost: stat.totalCost,
          totalMessages: stat.totalMessages
        };
      }
    });

    // Transform weekly stats
    const weeklyOrganized = {
      pending: { count: 0, totalCost: 0, totalMessages: 0 },
      paid: { count: 0, totalCost: 0, totalMessages: 0 },
      failed: { count: 0, totalCost: 0, totalMessages: 0 },
      cancelled: { count: 0, totalCost: 0, totalMessages: 0 }
    };

    weeklyStats.forEach(stat => {
      if (weeklyOrganized[stat._id as keyof typeof weeklyOrganized]) {
        weeklyOrganized[stat._id as keyof typeof weeklyOrganized] = {
          count: stat.count,
          totalCost: stat.totalCost,
          totalMessages: stat.totalMessages
        };
      }
    });

    // Transform daily stats
    const dailyOrganized = {
      pending: { count: 0, totalCost: 0, totalMessages: 0 },
      paid: { count: 0, totalCost: 0, totalMessages: 0 },
      failed: { count: 0, totalCost: 0, totalMessages: 0 },
      cancelled: { count: 0, totalCost: 0, totalMessages: 0 }
    };

    dailyStats.forEach(stat => {
      if (dailyOrganized[stat._id as keyof typeof dailyOrganized]) {
        dailyOrganized[stat._id as keyof typeof dailyOrganized] = {
          count: stat.count,
          totalCost: stat.totalCost,
          totalMessages: stat.totalMessages
        };
      }
    });

    return NextResponse.json({
      stats: organizedStats,
      monthlyStats: monthlyOrganized,
      weeklyStats: weeklyOrganized,
      dailyStats: dailyOrganized,
      topUsers,
      summary: {
        totalBillings: organizedStats.pending.count + organizedStats.paid.count + organizedStats.failed.count + organizedStats.cancelled.count,
        totalRevenue: organizedStats.paid.totalCost,
        totalPending: organizedStats.pending.totalCost,
        totalMessages: organizedStats.pending.totalMessages + organizedStats.paid.totalMessages,
        successRate: organizedStats.paid.count + organizedStats.failed.count > 0 
          ? Math.round((organizedStats.paid.count / (organizedStats.paid.count + organizedStats.failed.count)) * 100)
          : 0
      }
    });

  } catch (error) {
    console.error('Error fetching SMS billing stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SMS billing statistics' },
      { status: 500 }
    );
  }
} 