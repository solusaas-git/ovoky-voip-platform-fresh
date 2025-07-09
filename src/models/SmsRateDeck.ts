import mongoose, { Document, Model, Schema } from 'mongoose';

// SMS Rate Deck interface
export interface ISmsRateDeck {
  name: string;
  description: string;
  currency: string;
  isActive: boolean;
  isDefault: boolean;
  rateCount: number;
  assignedUsers: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// SMS Rate Deck document interface
export interface ISmsRateDeckDocument extends ISmsRateDeck, Document {
  id: string;
}

// SMS Rate Deck model interface
export interface ISmsRateDeckModel extends Model<ISmsRateDeckDocument> {}

// SMS Rate Deck schema
const smsRateDeckSchema = new Schema<ISmsRateDeckDocument, ISmsRateDeckModel>(
  {
    name: {
      type: String,
      required: [true, 'Rate deck name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      uppercase: true,
      trim: true,
      minlength: [3, 'Currency must be 3 characters'],
      maxlength: [3, 'Currency must be 3 characters'],
      default: 'USD',
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    isDefault: {
      type: Boolean,
      required: true,
      default: false,
    },
    rateCount: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Rate count cannot be negative'],
    },
    assignedUsers: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Assigned users count cannot be negative'],
    },
    createdBy: {
      type: String,
      required: [true, 'Created by is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'sms_rate_decks',
  }
);

// Add indexes for better query performance
smsRateDeckSchema.index({ name: 1 });
smsRateDeckSchema.index({ isActive: 1 });
smsRateDeckSchema.index({ isDefault: 1 });
smsRateDeckSchema.index({ createdBy: 1 });
smsRateDeckSchema.index({ createdAt: -1 });

// Ensure only one default rate deck exists
smsRateDeckSchema.pre('save', async function (next) {
  if (this.isDefault && this.isModified('isDefault')) {
    // If this deck is being set as default, unset all other defaults
    await mongoose.model('SmsRateDeck').updateMany(
      { _id: { $ne: this._id }, isDefault: true },
      { isDefault: false }
    );
  }
  next();
});

// Create and export the SmsRateDeck model
const SmsRateDeck = (mongoose.models.SmsRateDeck as ISmsRateDeckModel) || 
  mongoose.model<ISmsRateDeckDocument, ISmsRateDeckModel>('SmsRateDeck', smsRateDeckSchema);

export default SmsRateDeck; 