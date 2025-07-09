import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import connectToDatabase from '@/lib/db';
import { NotificationLog } from '@/models/NotificationLog';
import type { NotificationStats } from '@/models/NotificationLog';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const userId = searchParams.get('userId');

    await connectToDatabase();

    // Build filter query
    const filter: Record<string, unknown> = {};
    if (status) {
      filter.status = status;
    }
    if (type) {
      filter.notificationType = type;
    }
    if (userId) {
      filter.userId = userId;
    }

    // Get total count for pagination
    const total = await NotificationLog.countDocuments(filter);

    // Get paginated logs
    const logs = await NotificationLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Calculate stats
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalSent,
      totalFailed,
      totalPending,
      sent24h,
      failed24h,
      sent7d,
      failed7d
    ] = await Promise.all([
      NotificationLog.countDocuments({ status: 'sent' }),
      NotificationLog.countDocuments({ status: 'failed' }),
      NotificationLog.countDocuments({ status: 'pending' }),
      NotificationLog.countDocuments({ 
        status: 'sent', 
        createdAt: { $gte: last24Hours } 
      }),
      NotificationLog.countDocuments({ 
        status: 'failed', 
        createdAt: { $gte: last24Hours } 
      }),
      NotificationLog.countDocuments({ 
        status: 'sent', 
        createdAt: { $gte: last7Days } 
      }),
      NotificationLog.countDocuments({ 
        status: 'failed', 
        createdAt: { $gte: last7Days } 
      })
    ]);

    const stats: NotificationStats = {
      totalSent,
      totalFailed,
      totalPending,
      last24Hours: {
        sent: sent24h,
        failed: failed24h
      },
      last7Days: {
        sent: sent7d,
        failed: failed7d
      }
    };

    // Transform logs to include id field for compatibility
    const transformedLogs = logs.map(log => ({
      ...log,
      id: log._id.toString()
    }));

    return NextResponse.json({
      logs: transformedLogs,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: (page * limit) < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching notification logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No notification IDs provided' }, { status: 400 });
    }

    // Validate that all IDs are valid MongoDB ObjectIds
    const validIds = ids.filter(id => /^[0-9a-fA-F]{24}$/.test(id));
    if (validIds.length !== ids.length) {
      return NextResponse.json({ error: 'Some notification IDs are invalid' }, { status: 400 });
    }

    // Delete the notifications
    const result = await NotificationLog.deleteMany({
      _id: { $in: validIds }
    });

    console.log(`Admin ${currentUser.email} deleted ${result.deletedCount} notification logs`);

    return NextResponse.json({
      message: `Successfully deleted ${result.deletedCount} notification${result.deletedCount === 1 ? '' : 's'}`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Error deleting notification logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 