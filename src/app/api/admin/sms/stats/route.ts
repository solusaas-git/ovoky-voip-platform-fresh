import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import SmsMessage from '@/models/SmsMessage';
// import SmsProvider from '@/models/SmsProvider';
import SmsBlacklistedNumber from '@/models/SmsBlacklistedNumber';
import User from '@/models/User';
import { connectToDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    // Calculate date ranges
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Parallel queries for better performance
    const [
      totalMessages,
      totalUsers,
      messagesThisMonth,
      messagesLastMonth,
      successfulMessages,
      failedMessages,
      blacklistedNumbers
    ] = await Promise.all([
      SmsMessage.countDocuments({}),
      User.countDocuments({ role: { $ne: 'admin' } }),
      SmsMessage.countDocuments({ 
        createdAt: { $gte: startOfThisMonth } 
      }),
      SmsMessage.countDocuments({ 
        createdAt: { 
          $gte: startOfLastMonth, 
          $lte: endOfLastMonth 
        } 
      }),
      SmsMessage.countDocuments({ status: 'delivered' }),
      SmsMessage.countDocuments({ 
        status: { $in: ['failed', 'undelivered'] } 
      }),
      SmsBlacklistedNumber.countDocuments({})
    ]);

    // Get provider count separately to avoid import issues
    const totalProviders = 0; // Will be populated when provider model is fixed

    // Calculate rates
    const totalProcessed = successfulMessages + failedMessages;
    const successRate = totalProcessed > 0 ? (successfulMessages / totalProcessed) * 100 : 0;
    const failureRate = totalProcessed > 0 ? (failedMessages / totalProcessed) * 100 : 0;

    // Get top users for current month by default
    const topUsers = await SmsMessage.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfThisMonth }
        }
      },
      {
        $group: {
          _id: '$userId',
          messageCount: { $sum: 1 },
          totalCost: { $sum: '$cost' }
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
        $lookup: {
          from: 'user_onboarding',
          localField: '_id',
          foreignField: 'userId',
          as: 'onboarding'
        }
      },
      {
        $project: {
          messageCount: 1,
          totalCost: 1,
          userName: { $arrayElemAt: ['$user.name', 0] },
          userEmail: { $arrayElemAt: ['$user.email', 0] },
          companyName: { $arrayElemAt: ['$onboarding.companyName', 0] }
        }
      },
      {
        $sort: { messageCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get top destinations for current month by default
    const topDestinations = await SmsMessage.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfThisMonth }
        }
      },
      {
        $group: {
          _id: '$prefix',
          messageCount: { $sum: 1 },
          totalCost: { $sum: '$cost' },
          uniqueNumbers: { $addToSet: '$to' },
          successfulMessages: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          prefix: '$_id',
          messageCount: 1,
          totalCost: 1,
          uniqueNumbers: { $size: '$uniqueNumbers' },
          successfulMessages: 1,
          successRate: {
            $cond: [
              { $gt: ['$messageCount', 0] },
              { $multiply: [{ $divide: ['$successfulMessages', '$messageCount'] }, 100] },
              0
            ]
          }
        }
      },
      {
        $sort: { messageCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const stats = {
      totalMessages,
      totalUsers,
      totalProviders,
      messagesThisMonth,
      messagesLastMonth,
      successRate,
      failureRate,
      blacklistedNumbers,
      topUsers,
      topDestinations,
      recentActivity: [] // Could be populated with daily message counts
    };

    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 