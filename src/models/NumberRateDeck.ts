import mongoose, { Document, Model, Schema } from 'mongoose';

// Number Rate Deck interface
export interface INumberRateDeck {
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

// Number Rate Deck document interface
export interface INumberRateDeckDocument extends INumberRateDeck, Document {
  id: string;
}

// Number Rate Deck model interface
export interface INumberRateDeckModel extends Model<INumberRateDeckDocument> {}

// Number Rate Deck schema
const numberRateDeckSchema = new Schema<INumberRateDeckDocument, INumberRateDeckModel>(
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
    collection: 'number_rate_decks',
  }
);

// Add indexes for better query performance
numberRateDeckSchema.index({ name: 1 });
numberRateDeckSchema.index({ isActive: 1 });
numberRateDeckSchema.index({ isDefault: 1 });
numberRateDeckSchema.index({ createdBy: 1 });
numberRateDeckSchema.index({ createdAt: -1 });

// Ensure only one default rate deck exists
numberRateDeckSchema.pre('save', async function (next) {
  if (this.isDefault && this.isModified('isDefault')) {
    // If this deck is being set as default, unset all other defaults
    await mongoose.model('NumberRateDeck').updateMany(
      { _id: { $ne: this._id }, isDefault: true },
      { isDefault: false }
    );
  }
  next();
});

// Create and export the NumberRateDeck model
const NumberRateDeck = (mongoose.models.NumberRateDeck as INumberRateDeckModel) || 
  mongoose.model<INumberRateDeckDocument, INumberRateDeckModel>('NumberRateDeck', numberRateDeckSchema);

export default NumberRateDeck; 