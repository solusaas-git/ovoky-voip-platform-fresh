import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import { Payment } from '@/models/Payment';
import User from '@/models/User';
import UserOnboarding from '@/models/UserOnboarding';

// Interface for payment filters
interface PaymentFilters {
  userId?: string;
  sippyAccountId?: number;
  status?: string;
  createdAt?: {
    $gte?: Date;
    $lte?: Date;
  };
}

// Interface for payment document
interface PaymentDocument {
  _id: string;
  userId: string;
  userEmail?: string;
  status: string;
  topupAmount: number;
  totalChargedAmount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  paymentIntentId: string;
  paymentMethodType: string;
  provider: string;
  description?: string;
  notes?: string;
  sippyAccountId?: number;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const includeRawData = searchParams.get('include_raw') === 'true';
    const userId = searchParams.get('user_id'); // Add user filter parameter

    // Build query filters
    const filters: PaymentFilters = {};

    // Filter by user (admins can see all payments with accountId param)
    if (user.role === 'admin') {
      const accountId = searchParams.get('account_id');
      if (accountId) {
        filters.sippyAccountId = parseInt(accountId);
      }
      // Add user filter for admin
      if (userId) {
        filters.userId = userId;
      }
      // If no accountId specified, admin sees all payments
    } else {
      // Regular users only see their own payments
      filters.userId = user.id;
    }

    // Status filter
    if (status && status !== 'all') {
      filters.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) {
        // Set start date to beginning of day
        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        filters.createdAt.$gte = start;
      }
      if (endDate) {
        // Set end date to end of day (23:59:59.999)
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        filters.createdAt.$lte = end;
      }
    }

    // Get payments with pagination and populate user data
    const paymentsQuery = Payment.find(filters)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);

    // Exclude raw data unless specifically requested (for performance)
    if (!includeRawData) {
      paymentsQuery.select('-rawPaymentData -rawWebhookData');
    }

    const payments = await paymentsQuery.lean() as unknown as PaymentDocument[];

    // Get user information for each payment to include user names
    const userIds = [...new Set(payments.map((p: PaymentDocument) => p.userId))];
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id name email')
      .lean();
    
    // Get onboarding information for company names
    const onboardingData = await UserOnboarding.find({ userId: { $in: userIds } })
      .select('userId companyName')
      .lean();
    
    // Create maps for quick lookup
    const userMap = new Map(users.map(user => [user._id.toString(), user]));
    const onboardingMap = new Map(onboardingData.map(onb => [onb.userId, onb]));
    
    // Enhance payments with user information
    const enhancedPayments = payments.map((payment: PaymentDocument) => {
      const user = userMap.get(payment.userId);
      const onboarding = onboardingMap.get(payment.userId);
      
      return {
        ...payment,
        userName: user?.name || 'Unknown User',
        userEmail: payment.userEmail || user?.email || 'Unknown Email',
        companyName: onboarding?.companyName
      };
    });

    // Get total count for pagination
    const totalCount = await Payment.countDocuments(filters);

    // Get payment statistics
    const stats = await (Payment as unknown as { getPaymentStats: (userId?: string, dateRange?: { start: Date; end: Date }) => Promise<any[]> }).getPaymentStats(
      user.role === 'admin' ? undefined : user.id,
      startDate && endDate ? {
        start: new Date(startDate),
        end: new Date(endDate)
      } : undefined
    );

    return NextResponse.json({
      success: true,
      payments: enhancedPayments,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + payments.length < totalCount
      },
      statistics: stats[0] || {
        totalPayments: 0,
        successfulPayments: 0,
        totalTopupAmount: 0,
        totalFeesCollected: 0,
        totalChargedAmount: 0,
        averagePaymentAmount: 0,
        currencies: []
      },
      filters: {
        status,
        startDate,
        endDate,
        accountId: user.role === 'admin' ? searchParams.get('account_id') : user.sippyAccountId
      }
    });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch payment history' 
    }, { status: 500 });
  }
}

// POST endpoint for creating manual payment records (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    const {
      userId,
      sippyAccountId,
      amount,
      currency = 'USD',
      description,
      notes,
      paymentMethodType = 'other',
      provider = 'manual'
    } = body;

    if (!userId || !sippyAccountId || !amount) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, sippyAccountId, amount' 
      }, { status: 400 });
    }

    // Get user details
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create manual payment record
    const paymentRecord = new Payment({
      // Core identification
      paymentIntentId: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      webhookEventId: `manual_${Date.now()}`,
      
      // User and account info
      userId: targetUser._id.toString(),
      userEmail: targetUser.email,
      sippyAccountId: parseInt(sippyAccountId),
      sippyCustomerId: targetUser.sippyCustomerId,
      
      // Payment amounts
      topupAmount: amount,
      processingFee: 0,
      fixedFee: 0,
      totalChargedAmount: amount,
      currency: currency.toUpperCase(),
      
      // Payment gateway info
      provider: 'manual',
      gatewayId: 'manual',
      gatewayName: 'Manual Entry',
      
      // Payment method details
      paymentMethodType,
      
      // Payment status and timing
      status: 'succeeded',
      paymentIntentStatus: 'succeeded',
      paymentInitiatedAt: new Date(),
      paymentCompletedAt: new Date(),
      sippyProcessedAt: new Date(),
      
      // Additional metadata
      description: description || `Manual payment entry of ${amount} ${currency}`,
      notes: notes || `Manual payment created by admin ${user.email}`,
      
      // Raw data storage
      rawPaymentData: {
        manualEntry: true,
        createdBy: user.email,
        createdAt: new Date().toISOString()
      }
    });

    // Generate payment reference
    paymentRecord.generatePaymentReference();

    await paymentRecord.save();

    console.log(`📋 Manual payment record created:
      - Payment Reference: ${paymentRecord.paymentReference}
      - Payment ID: ${paymentRecord.paymentIntentId}
      - User: ${paymentRecord.userEmail}
      - Amount: ${paymentRecord.totalChargedAmount} ${paymentRecord.currency}
      - Created by: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Manual payment record created successfully',
      payment: {
        id: paymentRecord._id,
        paymentIntentId: paymentRecord.paymentIntentId,
        paymentReference: paymentRecord.paymentReference,
        amount: paymentRecord.totalChargedAmount,
        currency: paymentRecord.currency,
        userEmail: paymentRecord.userEmail,
        createdAt: paymentRecord.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating manual payment record:', error);
    return NextResponse.json({ 
      error: 'Failed to create manual payment record' 
    }, { status: 500 });
  }
} 