import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import SmsBilling from '@/models/SmsBilling';
import User from '@/models/User';
import { z } from 'zod';

// Validation schema for manual billing processing
const processSmsBillingSchema = z.object({
  billingId: z.string().min(1, 'Billing ID is required'),
});

/**
 * GET /api/admin/sms/billing
 * Get SMS billing records with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || '';
    const userId = searchParams.get('userId') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    
    if (status) {
      query.status = status;
    }
    
    if (userId) {
      query.userId = userId;
    }
    
    if (startDate || endDate) {
      query.billingPeriodStart = {};
      if (startDate) query.billingPeriodStart.$gte = new Date(startDate);
      if (endDate) query.billingPeriodStart.$lte = new Date(endDate);
    }

    // Get billing records with pagination
    const billings = await SmsBilling.find(query)
      .populate('userId', 'email name company')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await SmsBilling.countDocuments(query);

    // Transform data for response
    const transformedBillings = billings.map(billing => ({
      _id: billing._id,
      user: billing.userId,
      billingPeriodStart: billing.billingPeriodStart,
      billingPeriodEnd: billing.billingPeriodEnd,
      totalMessages: billing.totalMessages,
      successfulMessages: billing.successfulMessages,
      failedMessages: billing.failedMessages,
      totalCost: billing.totalCost,
      currency: billing.currency,
      messageBreakdown: billing.messageBreakdown,
      status: billing.status,
      billingDate: billing.billingDate,
      paidDate: billing.paidDate,
      failureReason: billing.failureReason,
      sippyTransactionId: billing.sippyTransactionId,
      processedBy: billing.processedBy,
      notes: billing.notes,
      createdAt: billing.createdAt,
      updatedAt: billing.updatedAt
    }));

    return NextResponse.json({
      billings: transformedBillings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching SMS billing records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SMS billing records' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/sms/billing
 * Process a specific SMS billing record manually
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = processSmsBillingSchema.parse(body);

    await connectToDatabase();

    // Get the billing record
    const billing = await SmsBilling.findById(validatedData.billingId)
      .populate('userId');

    if (!billing) {
      return NextResponse.json({ error: 'SMS billing record not found' }, { status: 404 });
    }

    if (billing.status !== 'pending') {
      return NextResponse.json({ error: 'SMS billing record is not pending' }, { status: 400 });
    }

    // Get user's Sippy account ID
    const billingUser = billing.userId as any;
    if (!billingUser.sippyAccountId) {
      return NextResponse.json({ 
        error: 'User does not have a Sippy account ID' 
      }, { status: 400 });
    }

    try {
      // Get Sippy API credentials
      const { getSippyApiCredentials } = await import('@/lib/sippyClientConfig');
      const { SippyClient } = await import('@/lib/sippyClient');
      
      const credentials = await getSippyApiCredentials();
      
      if (!credentials) {
        return NextResponse.json({ 
          error: 'Sippy API not configured' 
        }, { status: 500 });
      }

      const sippyClient = new SippyClient(credentials);

      // Skip if total cost is zero
      if (billing.totalCost <= 0) {
        billing.status = 'paid';
        billing.paidDate = new Date();
        billing.processedBy = user.email;
        billing.notes = (billing.notes || '') + ' (Zero cost - manually marked as paid)';
        await billing.save();

        return NextResponse.json({
          message: 'SMS billing processed successfully (zero cost)',
          billing: {
            _id: String(billing._id),
            status: billing.status,
            paidDate: billing.paidDate?.toISOString(),
            totalCost: billing.totalCost,
            notes: billing.notes
          }
        });
      }

      // Get the account's default currency to ensure compatibility
      let accountCurrency = billing.currency;
      try {
        const accountInfo = await sippyClient.getAccountInfo({ 
          i_account: billingUser.sippyAccountId 
        });
        
        if (accountInfo?.payment_currency) {
          accountCurrency = accountInfo.payment_currency;
        }
      } catch (error) {
        console.log(`Failed to get account info for ${billingUser.email}, using billing currency: ${billing.currency}`);
      }

      // Prepare billing note
      const paymentNotes = `Manual SMS billing charge: ${billing.totalMessages} messages (${billing.billingPeriodStart.toISOString().split('T')[0]} to ${billing.billingPeriodEnd.toISOString().split('T')[0]}) - Processed by ${user.email}`;

      console.log(`💸 Processing manual SMS billing for ${billingUser.email}: ${billing.totalCost} ${accountCurrency}`);

      // Process the charge using Sippy accountDebit
      const debitResult = await sippyClient.accountDebit({
        i_account: billingUser.sippyAccountId,
        amount: billing.totalCost,
        currency: accountCurrency,
        payment_notes: paymentNotes,
      });

      // Update billing record based on result
      const sippyResult = debitResult as any;
      const resultValue = sippyResult.result;
      const txResult = sippyResult.tx_result;
      const hasError = (debitResult.error && debitResult.error.trim() !== '') || 
                      (debitResult.tx_error && debitResult.tx_error.trim() !== '');
      const hasTxId = debitResult.tx_id || debitResult.payment_id || debitResult.i_payment;
      
      // Determine success based on multiple criteria
      const isSuccess = (
        resultValue === 'success' || 
        resultValue === '1' ||
        resultValue === 1 ||
        resultValue === 'OK' ||
        resultValue === 'ok' ||
        txResult === 1 ||
        txResult === '1' ||
        (hasTxId && !hasError) ||
        (resultValue && !hasError && resultValue !== 'failed' && resultValue !== 'error')
      );

      if (isSuccess) {
        billing.status = 'paid';
        billing.paidDate = new Date();
        billing.sippyTransactionId = debitResult.tx_id || debitResult.payment_id || debitResult.i_payment?.toString() || `manual_sms_debit_${Date.now()}`;
        billing.processedBy = user.email;
        
        console.log('SMS billing processed successfully:', billing._id);
        await billing.save();

      } else {
        const failureReason = debitResult.error || debitResult.tx_error || `Unexpected result: ${JSON.stringify(resultValue)}`;
        console.log('SMS billing failed:', billing._id, 'Reason:', failureReason);
        
        billing.status = 'failed';
        billing.failureReason = failureReason;
        billing.processedBy = user.email;
        
        await billing.save();
      }

      return NextResponse.json({
        message: 'SMS billing processed successfully',
        billing: {
          _id: String(billing._id),
          status: billing.status,
          paidDate: billing.paidDate?.toISOString(),
          sippyTransactionId: billing.sippyTransactionId,
          failureReason: billing.failureReason,
          totalCost: billing.totalCost,
          totalMessages: billing.totalMessages
        },
        sippyResult: debitResult
      });

    } catch (sippyError) {
      console.error('Sippy API error:', sippyError);
      
      // Update billing record to reflect the failure
      billing.status = 'failed';
      billing.failureReason = sippyError instanceof Error ? sippyError.message : 'Sippy API error';
      billing.processedBy = user.email;
      await billing.save();

      return NextResponse.json({
        error: 'Failed to process SMS billing via Sippy',
        details: sippyError instanceof Error ? sippyError.message : 'Unknown error',
        billing: {
          _id: String(billing._id),
          status: billing.status,
          failureReason: billing.failureReason,
        },
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error processing SMS billing:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process SMS billing' },
      { status: 500 }
    );
  }
} 