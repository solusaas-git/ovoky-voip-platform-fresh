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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    // Build query
    const query: Record<string, any> = {};
    
    if (search) {
      query.$or = [
        { to: { $regex: search, $options: 'i' } },
        { from: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    // Get total count
    const total = await SmsMessage.countDocuments(query);

    // Get messages with user and provider info
    const messages = await SmsMessage.find(query)
      .populate('userId', 'name email')
      .populate('providerId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get unique user IDs from the messages
    const userIds = [...new Set(messages
      .map(msg => msg.userId?._id?.toString())
      .filter(Boolean))];

    // Get onboarding data for these users
    const onboardings = await UserOnboardingModel.find({ userId: { $in: userIds } })
      .select('userId companyName')
      .lean();

    // Create onboarding map
    const onboardingMap = onboardings.reduce((acc, onboarding) => {
      acc[onboarding.userId.toString()] = onboarding;
      return acc;
    }, {} as Record<string, any>);

    // Transform the messages to include all required data
    const transformedMessages = messages.map(message => {
      const userId = (message.userId as any)?._id?.toString();
      const onboarding = userId ? onboardingMap[userId] : null;

      return {
        _id: message._id,
        userId: (message.userId as any)?._id,
        to: message.to,
        from: message.from,
        message: message.content,
        status: message.status,
        cost: message.cost || 0,
        providerId: (message.providerId as any)?._id,
        providerName: (message.providerId as any)?.name || 'Unknown Provider',
        providerResponse: message.providerResponse,
        sendingId: message.messageId,
        userName: (message.userId as any)?.name || 'Unknown User',
        userEmail: (message.userId as any)?.email || '',
        companyName: onboarding?.companyName || null,
        errorMessage: message.errorMessage || null,
        retryCount: message.retryCount || 0,
        maxRetries: message.maxRetries || 3,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      messages: transformedMessages,
      total,
      page,
      totalPages
    });
  } catch (error) {
    console.error('Error fetching SMS history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 