import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import UserOnboardingModel from '@/models/UserOnboarding';
import { getCurrentUser } from '@/lib/authService';

interface OnboardingData {
  userId: string;
  companyName?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(currentUser.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get URL parameters
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const sippyOnly = url.searchParams.get('sippyOnly') === 'true';
    const role = url.searchParams.get('role');

    // Build query
    const query: Record<string, any> = {};
    
    if (role) {
      query.role = role;
    }
    
    if (sippyOnly) {
      query.sippyAccountId = { $exists: true, $ne: null, $type: 'number' };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Get users
    const users = await User.find(query)
      .select('_id name email sippyAccountId role')
      .limit(limit)
      .sort({ name: 1 });

    // Get onboarding data for all users
    const userIds = users.map(user => user._id.toString());
    
    const onboardings = await UserOnboardingModel.find({ userId: { $in: userIds } })
      .select('userId companyName')
      .lean();

    // Create onboarding map
    const onboardingMap = onboardings.reduce((acc, onboarding) => {
      acc[onboarding.userId] = onboarding;
      return acc;
    }, {} as Record<string, OnboardingData>);

    const userList = users.map(user => ({
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      sippyAccountId: user.sippyAccountId,
      role: user.role,
      // Add company information from onboarding in nested structure
      firstName: user.name?.split(' ')[0] || '',
      lastName: user.name?.split(' ').slice(1).join(' ') || '',
      onboarding: {
        companyName: onboardingMap[user._id.toString()]?.companyName || null,
      },
      // Also include it directly for backward compatibility
      companyName: onboardingMap[user._id.toString()]?.companyName || null,
    }));

    return NextResponse.json({ users: userList });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
} 