import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import SmsSenderId from '@/models/SmsSenderId';
import User from '@/models/User';
import UserOnboardingModel from '@/models/UserOnboarding';
import { connectToDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    // Get all sender IDs with user information
    const senderIds = await SmsSenderId.find({})
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    // Get unique user IDs
    const userIds = [...new Set(senderIds.map(senderId => senderId.userId?._id?.toString()).filter(Boolean))];

    // Get onboarding data for all users
    const onboardings = await UserOnboardingModel.find({ userId: { $in: userIds } })
      .select('userId companyName')
      .lean();

    // Create onboarding map
    const onboardingMap = onboardings.reduce((acc, onboarding) => {
      acc[onboarding.userId.toString()] = onboarding;
      return acc;
    }, {} as Record<string, any>);

    // Transform the data to include user information, company name, and computed type
    const transformedSenderIds = senderIds.map(senderId => {
      const senderIdObj = senderId.toObject();
      const user = senderId.userId as any; // Type assertion for populated field
      const userId = user?._id?.toString();
      
      // Determine type based on senderId content (consistent with user API)
      const isNumeric = /^(\+)?[0-9]+$/.test(senderId.senderId);
      const type = isNumeric ? 'numeric' : 'alphanumeric';
      
      return {
        ...senderIdObj,
        userName: user?.name || 'Unknown User',
        userEmail: user?.email || 'Unknown Email',
        userCompany: onboardingMap[userId]?.companyName || null,
        type
      };
    });

    return NextResponse.json({
      success: true,
      senderIds: transformedSenderIds
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 