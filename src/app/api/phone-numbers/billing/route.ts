import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';
import PhoneNumberBilling from '@/models/PhoneNumberBilling';
import PhoneNumberAssignment from '@/models/PhoneNumberAssignment';
import User from '@/models/User';
import UserOnboarding from '@/models/UserOnboarding';
import { SippyClient } from '@/lib/sippyClient';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import mongoose from 'mongoose';
import { z } from 'zod';

// TypeScript interfaces for populated documents
interface PopulatedPhoneNumber {
  _id: mongoose.Types.ObjectId | string;
  number: string;
  numberType: string;
  monthlyRate: number;
  currency: string;
  country: string;
  countryCode: string;
}

interface PopulatedUser {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  email: string;
  company?: string;
  sippyAccountId?: number;
}

interface PopulatedAssignment {
  _id: mongoose.Types.ObjectId | string;
  assignedAt: Date;
  unassignedAt?: Date;
}

interface PopulatedBilling {
  _id: mongoose.Types.ObjectId;
  phoneNumberId: PopulatedPhoneNumber;
  userId: PopulatedUser;
  assignmentId?: PopulatedAssignment;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  amount: number;
  currency: string;
  status: string;
  billingDate: Date;
  paidDate?: Date;
  transactionType: string;
  notes?: string;
  processedBy?: string;
  sippyTransactionId?: string;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SippyDebitResult {
  result?: unknown;
  tx_result?: unknown;
  error?: string;
  tx_error?: string;
  tx_id?: string;
  payment_id?: string;
  i_payment?: number;
}

interface BillingQuery {
  userId?: mongoose.Types.ObjectId;
  phoneNumberId?: mongoose.Types.ObjectId;
  status?: string;
  transactionType?: string;
  billingDate?: {
    $gte?: Date;
    $lte?: Date;
  };
}

// Validation schema for processing billing
const processBillingSchema = z.object({
  billingId: z.string().min(1, 'Billing ID is required'),
  forceCharge: z.boolean().optional().default(false), // Allow charging even if it creates negative balance
});

// Validation schema for creating billing records
const createBillingSchema = z.object({
  phoneNumberId: z.string().min(1, 'Phone number ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  amount: z.number().min(0, 'Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  transactionType: z.enum(['monthly_fee', 'setup_fee', 'prorated_fee', 'refund']),
  billingDate: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * GET /api/phone-numbers/billing
 * Retrieve phone number billing records with filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const phoneNumberId = searchParams.get('phoneNumberId');
    const transactionType = searchParams.get('transactionType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sortBy = searchParams.get('sortBy') || 'createdAt'; // Default to operation date (createdAt)
    const sortOrder = searchParams.get('sortOrder') || 'desc'; // Default to newest first

    // Build query
    const query: BillingQuery = {};

    // Role-based filtering
    if (user.role !== 'admin') {
      query.userId = new mongoose.Types.ObjectId(user.id);
    } else if (userId && userId !== 'all') {
      query.userId = new mongoose.Types.ObjectId(userId);
    }

    if (phoneNumberId) {
      query.phoneNumberId = new mongoose.Types.ObjectId(phoneNumberId);
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (transactionType && transactionType !== 'all') {
      query.transactionType = transactionType;
    }

    if (startDate || endDate) {
      query.billingDate = {};
      if (startDate) {
        query.billingDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.billingDate.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    // Build sort object
    const sortField = ['createdAt', 'updatedAt', 'billingDate', 'paidDate'].includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortObject: Record<string, 1 | -1> = { [sortField]: sortDirection };

    const [billings, total] = await Promise.all([
      PhoneNumberBilling.find(query)
        .populate('phoneNumberId', 'number numberType monthlyRate currency country countryCode')
        .populate('userId', 'name email company')
        .populate('assignmentId', 'assignedAt unassignedAt')
        .sort(sortObject)
        .skip(skip)
        .limit(limit)
        .lean(),
      PhoneNumberBilling.countDocuments(query)
    ]);

    // Get onboarding data for users in billing records
    const userIds = billings
      .filter(billing => billing.userId)
      .map(billing => (billing.userId as unknown as PopulatedUser)._id);
    
    const onboardingData = userIds.length > 0 ? await UserOnboarding.find({
      userId: { $in: userIds }
    }).lean() : [];

    // Transform response
    const transformedBillings = billings.map(billing => {
      const populatedBilling = billing as unknown as PopulatedBilling;
      
      // Get onboarding data for this user
      const userOnboarding = populatedBilling.userId ? 
        onboardingData.find(ob => ob.userId.toString() === populatedBilling.userId._id.toString()) : null;

      return {
        ...billing,
        _id: populatedBilling._id.toString(),
        phoneNumberId: populatedBilling.phoneNumberId._id.toString(),
        userId: populatedBilling.userId ? populatedBilling.userId._id.toString() : null,
        assignmentId: populatedBilling.assignmentId ? populatedBilling.assignmentId._id.toString() : null,
        phoneNumber: {
          _id: populatedBilling.phoneNumberId._id.toString(),
          number: populatedBilling.phoneNumberId.number,
          numberType: populatedBilling.phoneNumberId.numberType,
          monthlyRate: populatedBilling.phoneNumberId.monthlyRate,
          currency: populatedBilling.phoneNumberId.currency,
          country: populatedBilling.phoneNumberId.country,
          countryCode: populatedBilling.phoneNumberId.countryCode,
        },
        user: populatedBilling.userId ? {
          _id: populatedBilling.userId._id.toString(),
          name: populatedBilling.userId.name,
          email: populatedBilling.userId.email,
          company: userOnboarding?.companyName || populatedBilling.userId.company,
          onboarding: {
            companyName: userOnboarding?.companyName || null,
          },
        } : {
          _id: null,
          name: 'Deleted User',
          email: 'deleted@unknown.com',
          company: 'Unknown',
          onboarding: {
            companyName: null,
          },
        },
        assignment: populatedBilling.assignmentId ? {
          _id: populatedBilling.assignmentId._id.toString(),
          assignedAt: populatedBilling.assignmentId.assignedAt?.toISOString(),
          unassignedAt: populatedBilling.assignmentId.unassignedAt?.toISOString(),
        } : null,
        billingPeriodStart: populatedBilling.billingPeriodStart.toISOString(),
        billingPeriodEnd: populatedBilling.billingPeriodEnd.toISOString(),
        billingDate: populatedBilling.billingDate.toISOString(),
        paidDate: populatedBilling.paidDate?.toISOString(),
        createdAt: populatedBilling.createdAt.toISOString(),
        updatedAt: populatedBilling.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({
      billings: transformedBillings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    console.error('Error fetching phone number billing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing records' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/phone-numbers/billing
 * Process billing charges using Sippy accountDebit API
 * Based on billing reflexions: no proration, full monthly rate, negative balance handling
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can process billing
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = processBillingSchema.parse(body);

    await connectToDatabase();

    // Get the billing record
    const billing = await PhoneNumberBilling.findById(validatedData.billingId)
      .populate('phoneNumberId')
      .populate('userId')
      .populate('assignmentId');

    if (!billing) {
      return NextResponse.json({ error: 'Billing record not found' }, { status: 404 });
    }

    if (billing.status !== 'pending') {
      return NextResponse.json({ error: 'Billing record is not pending' }, { status: 400 });
    }

    // Get user's Sippy account ID
    const billingUser = billing.userId as unknown as PopulatedUser;
    if (!billingUser.sippyAccountId) {
      return NextResponse.json({ 
        error: 'User does not have a Sippy account ID' 
      }, { status: 400 });
    }

    // Get phone number details
    const phoneNumber = billing.phoneNumberId as unknown as PopulatedPhoneNumber;

    try {
      // Get Sippy API credentials
      const credentials = await getSippyApiCredentials();
      
      if (!credentials) {
        return NextResponse.json({ 
          error: 'Sippy API not configured' 
        }, { status: 500 });
      }

      const sippyClient = new SippyClient(credentials);

      // Prepare billing note
      const paymentNotes = `Monthly charge for Number: ${phoneNumber.number} (${billing.transactionType})`;

      // Get the account's default currency to ensure compatibility
      let accountCurrency = billing.currency; // Default to billing currency
      try {
        const accountInfo = await sippyClient.getAccountInfo({ 
          i_account: billingUser.sippyAccountId 
        });
        
        // Use the account's default currency if available
        if (accountInfo?.payment_currency) {
          accountCurrency = accountInfo.payment_currency;
        }
      } catch (error) {
        // If we can't get account info, proceed with billing currency
        console.log(`Failed to get account info for ${billingUser.email}, using billing currency`);
      }

      // Process the charge using Sippy accountDebit
      // NOTE: Based on billing reflexions - we always charge full amount, no proration
      const debitResult = await sippyClient.accountDebit({
        i_account: billingUser.sippyAccountId,
        amount: billing.amount,
        currency: accountCurrency, // Use account's currency for compatibility
        payment_notes: paymentNotes,
      });

      // Update billing record based on result
      try {
        // Enhanced Sippy response analysis for XML-RPC format
        // Sippy API returns XML that gets parsed into an object with various possible success indicators
        const sippyResult = debitResult as SippyDebitResult;
        const resultValue = sippyResult.result;
        const txResult = sippyResult.tx_result;
        const hasError = (debitResult.error && debitResult.error.trim() !== '') || 
                        (debitResult.tx_error && debitResult.tx_error.trim() !== '');
        const hasTxId = debitResult.tx_id || debitResult.payment_id || debitResult.i_payment;
        
        // Determine success based on multiple criteria
        const isSuccess = (
          // Primary success indicators
          resultValue === 'success' || 
          resultValue === '1' ||
          resultValue === 1 ||
          resultValue === 'OK' ||
          resultValue === 'ok' ||
          // Transaction result success (Sippy standard)
          txResult === 1 ||
          txResult === '1' ||
          // Has transaction ID and no errors
          (hasTxId && !hasError) ||
          // General case: has result and no errors
          (resultValue && !hasError && resultValue !== 'failed' && resultValue !== 'error')
        );

        if (isSuccess) {
          // Success - mark as paid
          billing.status = 'paid';
          billing.paidDate = new Date();
          billing.sippyTransactionId = debitResult.tx_id || debitResult.payment_id || debitResult.i_payment?.toString() || `debit_${Date.now()}`;
          billing.processedBy = user.email;
          
          console.log('Billing processed successfully:', billing._id);
          await billing.save();
          
          // Update phone number's last billed date
          await PhoneNumber.findByIdAndUpdate(billing.phoneNumberId, {
            lastBilledDate: new Date(),
          });

        } else {
          // Failed - mark as failed and handle negative balance
          const failureReason = debitResult.error || debitResult.tx_error || `Unexpected result: ${JSON.stringify(resultValue)} (tx_result: ${txResult})`;
          console.log('Billing failed:', billing._id, 'Reason:', failureReason);
          
          billing.status = 'failed';
          billing.failureReason = failureReason;
          billing.processedBy = user.email;
          
          await billing.save();
          
          // If failure is due to insufficient funds, suspend the number
          if (failureReason.toLowerCase().includes('insufficient') || 
              failureReason.toLowerCase().includes('balance')) {
            
            await PhoneNumber.findByIdAndUpdate(billing.phoneNumberId, {
              status: 'suspended',
              notes: `Suspended due to insufficient funds: ${failureReason}`,
            });
          }
        }
      } catch (dbError) {
        console.error('Database update error after Sippy operation:', dbError);
        // Even if DB update fails, we've already charged the customer
        // Log this for manual review
      }

      return NextResponse.json({
        message: 'Billing processed successfully',
        billing: {
          _id: billing._id.toString(),
          status: billing.status,
          paidDate: billing.paidDate?.toISOString(),
          sippyTransactionId: billing.sippyTransactionId,
          failureReason: billing.failureReason,
        },
        sippyResult: debitResult,
      });

    } catch (sippyError) {
      console.error('Sippy API error:', sippyError);
      
      // Update billing record to reflect the failure
      billing.status = 'failed';
      billing.failureReason = sippyError instanceof Error ? sippyError.message : 'Sippy API error';
      billing.processedBy = user.email;
      await billing.save();

      return NextResponse.json({
        error: 'Failed to process billing via Sippy',
        details: sippyError instanceof Error ? sippyError.message : 'Unknown error',
        billing: {
          _id: billing._id.toString(),
          status: billing.status,
          failureReason: billing.failureReason,
        },
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error processing billing:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process billing' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/phone-numbers/billing
 * Create manual billing records (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can create manual billing
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createBillingSchema.parse(body);

    await connectToDatabase();

    // Verify phone number exists
    const phoneNumber = await PhoneNumber.findById(validatedData.phoneNumberId);
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    // Verify user exists
    const targetUser = await User.findById(validatedData.userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get current assignment
    const assignment = await PhoneNumberAssignment.findOne({
      phoneNumberId: validatedData.phoneNumberId,
      userId: validatedData.userId,
      status: 'active',
    });

    if (!assignment) {
      return NextResponse.json({ 
        error: 'No active assignment found for this user and phone number' 
      }, { status: 404 });
    }

    // Create billing record
    const billingDate = validatedData.billingDate ? new Date(validatedData.billingDate) : new Date();
    
    // For monthly fees, calculate period
    const billingPeriodStart = billingDate;
    let billingPeriodEnd = billingDate;
    
    if (validatedData.transactionType === 'monthly_fee') {
      billingPeriodEnd = new Date(billingDate);
      billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);
    }

    const billing = new PhoneNumberBilling({
      phoneNumberId: validatedData.phoneNumberId,
      userId: validatedData.userId,
      assignmentId: assignment._id,
      billingPeriodStart,
      billingPeriodEnd,
      amount: validatedData.amount,
      currency: validatedData.currency,
      status: 'pending',
      billingDate,
      transactionType: validatedData.transactionType,
      notes: validatedData.notes,
      processedBy: user.email,
    });

    await billing.save();

    // Populate the response
    const populatedBilling = await PhoneNumberBilling.findById(billing._id)
      .populate('phoneNumberId', 'number numberType monthlyRate currency country countryCode')
      .populate('userId', 'name email company')
      .populate('assignmentId', 'assignedAt unassignedAt')
      .lean();

    const typedBilling = populatedBilling as unknown as PopulatedBilling;
    
    const response = {
      ...populatedBilling,
      _id: typedBilling._id.toString(),
      phoneNumberId: typedBilling.phoneNumberId._id.toString(),
      userId: typedBilling.userId._id.toString(),
      assignmentId: typedBilling.assignmentId!._id.toString(),
      phoneNumber: {
        _id: typedBilling.phoneNumberId._id.toString(),
        number: typedBilling.phoneNumberId.number,
        numberType: typedBilling.phoneNumberId.numberType,
        monthlyRate: typedBilling.phoneNumberId.monthlyRate,
        currency: typedBilling.phoneNumberId.currency,
        country: typedBilling.phoneNumberId.country,
        countryCode: typedBilling.phoneNumberId.countryCode,
      },
      user: {
        _id: typedBilling.userId._id.toString(),
        name: typedBilling.userId.name,
        email: typedBilling.userId.email,
        company: typedBilling.userId.company,
      },
      assignment: {
        _id: typedBilling.assignmentId!._id.toString(),
        assignedAt: typedBilling.assignmentId!.assignedAt?.toISOString(),
        unassignedAt: typedBilling.assignmentId!.unassignedAt?.toISOString(),
      },
      billingPeriodStart: typedBilling.billingPeriodStart.toISOString(),
      billingPeriodEnd: typedBilling.billingPeriodEnd.toISOString(),
      billingDate: typedBilling.billingDate.toISOString(),
      paidDate: typedBilling.paidDate?.toISOString(),
      createdAt: typedBilling.createdAt.toISOString(),
      updatedAt: typedBilling.updatedAt.toISOString(),
    };

    return NextResponse.json({
      message: 'Billing record created successfully',
      billing: response,
    });

  } catch (error) {
    console.error('Error creating billing record:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create billing record' },
      { status: 500 }
    );
  }
} 