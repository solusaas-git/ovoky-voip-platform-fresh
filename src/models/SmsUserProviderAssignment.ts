import mongoose, { Document, Model, Schema } from 'mongoose';

// SMS User Gateway Assignment interface
export interface ISmsUserProviderAssignment {
  userId: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;
  isActive: boolean;
  priority: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  dailyUsage: number;
  monthlyUsage: number;
  lastResetDaily: Date;
  lastResetMonthly: Date;
  assignedBy: mongoose.Types.ObjectId;
  assignedAt: Date;
  unassignedAt?: Date;
  unassignedBy?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// SMS User Gateway Assignment document interface
export interface ISmsUserProviderAssignmentDocument extends ISmsUserProviderAssignment, Document {
  resetDailyUsage(): Promise<void>;
  resetMonthlyUsage(): Promise<void>;
}

// SMS User Gateway Assignment model interface
export interface ISmsUserProviderAssignmentModel extends Model<ISmsUserProviderAssignmentDocument> {
  findByUserId(userId: string): Promise<ISmsUserProviderAssignmentDocument[]>;
  findActiveByUserId(userId: string): Promise<ISmsUserProviderAssignmentDocument[]>;
  assignProvider(userId: string, providerId: string, assignedBy: string, options?: { priority?: number; dailyLimit?: number; monthlyLimit?: number }): Promise<void>;
  unassignProvider(userId: string, providerId: string): Promise<void>;
  incrementUsage(userId: string, providerId: string): Promise<void>;
  resetDailyUsage(): Promise<void>;
  resetMonthlyUsage(): Promise<void>;
}

// SMS User Gateway Assignment schema
const smsUserProviderAssignmentSchema = new Schema<ISmsUserProviderAssignmentDocument, ISmsUserProviderAssignmentModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'SmsProvider',
      required: [true, 'Provider ID is required'],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 100,
      min: [1, 'Priority must be at least 1'],
      max: [1000, 'Priority cannot exceed 1000'],
    },
    dailyLimit: {
      type: Number,
      min: [1, 'Daily limit must be at least 1'],
    },
    monthlyLimit: {
      type: Number,
      min: [1, 'Monthly limit must be at least 1'],
    },
    dailyUsage: {
      type: Number,
      default: 0,
      min: [0, 'Daily usage cannot be negative'],
    },
    monthlyUsage: {
      type: Number,
      default: 0,
      min: [0, 'Monthly usage cannot be negative'],
    },
    lastResetDaily: {
      type: Date,
      default: Date.now,
    },
    lastResetMonthly: {
      type: Date,
      default: Date.now,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned by is required'],
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    unassignedAt: {
      type: Date,
    },
    unassignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'sms_user_provider_assignments',
  }
);

// Add indexes for better query performance
smsUserProviderAssignmentSchema.index({ userId: 1, providerId: 1 }, { unique: true });
smsUserProviderAssignmentSchema.index({ userId: 1, isActive: 1, priority: 1 });
smsUserProviderAssignmentSchema.index({ providerId: 1, isActive: 1 });
smsUserProviderAssignmentSchema.index({ lastResetDaily: 1 });
smsUserProviderAssignmentSchema.index({ lastResetMonthly: 1 });
smsUserProviderAssignmentSchema.index({ createdAt: -1 });

// Static method to find assignments by user ID
smsUserProviderAssignmentSchema.static('findByUserId', async function findByUserId(userId: string) {
  return this.find({ userId })
    .populate('providerId', 'name displayName description isActive type provider apiKey apiSecret apiEndpoint dailyLimit monthlyLimit supportedCountries rateLimit settings')
    .populate('assignedBy', 'name email')
    .sort({ priority: 1, createdAt: -1 });
});

// Static method to find active assignments by user ID
smsUserProviderAssignmentSchema.static('findActiveByUserId', async function findActiveByUserId(userId: string) {
  return this.find({ userId, isActive: true })
    .populate('providerId', 'name displayName description isActive type provider apiKey apiSecret apiEndpoint dailyLimit monthlyLimit supportedCountries rateLimit settings')
    .sort({ priority: 1, usageCount: 1 });
});

// Static method to assign provider to user
smsUserProviderAssignmentSchema.static('assignProvider', async function assignProvider(
  userId: string, 
  providerId: string, 
  assignedBy: string,
  options?: { priority?: number; dailyLimit?: number; monthlyLimit?: number }
) {
  const assignment = {
    userId: new mongoose.Types.ObjectId(userId),
    providerId: new mongoose.Types.ObjectId(providerId),
    assignedBy: new mongoose.Types.ObjectId(assignedBy),
    isActive: true,
    priority: options?.priority || 100,
    dailyLimit: options?.dailyLimit,
    monthlyLimit: options?.monthlyLimit,
  };
  
  await this.findOneAndUpdate(
    { userId: assignment.userId, providerId: assignment.providerId },
    { $set: assignment },
    { upsert: true, new: true }
  );
});

// Static method to unassign provider from user
smsUserProviderAssignmentSchema.static('unassignProvider', async function unassignProvider(
  userId: string, 
  providerId: string
) {
  await this.findOneAndUpdate(
    { 
      userId: new mongoose.Types.ObjectId(userId), 
      providerId: new mongoose.Types.ObjectId(providerId) 
    },
    { $set: { isActive: false } }
  );
});

// Static method to increment usage
smsUserProviderAssignmentSchema.static('incrementUsage', async function incrementUsage(
  userId: string, 
  providerId: string
) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const assignment = await this.findOne({ 
    userId: new mongoose.Types.ObjectId(userId), 
    providerId: new mongoose.Types.ObjectId(providerId) 
  });
  
  if (assignment) {
    const updateData: any = {
      $inc: { usageCount: 1 },
      $set: { lastUsedAt: now }
    };
    
    // Reset daily usage if needed
    if (!assignment.lastResetDaily || assignment.lastResetDaily < today) {
      updateData.$set.dailyUsage = 1;
      updateData.$set.lastResetDaily = today;
    } else {
      updateData.$inc.dailyUsage = 1;
    }
    
    // Reset monthly usage if needed
    if (!assignment.lastResetMonthly || assignment.lastResetMonthly < thisMonth) {
      updateData.$set.monthlyUsage = 1;
      updateData.$set.lastResetMonthly = thisMonth;
    } else {
      updateData.$inc.monthlyUsage = 1;
    }
    
    await this.findByIdAndUpdate(assignment._id, updateData);
  }
});

// Static method to reset daily usage for all assignments
smsUserProviderAssignmentSchema.static('resetDailyUsage', async function resetDailyUsage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  await this.updateMany(
    { lastResetDaily: { $lt: today } },
    { 
      $set: { 
        dailyUsage: 0, 
        lastResetDaily: today 
      } 
    }
  );
});

// Static method to reset monthly usage for all assignments
smsUserProviderAssignmentSchema.static('resetMonthlyUsage', async function resetMonthlyUsage() {
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  
  await this.updateMany(
    { lastResetMonthly: { $lt: thisMonth } },
    { 
      $set: { 
        monthlyUsage: 0, 
        lastResetMonthly: thisMonth 
      } 
    }
  );
});

// Create and export the SmsUserProviderAssignment model
const SmsUserProviderAssignment = (mongoose.models.SmsUserProviderAssignment as ISmsUserProviderAssignmentModel) || 
  mongoose.model<ISmsUserProviderAssignmentDocument, ISmsUserProviderAssignmentModel>('SmsUserProviderAssignment', smsUserProviderAssignmentSchema);

export default SmsUserProviderAssignment; 