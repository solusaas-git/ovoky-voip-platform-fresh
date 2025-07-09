import { NextRequest, NextResponse } from 'next/server';
import { PaymentGateway } from '@/models/PaymentGateway';
import User from '@/models/User';
import WebhookEvent, { IWebhookEvent } from '@/models/WebhookEvent';
import { Payment } from '@/models/Payment';
import { connectToDatabase } from '@/lib/db';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClient } from '@/lib/sippyClient';
import { sendGatewayPaymentSuccessEmail } from '@/lib/paymentEmailService';
import Stripe from 'stripe';

// Interfaces for type safety
interface StripeEventData {
  payment_intent?: string;
  id: string;
  [key: string]: unknown;
}

interface MongoError extends Error {
  code?: number;
  keyPattern?: { [key: string]: number };
}

interface ExpandedPaymentIntent extends Stripe.PaymentIntent {
  charges?: {
    data: Stripe.Charge[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    await connectToDatabase();

    // Get the active Stripe gateway to get the webhook secret
    const gateway = await PaymentGateway.findOne({ provider: 'stripe', isActive: true });
    if (!gateway || !gateway.configuration.webhookSecret) {
      console.error('No active Stripe gateway found or webhook secret missing');
      return NextResponse.json({ error: 'Configuration error' }, { status: 400 });
    }

    const stripe = new Stripe(gateway.configuration.secretKey!, {
      apiVersion: '2025-05-28.basil'
    });

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        gateway.configuration.webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Stripe webhook event:', event.type);

    // Extract payment intent ID for payment-related events
    let paymentIntentId = null;
    if (event.type.includes('payment_intent') || event.type.includes('charge')) {
      const eventData = event.data.object as unknown as StripeEventData;
      paymentIntentId = eventData.payment_intent || eventData.id;
    }

    // Check if this specific event has already been processed
    let existingEvent = await WebhookEvent.findOne({ 
      eventId: event.id,
      provider: 'stripe'
    });

    if (existingEvent && existingEvent.processed) {
      console.log(`🚫 Event ${event.id} already processed, skipping...`);
      return NextResponse.json({ 
        received: true, 
        message: 'Event already processed' 
      });
    }

    // For payment_intent.succeeded events, use atomic operation to prevent duplicates
    if (event.type === 'payment_intent.succeeded' && paymentIntentId) {
      console.log('💳 Attempting atomic processing for payment_intent.succeeded:', {
        paymentIntentId: paymentIntentId,
        eventId: event.id
      });

      // ADDITIONAL SAFEGUARD: Double-check if this payment was already processed
      const alreadyProcessedPayment = await WebhookEvent.findOne({
        paymentIntentId: paymentIntentId,
        eventType: 'payment_intent.succeeded',
        processed: true,
        provider: 'stripe'
      });

      if (alreadyProcessedPayment) {
        console.log(`🚫 SAFEGUARD: Payment ${paymentIntentId} already processed by event ${alreadyProcessedPayment.eventId}, skipping...`);
        
        // Still create/mark this event as processed for tracking
        if (!existingEvent) {
          const duplicateEvent = new WebhookEvent({
            eventId: event.id,
            eventType: event.type,
            provider: 'stripe' as const,
            paymentIntentId: paymentIntentId,
            processed: true,
            processedAt: new Date(),
            metadata: {
              stripeEvent: { id: event.id, type: event.type, created: event.created, livemode: event.livemode },
              skippedReason: 'Payment already processed - safeguard check',
              originalProcessedEvent: alreadyProcessedPayment.eventId
            }
          });
          await duplicateEvent.save();
        }
        
        return NextResponse.json({ 
          received: true, 
          message: 'Payment already processed - safeguard check' 
        });
      }

      // Create a special "payment completion" record atomically
      // This will fail if any other event has already created one for this payment
      try {
        const paymentCompletionRecord = new WebhookEvent({
          eventId: `payment_completion_${paymentIntentId}`,
          eventType: 'payment_completion_marker',
          provider: 'stripe' as const,
          paymentIntentId: paymentIntentId,
          processed: false,
          metadata: {
            originalEventId: event.id,
            originalEventType: event.type,
            createdForPayment: paymentIntentId,
            timestamp: new Date(),
            stripeEventData: {
              id: event.id,
              type: event.type,
              created: event.created,
              livemode: event.livemode
            }
          }
        });

        await paymentCompletionRecord.save();
        console.log(`🔒 Payment completion marker created for ${paymentIntentId} by event ${event.id}`);
      } catch (error: unknown) {
        // If we get a duplicate key error, another event already processed this payment
        if ((error as MongoError).code === 11000) {
          console.log(`🚫 ATOMIC LOCK: Payment ${paymentIntentId} already being processed by another event, skipping...`);
          
          // Still create/mark this event as processed for tracking
          if (!existingEvent) {
            const duplicateEvent = new WebhookEvent({
              eventId: event.id,
              eventType: event.type,
              provider: 'stripe' as const,
              paymentIntentId: paymentIntentId,
              processed: true,
              processedAt: new Date(),
              metadata: {
                stripeEvent: { id: event.id, type: event.type, created: event.created, livemode: event.livemode },
                skippedReason: 'Payment already being processed - atomic lock',
                atomicLockError: error instanceof Error ? error.message : 'Unknown error'
              }
            });
            await duplicateEvent.save();
          }
          
          return NextResponse.json({ 
            received: true, 
            message: 'Payment already processed by another event' 
          });
        } else {
          // Re-throw if it's a different error
          console.error('Unexpected error creating payment completion marker:', error);
          throw error;
        }
      }
    }

    // Create or update the webhook event record
    const webhookEventData = {
      eventId: event.id,
      eventType: event.type,
      provider: 'stripe' as const,
      paymentIntentId: paymentIntentId,
      metadata: {
        stripeEvent: {
          id: event.id,
          type: event.type,
          created: event.created,
          livemode: event.livemode
        }
      }
    };

    let webhookEvent: IWebhookEvent;
    if (existingEvent) {
      webhookEvent = existingEvent;
      // Ensure metadata exists
      if (!webhookEvent.metadata) {
        webhookEvent.metadata = {};
      }
    } else {
      try {
        webhookEvent = new WebhookEvent(webhookEventData);
        await webhookEvent.save();
      } catch (error: unknown) {
        // Handle race condition: if another request created the same event simultaneously
        const mongoError = error as MongoError;
        if (mongoError.code === 11000 && mongoError.keyPattern?.eventId) {
          console.log(`🔄 Race condition detected for event ${event.id}, fetching existing record...`);
          const raceConditionEvent = await WebhookEvent.findOne({ 
            eventId: event.id,
            provider: 'stripe'
          });
          
          if (raceConditionEvent && raceConditionEvent.processed) {
            console.log(`🚫 Event ${event.id} was processed by another request, skipping...`);
            return NextResponse.json({ 
              received: true, 
              message: 'Event already processed (race condition)' 
            });
          }
          
          // If not processed yet, use the existing record
          webhookEvent = raceConditionEvent!;
        } else {
          // Re-throw if it's a different error
          throw error;
        }
      }
    }

    // Handle the payment_intent.succeeded event ONLY (ignore charge.succeeded to prevent duplicates)
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const metadata = paymentIntent.metadata;

      console.log('💳 Processing payment_intent.succeeded:', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        metadata
      });

      if (!metadata.userId || !metadata.sippyAccountId || !metadata.topupAmount) {
        console.error('Missing required metadata in payment intent');
        
        // Clean up the payment completion marker
        if (paymentIntentId) {
          await WebhookEvent.findOneAndDelete({
            eventId: `payment_completion_${paymentIntentId}`,
            eventType: 'payment_completion_marker',
            provider: 'stripe'
          });
        }
        
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      try {
        // Get user details
        const user = await User.findById(metadata.userId);
        if (!user) {
          console.error('User not found:', metadata.userId);
          
          // Clean up the payment completion marker
          await WebhookEvent.findOneAndDelete({
            eventId: `payment_completion_${paymentIntentId}`,
            eventType: 'payment_completion_marker',
            provider: 'stripe'
          });
          
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get Sippy API credentials
        const sippyCredentials = await getSippyApiCredentials();
        if (!sippyCredentials) {
          console.error('Sippy API credentials not configured');
          
          // Clean up the payment completion marker
          await WebhookEvent.findOneAndDelete({
            eventId: `payment_completion_${paymentIntentId}`,
            eventType: 'payment_completion_marker',
            provider: 'stripe'
          });
          
          return NextResponse.json({ error: 'Sippy API not configured' }, { status: 500 });
        }

        // Initialize Sippy client
        const sippyClient = new SippyClient(sippyCredentials);

        // Add credit to Sippy account
        const topupAmount = parseFloat(metadata.topupAmount);
        const result = await sippyClient.addAccountCredit({
          i_account: parseInt(metadata.sippyAccountId),
          amount: topupAmount,
          currency: paymentIntent.currency.toUpperCase(),
          payment_notes: `Stripe payment - ${paymentIntent.id} - Top-up via ${gateway.name}`
        });

        console.log('Sippy credit added successfully:', result);

        // Get expanded payment intent with payment method details for both payment record and email
        const expandedPaymentIntent = await stripe.paymentIntents.retrieve(paymentIntent.id, {
          expand: ['payment_method', 'charges']
        });
        
        // Extract payment method details
        const paymentMethod = expandedPaymentIntent.payment_method as Stripe.PaymentMethod;
        const cardDetails = paymentMethod?.card;
        const billingDetails = paymentMethod?.billing_details;

        // SAVE COMPREHENSIVE PAYMENT DETAILS TO MONGODB
        try {
          console.log('🔍 Starting Payment record creation...');
          console.log('🔍 Payment Intent ID:', paymentIntent.id);
          console.log('🔍 User ID:', metadata.userId);
          console.log('🔍 User Email:', user.email);
          console.log('🔍 Sippy Account ID:', metadata.sippyAccountId);
          
          console.log('🔍 Using already retrieved payment method details');
          
          // Get client IP and user agent from the original payment intent creation
          const charges = (expandedPaymentIntent as ExpandedPaymentIntent).charges?.data || [];
          const latestCharge = charges[0];
          
          console.log('🔍 About to create Payment record with data:', {
            paymentIntentId: paymentIntent.id,
            userId: metadata.userId,
            userEmail: user.email,
            amount: topupAmount,
            currency: paymentIntent.currency.toUpperCase()
          });
          
          // Create comprehensive payment record
          const paymentRecord = new Payment({
            // Core identification
            paymentIntentId: paymentIntent.id,
            webhookEventId: (webhookEvent._id as { toString(): string }).toString(),
            
            // User and account info
            userId: metadata.userId,
            userEmail: user.email,
            sippyAccountId: parseInt(metadata.sippyAccountId),
            sippyCustomerId: user.sippyAccountId,
            
            // Payment amounts
            topupAmount: topupAmount,
            processingFee: parseFloat(metadata.processingFee),
            fixedFee: parseFloat(metadata.fixedFee),
            totalChargedAmount: paymentIntent.amount / 100, // Convert from cents
            currency: paymentIntent.currency.toUpperCase(),
            
            // Payment gateway info
            provider: 'stripe',
            gatewayId: metadata.gatewayId || gateway._id.toString(),
            gatewayName: gateway.name,
            
            // Payment method details
            paymentMethodType: paymentMethod?.type === 'card' ? 'card' : 'other',
            cardBrand: cardDetails?.brand,
            cardLast4: cardDetails?.last4,
            cardCountry: cardDetails?.country,
            cardFingerprint: cardDetails?.fingerprint,
            
            // Payment status and timing
            status: 'succeeded',
            paymentIntentStatus: paymentIntent.status,
            paymentInitiatedAt: new Date(paymentIntent.created * 1000),
            paymentCompletedAt: new Date(),
            sippyProcessedAt: new Date(),
            
            // Additional metadata
            description: paymentIntent.description || `Balance top-up of ${topupAmount} ${paymentIntent.currency.toUpperCase()}`,
            notes: `Stripe payment processed via webhook. Sippy credit added successfully.`,
            
            // Raw data storage for debugging and completeness
            rawPaymentData: {
              paymentIntent: {
                id: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                status: paymentIntent.status,
                created: paymentIntent.created,
                description: paymentIntent.description,
                metadata: paymentIntent.metadata,
                receipt_email: paymentIntent.receipt_email,
                shipping: paymentIntent.shipping
              },
              paymentMethod: paymentMethod ? {
                id: paymentMethod.id,
                type: paymentMethod.type,
                card: cardDetails ? {
                  brand: cardDetails.brand,
                  last4: cardDetails.last4,
                  exp_month: cardDetails.exp_month,
                  exp_year: cardDetails.exp_year,
                  fingerprint: cardDetails.fingerprint,
                  country: cardDetails.country,
                  funding: cardDetails.funding
                } : null,
                billing_details: billingDetails
              } : null,
              latestCharge: latestCharge ? {
                id: latestCharge.id,
                amount: latestCharge.amount,
                currency: latestCharge.currency,
                status: latestCharge.status,
                outcome: latestCharge.outcome,
                receipt_url: latestCharge.receipt_url,
                billing_details: latestCharge.billing_details
              } : null
            },
            rawWebhookData: {
              eventId: event.id,
              eventType: event.type,
              created: event.created,
              livemode: event.livemode,
              api_version: event.api_version,
              request: event.request
            }
          });
          
          console.log('🔍 Payment record created in memory, generating payment reference...');
          
          // Generate payment reference
          paymentRecord.generatePaymentReference();
          
          console.log('🔍 Payment reference generated:', paymentRecord.paymentReference);
          
          // Save receipt URL if available
          if (latestCharge?.receipt_url) {
            paymentRecord.receiptUrl = latestCharge.receipt_url;
            console.log('🔍 Receipt URL added:', latestCharge.receipt_url);
          }
          
          console.log('🔍 About to save Payment record to MongoDB...');
          
          await paymentRecord.save();
          
          console.log(`💾 Payment record saved to MongoDB:
            - Payment ID: ${paymentRecord.paymentIntentId}
            - Payment Reference: ${paymentRecord.paymentReference}
            - MongoDB ID: ${paymentRecord._id}
            - Card: ${paymentRecord.cardBrand} ending in ${paymentRecord.cardLast4}
            - Amount: ${paymentRecord.totalChargedAmount} ${paymentRecord.currency}
            - Top-up: ${paymentRecord.topupAmount} ${paymentRecord.currency}`);
          
          // Add payment record reference to webhook event metadata
          if (!webhookEvent.metadata) {
            webhookEvent.metadata = {};
          }
          webhookEvent.metadata.paymentRecord = {
            id: paymentRecord._id.toString(),
            paymentReference: paymentRecord.paymentReference,
            totalAmount: paymentRecord.totalChargedAmount,
            topupAmount: paymentRecord.topupAmount
          };
          
        } catch (paymentRecordError) {
          console.error('❌ Failed to save payment record to MongoDB:', paymentRecordError);
          console.error('❌ Error details:', {
            message: paymentRecordError instanceof Error ? paymentRecordError.message : 'Unknown error',
            stack: paymentRecordError instanceof Error ? paymentRecordError.stack : null,
            name: paymentRecordError instanceof Error ? paymentRecordError.name : null
          });
          // Don't fail the whole transaction if payment record creation fails
          // The payment was successful and Sippy was credited, just log the error
          if (!webhookEvent.metadata) {
            webhookEvent.metadata = {};
          }
          webhookEvent.metadata.paymentRecordError = {
            message: paymentRecordError instanceof Error ? paymentRecordError.message : 'Unknown error',
            timestamp: new Date()
          };
        }

        // CRITICAL MONITORING: Log the exact amount added vs payment amount
        const stripeAmountInEur = paymentIntent.amount / 100; // Stripe amount is in cents
        console.log(`🔍 PAYMENT INTEGRITY CHECK:
          - Stripe Payment Amount: €${stripeAmountInEur} (${paymentIntent.amount} cents)
          - Sippy Credit Amount: €${topupAmount}
          - User Top-up Request: €${metadata.topupAmount}
          - Processing Fee: €${metadata.processingFee}
          - Fixed Fee: €${metadata.fixedFee}
          - Payment Intent ID: ${paymentIntent.id}
          - Event ID: ${event.id}
          - Timestamp: ${new Date().toISOString()}`);

        // Verify amounts match expectations
        const expectedTotal = topupAmount + parseFloat(metadata.processingFee) + parseFloat(metadata.fixedFee);
        const actualTotal = stripeAmountInEur;
        const amountDifference = Math.abs(expectedTotal - actualTotal);
        
        if (amountDifference > 0.01) { // Allow 1 cent tolerance for rounding
          console.error(`⚠️ AMOUNT MISMATCH DETECTED:
            - Expected Total: €${expectedTotal.toFixed(2)}
            - Actual Charged: €${actualTotal.toFixed(2)}
            - Difference: €${amountDifference.toFixed(2)}
            - Payment: ${paymentIntent.id}`);
        }

        // Mark the webhook event as processed
        webhookEvent.processed = true;
        webhookEvent.processedAt = new Date();
        if (!webhookEvent.metadata) {
          webhookEvent.metadata = {};
        }
        webhookEvent.metadata.sippy = {
          accountId: metadata.sippyAccountId,
          amount: topupAmount,
          currency: paymentIntent.currency.toUpperCase(),
          result: result
        };
        // Add integrity check results to metadata
        webhookEvent.metadata.integrityCheck = {
          stripeAmount: stripeAmountInEur,
          sippyAmount: topupAmount,
          expectedTotal: expectedTotal,
          actualTotal: actualTotal,
          amountDifference: amountDifference,
          passed: amountDifference <= 0.01
        };
        await webhookEvent.save();

        // Mark the payment completion marker as processed
        await WebhookEvent.findOneAndUpdate({
          eventId: `payment_completion_${paymentIntentId}`,
          eventType: 'payment_completion_marker',
          provider: 'stripe'
        }, {
          processed: true,
          processedAt: new Date(),
          'metadata.completedBy': event.id
        });

        // Log the successful transaction
        console.log(`✅ Balance top-up completed:
          - User: ${user.email}
          - Sippy Account: ${metadata.sippyAccountId}
          - Amount: ${topupAmount} ${paymentIntent.currency.toUpperCase()}
          - Stripe Payment ID: ${paymentIntent.id}
          - Processing Fee: ${metadata.processingFee} ${paymentIntent.currency.toUpperCase()}
          - Fixed Fee: ${metadata.fixedFee} ${paymentIntent.currency.toUpperCase()}`);

        // Send payment success email
        try {
          await sendGatewayPaymentSuccessEmail({
            userId: metadata.userId,
            amount: topupAmount,
            currency: paymentIntent.currency.toUpperCase(),
            paymentMethod: cardDetails ? `${cardDetails.brand} ****${cardDetails.last4}` : 'Card',
            transactionId: paymentIntent.id,
            fees: {
              processingFee: parseFloat(metadata.processingFee),
              fixedFee: parseFloat(metadata.fixedFee),
            },
            gateway: gateway.name,
          });
          console.log(`📧 Payment success email queued for ${user.email}`);
        } catch (emailError) {
          console.error('Failed to send payment success email:', emailError);
          // Don't fail the payment processing if email fails
        }

        return NextResponse.json({ 
          success: true,
          message: 'Payment processed and balance updated successfully' 
        });

      } catch (error) {
        console.error('Error processing Sippy credit:', error);
        
        // Clean up the payment completion marker on error
        await WebhookEvent.findOneAndDelete({
          eventId: `payment_completion_${paymentIntentId}`,
          eventType: 'payment_completion_marker',
          provider: 'stripe'
        });
        
        // Mark the event as failed for potential retry
        if (!webhookEvent.metadata) {
          webhookEvent.metadata = {};
        }
        webhookEvent.metadata.error = {
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        };
        await webhookEvent.save();
        
        return NextResponse.json({ 
          error: 'Payment successful but failed to update account balance',
          paymentIntentId: paymentIntent.id,
          needsManualProcessing: true
        }, { status: 500 });
      }
    } else {
      // For other event types (including charge.succeeded), just mark as processed without doing anything
      webhookEvent.processed = true;
      webhookEvent.processedAt = new Date();
      
      if (event.type === 'charge.succeeded') {
        if (!webhookEvent.metadata) {
          webhookEvent.metadata = {};
        }
        webhookEvent.metadata.note = 'Charge event ignored - payment processed via payment_intent.succeeded';
        console.log(`ℹ️ Ignoring charge.succeeded event - payment will be processed by payment_intent.succeeded`);
      }
      
      await webhookEvent.save();
    }

    // Handle other event types if needed
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('❌ Payment failed:', {
        paymentIntentId: paymentIntent.id,
        lastPaymentError: paymentIntent.last_payment_error
      });

      // Save failed payment record to MongoDB
      try {
        const metadata = paymentIntent.metadata;
        
        if (metadata.userId && metadata.sippyAccountId && metadata.topupAmount) {
          const user = await User.findById(metadata.userId);
          
          if (user) {
            // Get expanded payment intent with payment method details
            const expandedPaymentIntent = await stripe.paymentIntents.retrieve(paymentIntent.id, {
              expand: ['payment_method']
            });
            
            const paymentMethod = expandedPaymentIntent.payment_method as Stripe.PaymentMethod;
            const cardDetails = paymentMethod?.card;
            const failureError = paymentIntent.last_payment_error;
            
            // Create payment record for failed payment
            const failedPaymentRecord = new Payment({
              // Core identification
              paymentIntentId: paymentIntent.id,
              webhookEventId: (webhookEvent._id as { toString(): string }).toString(),
              
              // User and account info
              userId: metadata.userId,
              userEmail: user.email,
              sippyAccountId: parseInt(metadata.sippyAccountId),
              sippyCustomerId: user.sippyCustomerId,
              
              // Payment amounts
              topupAmount: parseFloat(metadata.topupAmount),
              processingFee: parseFloat(metadata.processingFee || '0'),
              fixedFee: parseFloat(metadata.fixedFee || '0'),
              totalChargedAmount: paymentIntent.amount / 100,
              currency: paymentIntent.currency.toUpperCase(),
              
              // Payment gateway info
              provider: 'stripe',
              gatewayId: metadata.gatewayId || gateway._id.toString(),
              gatewayName: gateway.name,
              
              // Payment method details (if available)
              paymentMethodType: paymentMethod?.type === 'card' ? 'card' : 'other',
              cardBrand: cardDetails?.brand,
              cardLast4: cardDetails?.last4,
              cardCountry: cardDetails?.country,
              cardFingerprint: cardDetails?.fingerprint,
              
              // Payment status and timing
              status: 'failed',
              paymentIntentStatus: paymentIntent.status,
              failureCode: failureError?.code,
              failureMessage: failureError?.message,
              paymentInitiatedAt: new Date(paymentIntent.created * 1000),
              
              // Additional metadata
              description: paymentIntent.description || `Failed balance top-up attempt of ${metadata.topupAmount} ${paymentIntent.currency.toUpperCase()}`,
              notes: `Payment failed: ${failureError?.message || 'Unknown error'}`,
              
              // Raw data storage
              rawPaymentData: {
                paymentIntent: {
                  id: paymentIntent.id,
                  amount: paymentIntent.amount,
                  currency: paymentIntent.currency,
                  status: paymentIntent.status,
                  created: paymentIntent.created,
                  description: paymentIntent.description,
                  metadata: paymentIntent.metadata,
                  last_payment_error: paymentIntent.last_payment_error
                },
                paymentMethod: paymentMethod ? {
                  id: paymentMethod.id,
                  type: paymentMethod.type,
                  card: cardDetails ? {
                    brand: cardDetails.brand,
                    last4: cardDetails.last4,
                    country: cardDetails.country,
                    fingerprint: cardDetails.fingerprint
                  } : null
                } : null
              },
              rawWebhookData: {
                eventId: event.id,
                eventType: event.type,
                created: event.created,
                livemode: event.livemode
              }
            });
            
            await failedPaymentRecord.save();
            console.log(`💾 Failed payment record saved to MongoDB:
              - Payment ID: ${failedPaymentRecord.paymentIntentId}
              - MongoDB ID: ${failedPaymentRecord._id}
              - User: ${failedPaymentRecord.userEmail}
              - Amount: ${failedPaymentRecord.totalChargedAmount} ${failedPaymentRecord.currency}
              - Failure: ${failedPaymentRecord.failureCode} - ${failedPaymentRecord.failureMessage}`);
            
            // Add payment record reference to webhook event metadata
            if (!webhookEvent.metadata) {
              webhookEvent.metadata = {};
            }
            webhookEvent.metadata.failedPaymentRecord = {
              id: failedPaymentRecord._id.toString(),
              failureCode: failedPaymentRecord.failureCode,
              failureMessage: failedPaymentRecord.failureMessage,
              amount: failedPaymentRecord.totalChargedAmount
            };
            
            await webhookEvent.save();
          }
        }
      } catch (failedPaymentRecordError) {
        console.error('❌ Failed to save failed payment record to MongoDB:', failedPaymentRecordError);
      }
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ 
      error: 'Webhook processing failed' 
    }, { status: 500 });
  }
}

// Disable body parsing for webhooks
export const runtime = 'nodejs'; 