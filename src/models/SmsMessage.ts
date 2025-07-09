import mongoose, { Document, Model, Schema } from 'mongoose';

// SMS Message Status type
export type SmsMessageStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'undelivered';

// SMS Message interface
export interface ISmsMessage {
  userId: mongoose.Types.ObjectId;
  campaignId?: mongoose.Types.ObjectId;
  contactId?: mongoose.Types.ObjectId;
  senderId?: mongoose.Types.ObjectId;
  providerId?: mongoose.Types.ObjectId;
  
  // Message details
  to: string;
  from?: string;
  content: string;
  messageId?: string; // Gateway message ID
  
  // Status tracking
  status: SmsMessageStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  
  // Cost tracking
  cost: number;
  currency: string;
  rateDeckId?: mongoose.Types.ObjectId;
  prefix: string;
  
  // Gateway response
  providerResponse?: any;
  errorMessage?: string;
  deliveryReport?: any;
  
  // Metadata
  messageType: 'single' | 'campaign';
  retryCount: number;
  maxRetries: number;
  
  createdAt: Date;
  updatedAt: Date;
}

// SMS Message document interface
export interface ISmsMessageDocument extends ISmsMessage, Document {
  id: string;
}

// SMS Message model interface
export interface ISmsMessageModel extends Model<ISmsMessageDocument> {
  findByUserId(userId: string, limit?: number): Promise<ISmsMessageDocument[]>;
  findByCampaignId(campaignId: string): Promise<ISmsMessageDocument[]>;
  updateStatus(messageId: string, status: SmsMessageStatus, metadata?: any): Promise<void>;
  getMessageStats(userId: string, dateFrom?: Date, dateTo?: Date): Promise<any>;
}

// SMS Message schema
const smsMessageSchema = new Schema<ISmsMessageDocument, ISmsMessageModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'SmsCampaign',
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'SmsContact',
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'SmsSenderId',
      index: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'SmsProvider',
      index: true,
    },
    to: {
      type: String,
      required: [true, 'Recipient phone number is required'],
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
      index: true,
    },
    from: {
      type: String,
      trim: true,
      maxlength: [20, 'Sender phone number cannot exceed 20 characters'],
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: [1600, 'Message content cannot exceed 1600 characters'],
    },
    messageId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'queued', 'processing', 'sent', 'delivered', 'failed', 'undelivered', 'blocked', 'paused'],
      default: 'pending',
    },
    sentAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    cost: {
      type: Number,
      required: [true, 'Message cost is required'],
      min: [0, 'Cost cannot be negative'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      default: 'USD',
      maxlength: [3, 'Currency code cannot exceed 3 characters'],
    },
    rateDeckId: {
      type: Schema.Types.ObjectId,
      ref: 'SmsRateDeck',
      index: true,
    },
    prefix: {
      type: String,
      required: [true, 'Phone number prefix is required'],
      trim: true,
      maxlength: [10, 'Prefix cannot exceed 10 characters'],
    },
    providerResponse: {
      type: Schema.Types.Mixed,
    },
    errorMessage: {
      type: String,
      trim: true,
      maxlength: [1000, 'Error message cannot exceed 1000 characters'],
    },
    deliveryReport: {
      type: Schema.Types.Mixed,
    },
    messageType: {
      type: String,
      enum: ['single', 'campaign'],
      required: [true, 'Message type is required'],
      index: true,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: [0, 'Retry count cannot be negative'],
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: [0, 'Max retries cannot be negative'],
    },
  },
  {
    timestamps: true,
    collection: 'sms_messages',
  }
);

// Add indexes for better query performance
smsMessageSchema.index({ userId: 1, status: 1 });
smsMessageSchema.index({ userId: 1, createdAt: -1 });
smsMessageSchema.index({ campaignId: 1, status: 1 });
smsMessageSchema.index({ messageId: 1 }, { unique: true, sparse: true });
smsMessageSchema.index({ to: 1, sentAt: -1 });
smsMessageSchema.index({ prefix: 1 });
smsMessageSchema.index({ sentAt: -1 });
smsMessageSchema.index({ deliveredAt: -1 });

// Static method to find messages by user ID
smsMessageSchema.static('findByUserId', async function findByUserId(userId: string, limit = 100) {
  return this.find({ userId })
    .populate('campaignId', 'name')
    .populate('contactId', 'firstName lastName phoneNumber')
    .populate('senderId', 'name senderId')
    .sort({ createdAt: -1 })
    .limit(limit);
});

// Static method to find messages by campaign ID
smsMessageSchema.static('findByCampaignId', async function findByCampaignId(campaignId: string) {
  return this.find({ campaignId })
    .populate('contactId', 'firstName lastName phoneNumber')
    .sort({ createdAt: -1 });
});

// Static method to update message status
smsMessageSchema.static('updateStatus', async function updateStatus(
  messageId: string, 
  status: SmsMessageStatus, 
  metadata?: any
) {
  const updateData: any = { status };
  
  switch (status) {
    case 'sent':
      updateData.sentAt = new Date();
      break;
    case 'delivered':
      updateData.deliveredAt = new Date();
      if (metadata?.deliveryReport) {
        updateData.deliveryReport = metadata.deliveryReport;
      }
      break;
    case 'failed':
    case 'undelivered':
      updateData.failedAt = new Date();
      if (metadata?.errorMessage) {
        updateData.errorMessage = metadata.errorMessage;
      }
      break;
  }
  
  if (metadata?.providerResponse) {
    updateData.providerResponse = metadata.providerResponse;
  }
  
  await this.findOneAndUpdate({ messageId }, updateData);
});

// Static method to get message statistics
smsMessageSchema.static('getMessageStats', async function getMessageStats(
  userId: string, 
  dateFrom?: Date, 
  dateTo?: Date
) {
  const matchQuery: any = { userId: new mongoose.Types.ObjectId(userId) };
  
  if (dateFrom || dateTo) {
    matchQuery.createdAt = {};
    if (dateFrom) matchQuery.createdAt.$gte = dateFrom;
    if (dateTo) matchQuery.createdAt.$lte = dateTo;
  }
  
  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        sentMessages: {
          $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered']] }, 1, 0] }
        },
        deliveredMessages: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        },
        failedMessages: {
          $sum: { $cond: [{ $in: ['$status', ['failed', 'undelivered']] }, 1, 0] }
        },
        totalCost: { $sum: '$cost' },
        averageCost: { $avg: '$cost' },
      }
    }
  ]);
  
  return stats[0] || {
    totalMessages: 0,
    sentMessages: 0,
    deliveredMessages: 0,
    failedMessages: 0,
    totalCost: 0,
    averageCost: 0,
  };
});

// Create and export the SmsMessage model
const SmsMessage = (mongoose.models.SmsMessage as ISmsMessageModel) || 
  mongoose.model<ISmsMessageDocument, ISmsMessageModel>('SmsMessage', smsMessageSchema);

export default SmsMessage; 