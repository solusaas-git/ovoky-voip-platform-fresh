import mongoose, { Document, Model, Schema } from 'mongoose';

// SMS Rate interface
export interface ISmsRate {
  rateDeckId: mongoose.Types.ObjectId;
  prefix: string;
  country: string;
  description: string;
  rate: number;
  effectiveDate: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// SMS Rate document interface
export interface ISmsRateDocument extends ISmsRate, Document {
  id: string;
}

// SMS Rate model interface
export interface ISmsRateModel extends Model<ISmsRateDocument> {}

// SMS Rate schema
const smsRateSchema = new Schema<ISmsRateDocument, ISmsRateModel>(
  {
    rateDeckId: {
      type: Schema.Types.ObjectId,
      ref: 'SmsRateDeck',
      required: [true, 'Rate deck ID is required'],
      index: true,
    },
    prefix: {
      type: String,
      required: [true, 'Prefix is required'],
      trim: true,
      maxlength: [20, 'Prefix cannot exceed 20 characters'],
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    rate: {
      type: Number,
      required: [true, 'Rate is required'],
      min: [0, 'Rate cannot be negative'],
    },
    effectiveDate: {
      type: Date,
      required: [true, 'Effective date is required'],
    },
    createdBy: {
      type: String,
      required: [true, 'Created by is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'sms_rates',
  }
);

// Add indexes for better query performance
smsRateSchema.index({ rateDeckId: 1, prefix: 1 }, { unique: true }); // Unique prefix per rate deck
// Note: rateDeckId already has index: true in schema definition above
smsRateSchema.index({ prefix: 1 });
smsRateSchema.index({ country: 1 });
smsRateSchema.index({ rate: 1 });
smsRateSchema.index({ effectiveDate: 1 });
smsRateSchema.index({ createdAt: -1 });

// Create and export the SmsRate model
const SmsRate = (mongoose.models.SmsRate as ISmsRateModel) || 
  mongoose.model<ISmsRateDocument, ISmsRateModel>('SmsRate', smsRateSchema);

export default SmsRate; 