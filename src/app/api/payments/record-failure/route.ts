import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { Payment } from '@/models/Payment';
import { PaymentGateway } from '@/models/PaymentGateway';
import { connectToDatabase } from '@/lib/db';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      paymentIntentId,
      error,
      errorCode,
      errorType,
      amount,
      currency,
      cardBrand,
      cardLast4,
      gatewayName,
      userAgent,
      ipAddress
    } = body;

    if (!paymentIntentId || !error || !amount || !currency) {
      return NextResponse.json({ 
        error: 'Missing required fields: paymentIntentId, error, amount, currency' 
      }, { status: 400 });
    }

    await connectToDatabase();

    // Get the payment gateway for additional context
    const gateway = await PaymentGateway.findOne({ 
      provider: 'stripe', 
      isActive: true 
    });

    if (!gateway) {
      return NextResponse.json({ 
        error: 'No active payment gateway found' 
      }, { status: 400 });
    }

    // Get additional details from Stripe if possible
    let stripePaymentIntent = null;
    let expandedDetails = null;
    
    try {
      const stripe = new Stripe(gateway.configuration.secretKey!, {
        apiVersion: '2025-05-28.basil'
      });
      
      stripePaymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['payment_method', 'latest_charge']
      });
      
      // Extract additional details from Stripe
      if (stripePaymentIntent) {
        const paymentMethod = stripePaymentIntent.payment_method as Stripe.PaymentMethod;
        const latestCharge = stripePaymentIntent.latest_charge as Stripe.Charge;
        
        expandedDetails = {
          paymentMethod: paymentMethod ? {
            id: paymentMethod.id,
            type: paymentMethod.type,
            card: paymentMethod.card ? {
              brand: paymentMethod.card.brand,
              last4: paymentMethod.card.last4,
              exp_month: paymentMethod.card.exp_month,
              exp_year: paymentMethod.card.exp_year,
              country: paymentMethod.card.country,
              funding: paymentMethod.card.funding,
              fingerprint: paymentMethod.card.fingerprint
            } : null,
            billing_details: paymentMethod.billing_details
          } : null,
          latestCharge: latestCharge ? {
            id: latestCharge.id,
            status: latestCharge.status,
            outcome: latestCharge.outcome,
            failure_code: latestCharge.failure_code,
            failure_message: latestCharge.failure_message,
            risk_level: latestCharge.outcome?.risk_level,
            risk_score: latestCharge.outcome?.risk_score,
            billing_details: latestCharge.billing_details
          } : null
        };
      }
    } catch (stripeError) {
      console.warn('Could not retrieve additional details from Stripe:', stripeError);
      // Continue without Stripe details - we still want to record the failure
    }

    // Generate a unique payment reference for failed payments
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const paymentReference = `FAIL-${timestamp}-${randomSuffix}`;

    // Create comprehensive failed payment record
    const failedPaymentRecord = new Payment({
      // Core identification
      paymentIntentId: paymentIntentId,
      webhookEventId: 'frontend_failure', // Special marker for frontend-reported failures
      paymentReference: paymentReference,
      
      // User and account info
      userId: user.id,
      userEmail: user.email,
      sippyAccountId: user.sippyAccountId || 0,
      sippyCustomerId: (user as unknown as { sippyCustomerId?: string }).sippyCustomerId,
      
      // Payment amounts (what was attempted)
      topupAmount: amount,
      processingFee: 0, // No fees charged on failed payments
      fixedFee: 0,
      totalChargedAmount: 0, // No amount actually charged
      currency: currency.toUpperCase(),
      
      // Payment gateway info
      provider: 'stripe',
      gatewayId: gateway._id.toString(),
      gatewayName: gatewayName || gateway.name,
      
      // Payment method details (from frontend or Stripe)
      paymentMethodType: 'card',
      cardBrand: cardBrand || expandedDetails?.paymentMethod?.card?.brand,
      cardLast4: cardLast4 || expandedDetails?.paymentMethod?.card?.last4,
      cardCountry: expandedDetails?.paymentMethod?.card?.country,
      cardFingerprint: expandedDetails?.paymentMethod?.card?.fingerprint,
      
      // Failure details
      status: 'failed',
      paymentIntentStatus: stripePaymentIntent?.status || 'failed',
      failureCode: errorCode,
      failureMessage: error,
      
      // Timestamps
      paymentInitiatedAt: stripePaymentIntent ? new Date(stripePaymentIntent.created * 1000) : new Date(),
      paymentCompletedAt: new Date(), // When the failure was recorded
      // Note: No sippyProcessedAt since we don't send failed payments to Sippy
      
      // Security and analysis data
      userAgent: userAgent,
      ipAddress: ipAddress,
      description: `Failed payment attempt: ${error}`,
      notes: `Payment failed with error: ${error}. Error code: ${errorCode}. Error type: ${errorType}. No funds were charged and no credit was added to Sippy account.`,
      
      // Raw data for analysis
      rawPaymentData: {
        frontendReported: {
          error,
          errorCode,
          errorType,
          timestamp: new Date().toISOString(),
          userAgent,
          ipAddress
        },
        stripePaymentIntent: stripePaymentIntent ? {
          id: stripePaymentIntent.id,
          amount: stripePaymentIntent.amount,
          currency: stripePaymentIntent.currency,
          status: stripePaymentIntent.status,
          created: stripePaymentIntent.created,
          description: stripePaymentIntent.description,
          metadata: stripePaymentIntent.metadata,
          last_payment_error: stripePaymentIntent.last_payment_error
        } : null,
        expandedDetails: expandedDetails
      }
    });

    await failedPaymentRecord.save();

    console.log('🚨 Failed payment recorded:', {
      paymentReference: paymentReference,
      paymentIntentId: paymentIntentId,
      userId: user.id,
      userEmail: user.email,
      error: error,
      errorCode: errorCode,
      amount: amount,
      currency: currency
    });

    return NextResponse.json({
      success: true,
      paymentReference: paymentReference,
      message: 'Failed payment recorded for analysis'
    });

  } catch (error) {
    console.error('Error recording failed payment:', error);
    return NextResponse.json({ 
      error: 'Failed to record payment failure' 
    }, { status: 500 });
  }
} 