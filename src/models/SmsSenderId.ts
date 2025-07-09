import mongoose, { Document, Model, Schema } from 'mongoose';

// SMS Sender ID Status type
export type SmsSenderIdStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

// SMS Sender ID interface
export interface ISmsSenderId {
  userId: mongoose.Types.ObjectId;
  senderId: string;
  description?: string;
  country?: string;
  status: SmsSenderIdStatus;
  
  // Admin actions
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  suspendedBy?: mongoose.Types.ObjectId;
  suspendedAt?: Date;
  suspensionReason?: string;
  
  // Usage tracking
  usageCount: number;
  lastUsedAt?: Date;
  
  // Metadata
  isDefault: boolean;
  tags?: string[];
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// SMS Sender ID document interface
export interface ISmsSenderIdDocument extends ISmsSenderId, Document {
  id: string;
}

// SMS Sender ID model interface
export interface ISmsSenderIdModel extends Model<ISmsSenderIdDocument> {
  findByUserId(userId: string): Promise<ISmsSenderIdDocument[]>;
  findApprovedByUserId(userId: string): Promise<ISmsSenderIdDocument[]>;
  findPendingRequests(): Promise<ISmsSenderIdDocument[]>;
  approve(senderIdId: string, approvedBy: string): Promise<void>;
  reject(senderIdId: string, rejectedBy: string, reason: string): Promise<void>;
  suspend(senderIdId: string, suspendedBy: string, reason: string): Promise<void>;
}

// SMS Sender ID schema
const smsSenderIdSchema = new Schema<ISmsSenderIdDocument, ISmsSenderIdModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    senderId: {
      type: String,
      required: [true, 'Sender ID is required'],
      trim: true,
      maxlength: [20, 'Sender ID cannot exceed 20 characters'],
      validate: {
        validator: function(senderId: string) {
          // Support both alphanumeric (up to 11 chars) and numeric phone numbers (up to 20 chars)
          const isAlphanumeric = /^[a-zA-Z0-9]{1,11}$/.test(senderId) && !/^\d+$/.test(senderId);
          const isNumeric = /^(\+)?[0-9]{7,20}$/.test(senderId);
          return isAlphanumeric || isNumeric;
        },
        message: 'Sender ID must be either alphanumeric (up to 11 chars) or a valid phone number',
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    country: {
      type: String,
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [1000, 'Rejection reason cannot exceed 1000 characters'],
    },
    suspendedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    suspendedAt: {
      type: Date,
    },
    suspensionReason: {
      type: String,
      trim: true,
      maxlength: [1000, 'Suspension reason cannot exceed 1000 characters'],
    },
    usageCount: {
      type: Number,
      default: 0,
      min: [0, 'Usage count cannot be negative'],
    },
    lastUsedAt: {
      type: Date,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true,
    collection: 'sms_sender_ids',
  }
);

// Add indexes for better query performance
smsSenderIdSchema.index({ userId: 1, senderId: 1 }, { unique: true });
smsSenderIdSchema.index({ status: 1 });
smsSenderIdSchema.index({ senderId: 1 });
smsSenderIdSchema.index({ country: 1 });
smsSenderIdSchema.index({ isDefault: 1 });
smsSenderIdSchema.index({ usageCount: -1 });
smsSenderIdSchema.index({ createdAt: -1 });

// Static method to find sender IDs by user ID
smsSenderIdSchema.static('findByUserId', async function findByUserId(userId: string) {
  return this.find({ userId })
    .populate('approvedBy', 'name email')
    .populate('rejectedBy', 'name email')
    .populate('suspendedBy', 'name email')
    .sort({ isDefault: -1, usageCount: -1, createdAt: -1 });
});

// Static method to find approved sender IDs by user ID
smsSenderIdSchema.static('findApprovedByUserId', async function findApprovedByUserId(userId: string) {
  return this.find({ userId, status: 'approved' })
    .sort({ isDefault: -1, usageCount: -1, createdAt: -1 });
});

// Static method to find pending requests (admin only)
smsSenderIdSchema.static('findPendingRequests', async function findPendingRequests() {
  return this.find({ status: 'pending' })
    .populate('userId', 'name email')
    .sort({ createdAt: -1 });
});

// Static method to approve sender ID
smsSenderIdSchema.static('approve', async function approve(senderIdId: string, approvedBy: string) {
  await this.findByIdAndUpdate(senderIdId, {
    status: 'approved',
    approvedBy: new mongoose.Types.ObjectId(approvedBy),
    approvedAt: new Date(),
    // Clear rejection data if previously rejected
    rejectedBy: undefined,
    rejectedAt: undefined,
    rejectionReason: undefined,
  });
});

// Static method to reject sender ID
smsSenderIdSchema.static('reject', async function reject(
  senderIdId: string, 
  rejectedBy: string, 
  reason: string
) {
  await this.findByIdAndUpdate(senderIdId, {
    status: 'rejected',
    rejectedBy: new mongoose.Types.ObjectId(rejectedBy),
    rejectedAt: new Date(),
    rejectionReason: reason,
    // Clear approval data if previously approved
    approvedBy: undefined,
    approvedAt: undefined,
  });
});

// Static method to suspend sender ID
smsSenderIdSchema.static('suspend', async function suspend(
  senderIdId: string, 
  suspendedBy: string, 
  reason: string
) {
  await this.findByIdAndUpdate(senderIdId, {
    status: 'suspended',
    suspendedBy: new mongoose.Types.ObjectId(suspendedBy),
    suspendedAt: new Date(),
    suspensionReason: reason,
  });
});

// Pre-save hook to ensure only one default sender ID per user
smsSenderIdSchema.pre('save', async function(next) {
  if (this.isModified('isDefault') && this.isDefault) {
    // Remove default flag from other sender IDs of the same user
    const SmsSenderIdModel = mongoose.models.SmsSenderId || mongoose.model('SmsSenderId', smsSenderIdSchema);
    await SmsSenderIdModel.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Create and export the SmsSenderId model
const SmsSenderId = (mongoose.models.SmsSenderId as ISmsSenderIdModel) || 
  mongoose.model<ISmsSenderIdDocument, ISmsSenderIdModel>('SmsSenderId', smsSenderIdSchema);

export default SmsSenderId; 