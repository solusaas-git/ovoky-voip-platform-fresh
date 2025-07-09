import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import WebhookEvent from '@/models/WebhookEvent';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24');
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Get payment processing statistics
    const stats = await WebhookEvent.aggregate([
      {
        $match: {
          eventType: 'payment_intent.succeeded',
          provider: 'stripe',
          createdAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          processedPayments: {
            $sum: { $cond: [{ $eq: ['$processed', true] }, 1, 0] }
          },
          failedPayments: {
            $sum: { $cond: [{ $eq: ['$processed', false] }, 1, 0] }
          },
          totalAmount: {
            $sum: { $ifNull: ['$metadata.sippy.amount', 0] }
          },
          integrityFailures: {
            $sum: {
              $cond: [
                { $eq: ['$metadata.integrityCheck.passed', false] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Get recent payment completion markers
    const paymentMarkers = await WebhookEvent.find({
      eventType: 'payment_completion_marker',
      provider: 'stripe',
      createdAt: { $gte: since }
    }).select('paymentIntentId processed metadata.originalEventId createdAt');

    // Get skipped payments (duplicates caught)
    const skippedPayments = await WebhookEvent.find({
      eventType: 'payment_intent.succeeded',
      provider: 'stripe',
      'metadata.skippedReason': { $exists: true },
      createdAt: { $gte: since }
    }).select('eventId paymentIntentId metadata.skippedReason createdAt');

    // Get integrity check failures
    const integrityFailures = await WebhookEvent.find({
      eventType: 'payment_intent.succeeded',
      provider: 'stripe',
      'metadata.integrityCheck.passed': false,
      createdAt: { $gte: since }
    }).select('eventId paymentIntentId metadata.integrityCheck createdAt');

    // Calculate duplicate prevention effectiveness
    const totalPaymentIntents = await WebhookEvent.distinct('paymentIntentId', {
      eventType: 'payment_intent.succeeded',
      provider: 'stripe',
      createdAt: { $gte: since }
    });

    const uniqueProcessedPayments = await WebhookEvent.distinct('paymentIntentId', {
      eventType: 'payment_intent.succeeded',
      provider: 'stripe',
      processed: true,
      createdAt: { $gte: since }
    });

    const response = {
      timeframe: `Last ${hours} hours`,
      timestamp: new Date().toISOString(),
      summary: stats[0] || {
        totalPayments: 0,
        processedPayments: 0,
        failedPayments: 0,
        totalAmount: 0,
        integrityFailures: 0
      },
      duplicatePrevention: {
        totalPaymentIntents: totalPaymentIntents.length,
        uniqueProcessedPayments: uniqueProcessedPayments.length,
        duplicatesBlocked: totalPaymentIntents.length - uniqueProcessedPayments.length,
        effectiveness: totalPaymentIntents.length > 0 
          ? ((uniqueProcessedPayments.length / totalPaymentIntents.length) * 100).toFixed(2) + '%'
          : '100%'
      },
      details: {
        paymentMarkers: paymentMarkers.length,
        skippedPayments: skippedPayments.length,
        integrityFailures: integrityFailures.length
      },
      issues: {
        skippedPayments,
        integrityFailures: integrityFailures.map(failure => ({
          eventId: failure.eventId,
          paymentIntentId: failure.paymentIntentId,
          expectedAmount: failure.metadata.integrityCheck.expectedTotal,
          actualAmount: failure.metadata.integrityCheck.actualTotal,
          difference: failure.metadata.integrityCheck.amountDifference,
          createdAt: failure.createdAt
        }))
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Payment integrity check error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve payment integrity data' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    await connectToDatabase();

    // Clean up old payment completion markers (older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const cleanupResult = await WebhookEvent.deleteMany({
      eventType: 'payment_completion_marker',
      provider: 'stripe',
      processed: true,
      createdAt: { $lt: sevenDaysAgo }
    });

    return NextResponse.json({
      message: 'Payment markers cleanup completed',
      deletedMarkers: cleanupResult.deletedCount
    });

  } catch (error) {
    console.error('Payment markers cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup payment markers' },
      { status: 500 }
    );
  }
} 