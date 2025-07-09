import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import SmsBlacklistedNumber from '@/models/SmsBlacklistedNumber';
import UserOnboardingModel from '@/models/UserOnboarding';
import { connectToDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    // Get both global and user-specific blacklisted numbers for admin view
    const blacklistedNumbers = await SmsBlacklistedNumber.find({})
      .populate('addedBy', 'name email')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    // Get unique user IDs from addedBy field
    const addedByUserIds = [...new Set(blacklistedNumbers
      .map(item => item.addedBy?._id?.toString())
      .filter(Boolean))];

    // Get onboarding data for users who added blacklist entries
    const onboardings = await UserOnboardingModel.find({ userId: { $in: addedByUserIds } })
      .select('userId companyName')
      .lean();

    // Create onboarding map
    const onboardingMap = onboardings.reduce((acc, onboarding) => {
      acc[onboarding.userId.toString()] = onboarding;
      return acc;
    }, {} as Record<string, any>);

    // Transform the data to include company names
    const transformedBlacklistedNumbers = blacklistedNumbers.map(item => {
      const itemObj = item.toObject();
      const addedByUserId = itemObj.addedBy?._id?.toString();
      
      return {
        ...itemObj,
        addedBy: itemObj.addedBy ? {
          ...itemObj.addedBy,
          companyName: addedByUserId ? onboardingMap[addedByUserId]?.companyName || null : null
        } : null
      };
    });

    return NextResponse.json({
      success: true,
      blacklistedNumbers: transformedBlacklistedNumbers
    });
  } catch (error) {
    console.error('Failed to fetch blacklisted numbers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { phoneNumber, reason, isGlobal = true } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Check if already blacklisted globally
    const existing = await SmsBlacklistedNumber.findOne({
      phoneNumber: normalizedPhone,
      isGlobal: true
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Phone number is already globally blacklisted' },
        { status: 400 }
      );
    }

    const blacklistedNumber = new SmsBlacklistedNumber({
      userId: user.id, // Admin who added it
      phoneNumber: normalizedPhone,
      reason,
      isGlobal,
      addedBy: user.id
    });

    await blacklistedNumber.save();

    // Populate the response
    await blacklistedNumber.populate('addedBy', 'name email');

    return NextResponse.json({
      success: true,
      blacklistedNumber
    });
  } catch (error) {
    console.error('Failed to add to blacklist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 