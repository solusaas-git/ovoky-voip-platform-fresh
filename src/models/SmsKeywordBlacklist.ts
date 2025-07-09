import mongoose, { Document, Model, Schema } from 'mongoose';

// SMS Keyword Blacklist interface
export interface ISmsKeywordBlacklist {
  keyword: string;
  description?: string;
  isActive: boolean;
  isExactMatch: boolean; // true for exact match, false for partial match
  isCaseSensitive: boolean;
  
  // Metadata
  category?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Usage tracking
  triggerCount: number;
  lastTriggeredAt?: Date;
  
  // Admin tracking
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

// SMS Keyword Blacklist document interface
export interface ISmsKeywordBlacklistDocument extends ISmsKeywordBlacklist, Document {
  id: string;
}

// SMS Keyword Blacklist model interface
export interface ISmsKeywordBlacklistModel extends Model<ISmsKeywordBlacklistDocument> {
  findActive(): Promise<ISmsKeywordBlacklistDocument[]>;
  checkMessage(message: string): Promise<{ blocked: boolean; matchedKeywords: string[] }>;
  incrementTrigger(keywordId: string): Promise<void>;
}

// SMS Keyword Blacklist schema
const smsKeywordBlacklistSchema = new Schema<ISmsKeywordBlacklistDocument, ISmsKeywordBlacklistModel>(
  {
    keyword: {
      type: String,
      required: [true, 'Keyword is required'],
      trim: true,
      maxlength: [100, 'Keyword cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isExactMatch: {
      type: Boolean,
      default: false,
    },
    isCaseSensitive: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      trim: true,
      maxlength: [50, 'Category cannot exceed 50 characters'],
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    triggerCount: {
      type: Number,
      default: 0,
      min: [0, 'Trigger count cannot be negative'],
    },
    lastTriggeredAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required'],
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    collection: 'sms_keyword_blacklist',
  }
);

// Add indexes for better query performance
smsKeywordBlacklistSchema.index({ keyword: 1 }, { unique: true });
smsKeywordBlacklistSchema.index({ isActive: 1 });
smsKeywordBlacklistSchema.index({ category: 1 });
smsKeywordBlacklistSchema.index({ severity: 1 });
smsKeywordBlacklistSchema.index({ triggerCount: -1 });
smsKeywordBlacklistSchema.index({ createdAt: -1 });

// Static method to find active keywords
smsKeywordBlacklistSchema.static('findActive', async function findActive() {
  return this.find({ isActive: true })
    .sort({ severity: 1, triggerCount: -1 });
});

// Static method to check message against blacklist
smsKeywordBlacklistSchema.static('checkMessage', async function checkMessage(message: string) {
  const activeKeywords = await this.findActive();
  const matchedKeywords: string[] = [];
  
  for (const keywordDoc of activeKeywords) {
    const keyword = keywordDoc.keyword;
    let messageToCheck = keywordDoc.isCaseSensitive ? message : message.toLowerCase();
    let keywordToCheck = keywordDoc.isCaseSensitive ? keyword : keyword.toLowerCase();
    
    let isMatch = false;
    
    if (keywordDoc.isExactMatch) {
      // Exact match: check if the keyword appears as a whole word
      const regex = new RegExp(`\\b${keywordToCheck.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      isMatch = regex.test(messageToCheck);
    } else {
      // Partial match: check if keyword appears anywhere in the message
      isMatch = messageToCheck.includes(keywordToCheck);
    }
    
    if (isMatch) {
      matchedKeywords.push(keyword);
      // Increment trigger count asynchronously
      this.incrementTrigger((keywordDoc._id as mongoose.Types.ObjectId).toString()).catch(console.error);
    }
  }
  
  return {
    blocked: matchedKeywords.length > 0,
    matchedKeywords
  };
});

// Static method to increment trigger count
smsKeywordBlacklistSchema.static('incrementTrigger', async function incrementTrigger(keywordId: string) {
  await this.findByIdAndUpdate(keywordId, {
    $inc: { triggerCount: 1 },
    $set: { lastTriggeredAt: new Date() }
  });
});

// Create and export the SmsKeywordBlacklist model
const SmsKeywordBlacklist = (mongoose.models.SmsKeywordBlacklist as ISmsKeywordBlacklistModel) || 
  mongoose.model<ISmsKeywordBlacklistDocument, ISmsKeywordBlacklistModel>('SmsKeywordBlacklist', smsKeywordBlacklistSchema);

export default SmsKeywordBlacklist; 