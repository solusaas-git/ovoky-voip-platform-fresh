import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import WebhookEvent from '@/models/WebhookEvent';
import { connectToDatabase } from '@/lib/db';

interface WebhookEventData {
  _id: { toString(): string };
  eventId: string;
  eventType: string;
  processed: boolean;
  processedAt?: Date;
  metadata?: Record<string, any>;
  paymentIntentId?: string;
}

export async function POST(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Find and clean up any orphaned webhook events
    const duplicateEvents = await WebhookEvent.aggregate([
      {
        $group: {
          _id: { 
            paymentIntentId: "$paymentIntentId", 
            eventType: "$eventType" 
          },
          count: { $sum: 1 },
          events: { $push: "$$ROOT" }
        }
      },
      {
        $match: {
          "count": { $gt: 1 },
          "_id.paymentIntentId": { $ne: null }
        }
      }
    ]);

    let cleanedUp = 0;
    let processedPayments = 0;

    for (const group of duplicateEvents) {
      const events = group.events as WebhookEventData[];
      const processedEvent = events.find((e: WebhookEventData) => e.processed);
      
      if (processedEvent) {
        // Keep the processed event, mark others as processed too
        const duplicates = events.filter((e: WebhookEventData) => e._id.toString() !== processedEvent._id.toString());
        
        for (const duplicate of duplicates) {
          await WebhookEvent.findByIdAndUpdate(duplicate._id, {
            processed: true,
            processedAt: processedEvent.processedAt || new Date(),
            metadata: {
              ...duplicate.metadata,
              cleanedUp: true,
              originalEventId: processedEvent.eventId
            }
          });
          cleanedUp++;
        }
        processedPayments++;
      }
    }

    // Get statistics
    const stats = await WebhookEvent.aggregate([
      {
        $group: {
          _id: {
            provider: "$provider",
            eventType: "$eventType",
            processed: "$processed"
          },
          count: { $sum: 1 }
        }
      }
    ]);

    return NextResponse.json({
      message: 'Webhook events cleanup completed',
      cleaned: cleanedUp,
      processedPayments,
      duplicateGroups: duplicateEvents.length,
      statistics: stats
    });

  } catch (error) {
    console.error('Webhook cleanup error:', error);
    return NextResponse.json({ 
      error: 'Failed to clean up webhook events' 
    }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Get webhook event statistics
    const stats = await WebhookEvent.aggregate([
      {
        $group: {
          _id: {
            provider: "$provider",
            eventType: "$eventType",
            processed: "$processed"
          },
          count: { $sum: 1 },
          latest: { $max: "$createdAt" }
        }
      },
      {
        $sort: { "_id.provider": 1, "_id.eventType": 1 }
      }
    ]);

    // Check for potential duplicates
    const duplicates = await WebhookEvent.aggregate([
      {
        $group: {
          _id: { 
            paymentIntentId: "$paymentIntentId", 
            eventType: "$eventType" 
          },
          count: { $sum: 1 },
          eventIds: { $push: "$eventId" }
        }
      },
      {
        $match: {
          "count": { $gt: 1 },
          "_id.paymentIntentId": { $ne: null }
        }
      }
    ]);

    const recentEvents = await WebhookEvent.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select('eventId eventType provider processed paymentIntentId createdAt');

    return NextResponse.json({
      statistics: stats,
      duplicates: duplicates.length,
      duplicateDetails: duplicates,
      recentEvents,
      totalEvents: await WebhookEvent.countDocuments()
    });

  } catch (error) {
    console.error('Webhook stats error:', error);
    return NextResponse.json({ 
      error: 'Failed to get webhook statistics' 
    }, { status: 500 });
  }
} 