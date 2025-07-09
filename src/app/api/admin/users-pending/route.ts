import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // all, missing_sippy, pending_verification
    const limit = parseInt(searchParams.get('limit') || '10');

    await connectToDatabase();

    let query: Record<string, any> = {};
    
    // Build query based on filter
    switch (filter) {
      case 'missing_sippy':
        query = {
          $or: [
            { sippyAccountId: { $exists: false } },
            { sippyAccountId: null },
            { sippyAccountId: '' }
          ]
        };
        break;
      case 'pending_verification':
        query = {
          $or: [
            { isEmailVerified: { $ne: true } },
            { isEmailVerified: { $exists: false } }
          ]
        };
        break;
      case 'all':
      default:
        query = {
          $or: [
            // Missing Sippy Account ID
            { sippyAccountId: { $exists: false } },
            { sippyAccountId: null },
            { sippyAccountId: '' },
            // Pending email verification
            { isEmailVerified: { $ne: true } },
            { isEmailVerified: { $exists: false } }
          ]
        };
        break;
    }

    // Get users that need attention
    const users = await User.find(query)
      .select('name email role sippyAccountId isEmailVerified createdAt creationMethod')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Get counts for each category
    const [missingSippyCount, pendingVerificationCount, totalPendingCount] = await Promise.all([
      User.countDocuments({
        $or: [
          { sippyAccountId: { $exists: false } },
          { sippyAccountId: null },
          { sippyAccountId: '' }
        ]
      }),
      User.countDocuments({
        $or: [
          { isEmailVerified: { $ne: true } },
          { isEmailVerified: { $exists: false } }
        ]
      }),
      User.countDocuments(query)
    ]);

    // Transform users to add flags for what's missing
    const transformedUsers = users.map(user => ({
      ...user,
      id: user._id.toString(),
      needsSippyId: !user.sippyAccountId,
      needsEmailVerification: !user.isEmailVerified,
      isRecent: new Date(user.createdAt).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000) // within 7 days
    }));

    return NextResponse.json({
      users: transformedUsers,
      counts: {
        missingSippy: missingSippyCount,
        pendingVerification: pendingVerificationCount,
        totalPending: totalPendingCount
      },
      filter,
      limit
    });
  } catch (error) {
    console.error('Error fetching pending users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 