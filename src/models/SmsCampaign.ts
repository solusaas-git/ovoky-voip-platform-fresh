import mongoose, { Document, Schema } from 'mongoose';

export interface ISmsCampaign extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused' | 'failed' | 'archived' | 'stopped';
  contactListId: mongoose.Types.ObjectId;
  templateId?: mongoose.Types.ObjectId;
  message: string;
  senderId: string;
  providerId: mongoose.Types.ObjectId;
  country: string;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  contactCount: number;
  matchedContacts: number;
  totalContacts: number;
  sentCount: number;
  failedCount: number;
  deliveredCount: number;
  estimatedCost: number;
  actualCost: number;
  progress: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SmsCampaignSchema = new Schema<ISmsCampaign>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'completed', 'paused', 'failed', 'archived', 'stopped'],
    default: 'draft'
  },
  contactListId: {
    type: Schema.Types.ObjectId,
    ref: 'SmsContactList',
    required: true
  },
  templateId: {
    type: Schema.Types.ObjectId,
    ref: 'SmsTemplate'
  },
  message: {
    type: String,
    required: true,
    maxlength: 1600 // Max SMS length
  },
  senderId: {
    type: String,
    required: true,
    trim: true
  },
  providerId: {
    type: Schema.Types.ObjectId,
    ref: 'SmsProvider',
    required: true
  },
  country: {
    type: String,
    required: true,
    trim: true
  },
  scheduledAt: {
    type: Date
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  contactCount: {
    type: Number,
    default: 0,
    min: 0
  },
  matchedContacts: {
    type: Number,
    default: 0,
    min: 0
  },
  totalContacts: {
    type: Number,
    default: 0,
    min: 0
  },
  sentCount: {
    type: Number,
    default: 0,
    min: 0
  },
  failedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  deliveredCount: {
    type: Number,
    default: 0,
    min: 0
  },
  estimatedCost: {
    type: Number,
    default: 0,
    min: 0
  },
  actualCost: {
    type: Number,
    default: 0,
    min: 0
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  errorMessage: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'smscampaigns'
});

// Indexes for performance
SmsCampaignSchema.index({ userId: 1, status: 1 });
SmsCampaignSchema.index({ userId: 1, createdAt: -1 });
SmsCampaignSchema.index({ scheduledAt: 1 }, { sparse: true });

// Virtual for completion rate
SmsCampaignSchema.virtual('completionRate').get(function() {
  if (this.contactCount === 0) return 0;
  return Math.round(((this.sentCount + this.failedCount + this.deliveredCount) / this.contactCount) * 100);
});

// Virtual for success rate
SmsCampaignSchema.virtual('successRate').get(function() {
  const totalProcessed = this.sentCount + this.failedCount + this.deliveredCount;
  if (totalProcessed === 0) return 0;
  return Math.round((this.deliveredCount / totalProcessed) * 100);
});

// Pre-save middleware to update progress
SmsCampaignSchema.pre('save', function(next) {
  if (this.contactCount > 0) {
    const totalProcessed = this.sentCount + this.failedCount + this.deliveredCount;
    this.progress = Math.round((totalProcessed / this.contactCount) * 100);
  }
  next();
});

// Static method to get campaigns by user
SmsCampaignSchema.statics.findByUser = function(userId: string, options: any = {}) {
  const query = this.find({ userId });
  
  if (options.status) {
    query.where('status', options.status);
  }
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  if (options.sort) {
    query.sort(options.sort);
  } else {
    query.sort({ createdAt: -1 });
  }
  
  return query.populate('contactListId', 'name contactCount')
              .populate('templateId', 'name')
              .populate('providerId', 'name');
};

// Method to check if campaign can be started
SmsCampaignSchema.methods.canStart = function() {
  return ['draft', 'paused', 'scheduled'].includes(this.status);
};

// Method to check if campaign can be paused
SmsCampaignSchema.methods.canPause = function() {
  return this.status === 'sending';
};

// Method to check if campaign can be stopped
SmsCampaignSchema.methods.canStop = function() {
  return ['sending', 'paused'].includes(this.status);
};

// Method to check if campaign can be archived
SmsCampaignSchema.methods.canArchive = function() {
  return ['completed', 'failed', 'stopped'].includes(this.status);
};

// Method to check if campaign can be restarted
SmsCampaignSchema.methods.canRestart = function() {
  return ['completed', 'stopped', 'failed'].includes(this.status);
};

// Method to start campaign
SmsCampaignSchema.methods.start = function() {
  if (!this.canStart()) {
    throw new Error(`Cannot start campaign with status '${this.status}'`);
  }
  
  this.status = 'sending';
  this.startedAt = new Date();
  
  return this.save();
};

// Method to pause campaign
SmsCampaignSchema.methods.pause = function() {
  if (!this.canPause()) {
    throw new Error(`Cannot pause campaign with status '${this.status}'`);
  }
  
  this.status = 'paused';
  
  return this.save();
};

// Method to stop campaign
SmsCampaignSchema.methods.stop = function() {
  if (!this.canStop()) {
    throw new Error(`Cannot stop campaign with status '${this.status}'`);
  }
  
  this.status = 'stopped';
  this.completedAt = new Date();
  
  return this.save();
};

// Method to restart campaign
SmsCampaignSchema.methods.restart = function() {
  if (!this.canRestart()) {
    throw new Error(`Cannot restart campaign with status '${this.status}'`);
  }
  
  this.status = 'draft';
  this.startedAt = undefined;
  this.completedAt = undefined;
  this.sentCount = 0;
  this.failedCount = 0;
  this.deliveredCount = 0;
  this.actualCost = 0;
  this.progress = 0;
  this.errorMessage = undefined;
  
  return this.save();
};

// Method to archive campaign
SmsCampaignSchema.methods.archive = function() {
  if (!this.canArchive()) {
    throw new Error(`Cannot archive campaign with status '${this.status}'`);
  }
  
  this.status = 'archived';
  
  return this.save();
};

export default mongoose.models.SmsCampaign || mongoose.model<ISmsCampaign>('SmsCampaign', SmsCampaignSchema); 