import mongoose, { Document, Model, Schema } from 'mongoose';

// Number Rate interface
export interface INumberRate {
  rateDeckId: mongoose.Types.ObjectId;
  prefix: string;
  country: string;
  description: string;
  rate: number;
  setupFee: number;
  type: 'Geographic/Local' | 'Mobile' | 'National' | 'Toll-free' | 'Shared Cost' | 'NPV (Verified Numbers)';
  effectiveDate: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Number Rate document interface
export interface INumberRateDocument extends INumberRate, Document {
  id: string;
}

// Number Rate model interface
export interface INumberRateModel extends Model<INumberRateDocument> {}

// Number Rate schema
const numberRateSchema = new Schema<INumberRateDocument, INumberRateModel>(
  {
    rateDeckId: {
      type: Schema.Types.ObjectId,
      ref: 'NumberRateDeck',
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
    setupFee: {
      type: Number,
      required: false,
      default: 0,
      min: [0, 'Setup fee cannot be negative'],
    },
    type: {
      type: String,
      required: [true, 'Rate type is required'],
      enum: {
        values: ['Geographic/Local', 'Mobile', 'National', 'Toll-free', 'Shared Cost', 'NPV (Verified Numbers)'],
        message: 'Invalid rate type',
      },
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
    collection: 'number_rates',
  }
);

// Add indexes for better query performance
numberRateSchema.index({ rateDeckId: 1, prefix: 1 }, { unique: true }); // Unique prefix per rate deck
numberRateSchema.index({ prefix: 1 });
numberRateSchema.index({ country: 1 });
numberRateSchema.index({ type: 1 });
numberRateSchema.index({ rate: 1 });
numberRateSchema.index({ effectiveDate: 1 });
numberRateSchema.index({ createdAt: -1 });

// Create and export the NumberRate model
const NumberRate = (mongoose.models.NumberRate as INumberRateModel) || 
  mongoose.model<INumberRateDocument, INumberRateModel>('NumberRate', numberRateSchema);

export default NumberRate; 