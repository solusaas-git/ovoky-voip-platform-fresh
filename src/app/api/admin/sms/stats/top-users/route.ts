import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import SmsMessage from '@/models/SmsMessage';
import UserOnboardingModel from '@/models/UserOnboarding';
import { connectToDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'current-month';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Calculate date ranges based on period
    const now = new Date();
    let matchCondition: any = {};

    switch (period) {
      case 'current-month':
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        matchCondition = { createdAt: { $gte: startOfThisMonth } };
        break;
      
      case 'last-month':
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        matchCondition = { 
          createdAt: { 
            $gte: startOfLastMonth, 
            $lte: endOfLastMonth 
          } 
        };
        break;
      
      case 'today':
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        matchCondition = { createdAt: { $gte: startOfToday } };
        break;
      
      case 'custom':
        if (startDate && endDate) {
          matchCondition = {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          };
        } else {
          return NextResponse.json(
            { error: 'Start date and end date are required for custom range' },
            { status: 400 }
          );
        }
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid period. Use: current-month, last-month, today, or custom' },
          { status: 400 }
        );
    }

    // Get top users with aggregation
    const topUsers = await SmsMessage.aggregate([
      {
        $match: matchCondition
      },
      {
        $group: {
          _id: '$userId',
          messageCount: { $sum: 1 },
          totalCost: { $sum: '$cost' },
          successfulMessages: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          failedMessages: {
            $sum: { $cond: [{ $in: ['$status', ['failed', 'undelivered']] }, 1, 0] }
          }
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
        $project: {
          messageCount: 1,
          totalCost: 1,
          successfulMessages: 1,
          failedMessages: 1,
          successRate: {
            $cond: [
              { $gt: ['$messageCount', 0] },
              { $multiply: [{ $divide: ['$successfulMessages', '$messageCount'] }, 100] },
              0
            ]
          },
          userName: { $arrayElemAt: ['$user.name', 0] },
          userEmail: { $arrayElemAt: ['$user.email', 0] }
        }
      },
      {
        $sort: { messageCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get unique user IDs from the top users
    const userIds = topUsers.map(user => user._id.toString()).filter(Boolean);

    // Get onboarding data for these users
    const onboardings = await UserOnboardingModel.find({ userId: { $in: userIds } })
      .select('userId companyName')
      .lean();

    // Create onboarding map
    const onboardingMap = onboardings.reduce((acc, onboarding) => {
      acc[onboarding.userId.toString()] = onboarding;
      return acc;
    }, {} as Record<string, any>);

    // Transform the data to include company names
    const transformedTopUsers = topUsers.map(user => {
      const userId = user._id.toString();
      return {
        ...user,
        companyName: onboardingMap[userId]?.companyName || null
      };
    });



    return NextResponse.json({
      success: true,
      topUsers: transformedTopUsers,
      period,
      totalResults: transformedTopUsers.length
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 