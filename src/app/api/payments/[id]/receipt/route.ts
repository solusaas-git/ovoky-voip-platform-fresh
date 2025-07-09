import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { Payment } from '@/models/Payment';
import { connectToDatabase } from '@/lib/db';
import { Types } from 'mongoose';

// TypeScript interfaces
interface PaymentDocument {
  _id: string;
  userId: string;
  userEmail: string;
  paymentIntentId: string;
  paymentReference?: string;
  paymentCompletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  paymentMethodType: string;
  gatewayName: string;
  provider: string;
  cardBrand?: string;
  cardLast4?: string;
  cardCountry?: string;
  topupAmount: number;
  processingFee: number;
  fixedFee: number;
  totalChargedAmount: number;
  currency: string;
  taxAmount?: number;
  taxRate?: number;
  description: string;
  notes?: string;
  receiptUrl?: string;
  sippyAccountId: string;
  sippyCustomerId: string;
  rawPaymentData?: {
    auditTrail?: Array<{
      updatedBy: string;
      updatedAt: Date;
      changes: Record<string, unknown>;
    }>;
    stripePaymentIntent?: unknown;
    webhookEvent?: unknown;
    paymentGatewayResponse?: unknown;
  };
}

interface PaymentUpdateData {
  notes?: string;
  description?: string;
  taxAmount?: number;
  taxRate?: number;
  paymentReference?: string;
  updatedAt?: Date;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const resolvedParams = await params;
    const paymentId = resolvedParams.id;

    // Build query based on whether the ID is a valid MongoDB ObjectId or not
    let query;
    if (Types.ObjectId.isValid(paymentId)) {
      // If it's a valid ObjectId, search by both _id and paymentIntentId
      query = {
        $or: [
          { _id: paymentId },
          { paymentIntentId: paymentId }
        ]
      };
    } else {
      // If it's not a valid ObjectId (like payment intent IDs), only search by paymentIntentId
      query = { paymentIntentId: paymentId };
    }

    // Find payment by MongoDB ID or Payment Intent ID
    const payment = await Payment.findOne(query).lean();

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Type assertion since we know findOne returns a single document
    const paymentDoc = payment as unknown as PaymentDocument;

    // Check if user can access this payment
    if (user.role !== 'admin' && paymentDoc.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Generate receipt data
    const receiptData = {
      // Receipt header
      receiptNumber: paymentDoc.paymentReference || `RCP-${paymentDoc._id}`,
      issueDate: paymentDoc.paymentCompletedAt || paymentDoc.createdAt,
      paymentDate: paymentDoc.paymentCompletedAt || paymentDoc.createdAt,
      
      // Company/Service info (you might want to make this configurable)
      company: {
        name: 'Sippy Dashboard',
        address: 'VoIP Services',
        email: 'support@sippydashboard.com',
        website: 'https://sippydashboard.com'
      },
      
      // Customer info
      customer: {
        email: paymentDoc.userEmail,
        accountId: paymentDoc.sippyAccountId,
        customerId: paymentDoc.sippyCustomerId
      },
      
      // Payment details
      payment: {
        id: paymentDoc.paymentIntentId,
        status: paymentDoc.status,
        method: paymentDoc.paymentMethodType,
        gateway: paymentDoc.gatewayName,
        provider: paymentDoc.provider
      },
      
      // Card details (if available)
      card: paymentDoc.cardBrand && paymentDoc.cardLast4 ? {
        brand: paymentDoc.cardBrand,
        last4: paymentDoc.cardLast4,
        country: paymentDoc.cardCountry
      } : null,
      
      // Amount breakdown
      amounts: {
        topupAmount: paymentDoc.topupAmount,
        processingFee: paymentDoc.processingFee,
        fixedFee: paymentDoc.fixedFee,
        totalCharged: paymentDoc.totalChargedAmount,
        currency: paymentDoc.currency
      },
      
      // Tax information (if applicable)
      tax: paymentDoc.taxAmount ? {
        amount: paymentDoc.taxAmount,
        rate: paymentDoc.taxRate ? `${(paymentDoc.taxRate * 100).toFixed(2)}%` : null
      } : null,
      
      // Additional info
      description: paymentDoc.description,
      notes: paymentDoc.notes,
      
      // URLs
      receiptUrl: paymentDoc.receiptUrl,
      
      // Metadata
      createdAt: paymentDoc.createdAt,
      updatedAt: paymentDoc.updatedAt
    };

    return NextResponse.json({
      success: true,
      receipt: receiptData
    });

  } catch (error) {
    console.error('Error generating receipt:', error);
    return NextResponse.json({ 
      error: 'Failed to generate receipt' 
    }, { status: 500 });
  }
}

// PUT endpoint to update payment record (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const resolvedParams = await params;
    const paymentId = resolvedParams.id;
    const body = await request.json();

    // Build query based on whether the ID is a valid MongoDB ObjectId or not
    let query;
    if (Types.ObjectId.isValid(paymentId)) {
      // If it's a valid ObjectId, search by both _id and paymentIntentId
      query = {
        $or: [
          { _id: paymentId },
          { paymentIntentId: paymentId }
        ]
      };
    } else {
      // If it's not a valid ObjectId (like payment intent IDs), only search by paymentIntentId
      query = { paymentIntentId: paymentId };
    }

    // Find payment
    const payment = await Payment.findOne(query);

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Update allowed fields
    const allowedUpdates = [
      'notes',
      'description',
      'taxAmount',
      'taxRate',
      'paymentReference'
    ];

    const updates: PaymentUpdateData = {};
    for (const field of allowedUpdates) {
      if (body[field] !== undefined) {
        (updates as Record<string, unknown>)[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ 
        error: 'No valid fields to update' 
      }, { status: 400 });
    }

    // Add audit trail
    updates.updatedAt = new Date();
    if (!payment.rawPaymentData) {
      payment.rawPaymentData = {};
    }
    if (!payment.rawPaymentData.auditTrail) {
      payment.rawPaymentData.auditTrail = [];
    }
    payment.rawPaymentData.auditTrail.push({
      updatedBy: user.email,
      updatedAt: new Date(),
      changes: updates
    });

    // Update payment
    const updatedPayment = await Payment.findOneAndUpdate(
      { _id: payment._id },
      { ...updates, rawPaymentData: payment.rawPaymentData },
      { new: true }
    ).lean();

    console.log(`💾 Payment record updated by admin:
      - Payment ID: ${(updatedPayment as unknown as { paymentIntentId?: string })?.paymentIntentId}
      - Updated by: ${user.email}
      - Changes: ${JSON.stringify(updates)}`);

    return NextResponse.json({
      success: true,
      message: 'Payment record updated successfully',
      payment: updatedPayment
    });

  } catch (error) {
    console.error('Error updating payment record:', error);
    return NextResponse.json({ 
      error: 'Failed to update payment record' 
    }, { status: 500 });
  }
} 