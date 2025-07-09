import mongoose, { Document, Schema } from 'mongoose';

export interface ICountry extends Document {
  name: string;
  code: string; // ISO country code (e.g., "US", "GB")
  phoneCode: string; // Country calling code (e.g., "1", "44")
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CountrySchema = new Schema<ICountry>({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    unique: true,
    maxlength: 3
  },
  phoneCode: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
CountrySchema.index({ isActive: 1 });

export const Country = mongoose.models.Country || mongoose.model<ICountry>('Country', CountrySchema); 