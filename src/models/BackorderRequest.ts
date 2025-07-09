import mongoose, { Document, Model, Schema } from 'mongoose';

// Backorder Request interface
export interface IBackorderRequest {
  requestNumber: string; // Auto-generated unique request ID
  phoneNumberId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  
  // Request details
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'expired';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reason?: string; // User's reason for requesting this number
  businessJustification?: string; // Additional business justification
  
  // Admin review
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  
  // Processing details
  processedBy?: string;
  processedAt?: Date;
  processingNotes?: string;
  
  // Expiration
  expiresAt?: Date; // Backorder requests can expire if not acted upon
  
  // Notification tracking
  lastNotificationSent?: Date;
  notificationCount: number;
  
  // Payment processing fields (for cron job)
  paymentProcessed?: boolean;
  paymentTransactionId?: string;
  paymentProcessedDate?: Date;
  paymentFailureReason?: string;
  setupFee?: number;
  monthlyRate?: number;
  currency?: string;
  country?: string;
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// Backorder Request document interface
export interface IBackorderRequestDocument extends IBackorderRequest, Document {
  _id: mongoose.Types.ObjectId;
}

// Backorder Request model interface
export interface IBackorderRequestModel extends Model<IBackorderRequestDocument> {
  generateRequestNumber(): Promise<string>;
}

// Backorder Request schema
const backorderRequestSchema = new Schema<IBackorderRequestDocument, IBackorderRequestModel>(
  {
    requestNumber: {
      type: String,
      unique: true,
      index: true,
    },
    phoneNumberId: {
      type: Schema.Types.ObjectId,
      ref: 'PhoneNumber',
      required: [true, 'Phone number ID is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    userEmail: {
      type: String,
      required: [true, 'User email is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    
    // Request details
    status: {
      type: String,
      required: true,
      enum: {
        values: ['pending', 'approved', 'rejected', 'completed', 'cancelled', 'expired'],
        message: 'Invalid status',
      },
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      required: true,
      enum: {
        values: ['low', 'medium', 'high', 'urgent'],
        message: 'Invalid priority',
      },
      default: 'medium',
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    businessJustification: {
      type: String,
      trim: true,
      maxlength: [1000, 'Business justification cannot exceed 1000 characters'],
    },
    
    // Admin review
    reviewedBy: {
      type: String,
      trim: true,
    },
    reviewedAt: {
      type: Date,
      index: true,
    },
    reviewNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review notes cannot exceed 1000 characters'],
    },
    
    // Processing details
    processedBy: {
      type: String,
      trim: true,
    },
    processedAt: {
      type: Date,
      index: true,
    },
    processingNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Processing notes cannot exceed 1000 characters'],
    },
    
    // Expiration
    expiresAt: {
      type: Date,
      index: true,
    },
    
    // Notification tracking
    lastNotificationSent: {
      type: Date,
    },
    notificationCount: {
      type: Number,
      default: 0,
      min: [0, 'Notification count cannot be negative'],
    },
    
    // Payment processing fields (for cron job)
    paymentProcessed: {
      type: Boolean,
      default: false,
      index: true,
    },
    paymentTransactionId: {
      type: String,
      trim: true,
    },
    paymentProcessedDate: {
      type: Date,
    },
    paymentFailureReason: {
      type: String,
      trim: true,
    },
    setupFee: {
      type: Number,
      min: [0, 'Setup fee cannot be negative'],
    },
    monthlyRate: {
      type: Number,
      min: [0, 'Monthly rate cannot be negative'],
    },
    currency: {
      type: String,
      default: 'EUR',
      uppercase: true,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true,
    collection: 'backorder_requests',
  }
);

// Auto-generate request number before saving
backorderRequestSchema.pre('save', async function(next) {
  if (!this.requestNumber) {
    this.requestNumber = await (this.constructor as IBackorderRequestModel).generateRequestNumber();
  }
  next();
});

// Static method to generate unique request number
backorderRequestSchema.statics.generateRequestNumber = async function(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  let counter = 1;
  let requestNumber: string;
  
  do {
    const counterStr = counter.toString().padStart(3, '0');
    requestNumber = `BO-${year}${month}${day}-${counterStr}`;
    
    const existing = await this.findOne({ requestNumber });
    if (!existing) {
      break;
    }
    
    counter++;
  } while (counter <= 999);
  
  if (counter > 999) {
    throw new Error('Unable to generate unique request number for today');
  }
  
  return requestNumber;
};

// Add compound indexes for better query performance
backorderRequestSchema.index({ userId: 1, status: 1, createdAt: -1 });
backorderRequestSchema.index({ phoneNumberId: 1, status: 1 });
backorderRequestSchema.index({ status: 1, priority: 1, createdAt: 1 });
backorderRequestSchema.index({ expiresAt: 1, status: 1 });

// Export the model
const BackorderRequest = (mongoose.models.BackorderRequest as IBackorderRequestModel) || mongoose.model<IBackorderRequestDocument, IBackorderRequestModel>('BackorderRequest', backorderRequestSchema);
export default BackorderRequest; 