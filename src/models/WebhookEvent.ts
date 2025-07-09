import mongoose, { Schema, Document } from 'mongoose';

export interface IWebhookEvent extends Document {
  eventId: string;
  eventType: string;
  provider: 'stripe' | 'paypal' | 'square' | 'razorpay';
  paymentIntentId?: string;
  processed: boolean;
  processedAt: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const webhookEventSchema = new Schema<IWebhookEvent>(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    eventType: {
      type: String,
      required: true
    },
    provider: {
      type: String,
      required: true,
      enum: ['stripe', 'paypal', 'square', 'razorpay']
    },
    paymentIntentId: {
      type: String,
      index: true
    },
    processed: {
      type: Boolean,
      default: false,
      index: true
    },
    processedAt: {
      type: Date
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient queries
webhookEventSchema.index({ provider: 1, eventType: 1, processed: 1 });
webhookEventSchema.index({ paymentIntentId: 1, processed: 1 });

// TTL index to automatically delete old webhook events after 30 days
webhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

const WebhookEvent = mongoose.models.WebhookEvent || mongoose.model<IWebhookEvent>('WebhookEvent', webhookEventSchema);

export default WebhookEvent; 