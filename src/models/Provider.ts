import mongoose, { Document, Schema } from 'mongoose';

export type ProviderService = 
  | 'outbound_calls' 
  | 'inbound_calls' 
  | 'did_numbers' 
  | 'sms' 
  | 'emailing' 
  | 'whatsapp_business' 
  | 'other';

export interface IProvider extends Document {
  name: string;
  description?: string;
  services: ProviderService[];
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  supportedCountries?: string[]; // Country codes
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProviderSchema = new Schema<IProvider>({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  services: [{
    type: String,
    enum: ['outbound_calls', 'inbound_calls', 'did_numbers', 'sms', 'emailing', 'whatsapp_business', 'other'],
    required: true
  }],
  website: {
    type: String,
    trim: true
  },
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  contactPhone: {
    type: String,
    trim: true
  },
  supportedCountries: [{
    type: String,
    trim: true,
    uppercase: true
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
ProviderSchema.index({ services: 1 });
ProviderSchema.index({ isActive: 1 });
ProviderSchema.index({ supportedCountries: 1 });

export const Provider = mongoose.models.Provider || mongoose.model<IProvider>('Provider', ProviderSchema); 