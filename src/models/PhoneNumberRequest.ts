import mongoose, { Document, Model, Schema } from 'mongoose';

// Phone Number Request interface
export interface IPhoneNumberRequest {
  requestNumber: string; // Auto-generated unique identifier
  phoneNumberId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  requestType: 'cancel' | 'transfer' | 'suspend' | 'modify';
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  reason: string;
  description?: string;
  
  // Admin actions
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  
  // Processing details
  processedBy?: string;
  processedAt?: Date;
  processingNotes?: string;
  
  // Schedule details
  scheduledDate?: Date;
  effectiveDate?: Date;
  
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  createdAt: Date;
  updatedAt: Date;
}

// Phone Number Request document interface
export interface IPhoneNumberRequestDocument extends IPhoneNumberRequest, Document {
  _id: mongoose.Types.ObjectId;
}

// Phone Number Request model interface
export interface IPhoneNumberRequestModel extends Model<IPhoneNumberRequestDocument> {
  generateRequestNumber(): Promise<string>;
}

// Phone Number Request schema
const phoneNumberRequestSchema = new Schema<IPhoneNumberRequestDocument, IPhoneNumberRequestModel>(
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
    },
    requestType: {
      type: String,
      required: [true, 'Request type is required'],
      enum: {
        values: ['cancel', 'transfer', 'suspend', 'modify'],
        message: 'Invalid request type',
      },
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
        message: 'Invalid status',
      },
      default: 'pending',
      index: true,
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      maxlength: [200, 'Reason cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    
    // Admin actions
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
    
    // Schedule details
    scheduledDate: {
      type: Date,
      index: true,
    },
    effectiveDate: {
      type: Date,
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
  },
  {
    timestamps: true,
    collection: 'phone_number_requests',
  }
);

// Auto-generate request number before saving
phoneNumberRequestSchema.pre('save', async function(next) {
  if (!this.requestNumber) {
    this.requestNumber = await (this.constructor as IPhoneNumberRequestModel).generateRequestNumber();
  }
  next();
});

// Static method to generate unique request number
phoneNumberRequestSchema.statics.generateRequestNumber = async function(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  const datePrefix = `PNR-${year}${month}${day}`;
  
  // Find the highest number for today
  const lastRequest = await this.findOne({
    requestNumber: { $regex: `^${datePrefix}` }
  }).sort({ requestNumber: -1 }).exec();
  
  let sequenceNumber = 1;
  if (lastRequest && lastRequest.requestNumber) {
    const lastSequence = parseInt(lastRequest.requestNumber.split('-').pop() || '0');
    sequenceNumber = lastSequence + 1;
  }
  
  return `${datePrefix}-${String(sequenceNumber).padStart(4, '0')}`;
};

// Add indexes for better query performance
phoneNumberRequestSchema.index({ userId: 1, status: 1 });
phoneNumberRequestSchema.index({ phoneNumberId: 1, status: 1 });
phoneNumberRequestSchema.index({ status: 1, createdAt: -1 });
phoneNumberRequestSchema.index({ requestType: 1, status: 1 });
phoneNumberRequestSchema.index({ scheduledDate: 1, status: 1 });

// Export the model
const PhoneNumberRequest = (mongoose.models.PhoneNumberRequest as IPhoneNumberRequestModel) || mongoose.model<IPhoneNumberRequestDocument, IPhoneNumberRequestModel>('PhoneNumberRequest', phoneNumberRequestSchema);
export default PhoneNumberRequest; 