import mongoose, { Document, Model, Schema } from 'mongoose';

// Contact method interface
export interface IContactMethod {
  type: 'phone' | 'email' | 'whatsapp' | 'other';
  value: string;
  description?: string; // For 'other' type
}

// Service interest interface
export interface IServiceInterest {
  service: 'outbound_calls' | 'inbound_calls' | 'did_numbers' | 'sms' | 'emailing' | 'whatsapp_business' | 'other';
  description?: string; // For 'other' service
  countries?: string[]; // For calls, SMS, WhatsApp
}

// Traffic volume interface
export interface ITrafficVolume {
  type: 'volume' | 'agents';
  value: number;
  unit: 'minutes' | 'calls' | 'sms' | 'agents';
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

// User onboarding interface
export interface IUserOnboarding {
  userId: string;
  // Company details
  companyName: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    state?: string;
  };
  phoneNumber: string;
  preferredContactMethods: IContactMethod[];
  
  // Services
  servicesInterested: IServiceInterest[];
  trafficVolume: ITrafficVolume;
  
  // Additional info
  additionalNotes?: string;
  
  // Status
  completed: boolean;
  completedAt?: Date;
  reviewedBy?: string; // Admin user ID who reviewed
  reviewedAt?: Date;
  approved?: boolean;
  adminNotes?: string; // Admin notes about the onboarding
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Document interface
export interface IUserOnboardingDocument extends IUserOnboarding, Document {
  id: string;
}

// Model interface
export interface IUserOnboardingModel extends Model<IUserOnboardingDocument> {}

// Contact method schema
const contactMethodSchema = new Schema<IContactMethod>({
  type: {
    type: String,
    enum: ['phone', 'email', 'whatsapp', 'other'],
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
}, { _id: false });

// Service interest schema
const serviceInterestSchema = new Schema<IServiceInterest>({
  service: {
    type: String,
    enum: ['outbound_calls', 'inbound_calls', 'did_numbers', 'sms', 'emailing', 'whatsapp_business', 'other'],
    required: true,
  },
  description: {
    type: String,
  },
  countries: [{
    type: String,
  }],
}, { _id: false });

// Traffic volume schema
const trafficVolumeSchema = new Schema<ITrafficVolume>({
  type: {
    type: String,
    enum: ['volume', 'agents'],
    required: true,
  },
  value: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    enum: ['minutes', 'calls', 'sms', 'agents'],
    required: true,
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true,
  },
}, { _id: false });

// Address schema
const addressSchema = new Schema({
  street: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  postalCode: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  state: {
    type: String,
  },
}, { _id: false });

// User onboarding schema
const userOnboardingSchema = new Schema<IUserOnboardingDocument, IUserOnboardingModel>({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  companyName: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: addressSchema,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
  },
  preferredContactMethods: {
    type: [contactMethodSchema],
    required: true,
    validate: {
      validator: function(methods: IContactMethod[]) {
        return methods.length > 0;
      },
      message: 'At least one contact method is required',
    },
  },
  servicesInterested: {
    type: [serviceInterestSchema],
    required: true,
    validate: {
      validator: function(services: IServiceInterest[]) {
        return services.length > 0;
      },
      message: 'At least one service must be selected',
    },
  },
  trafficVolume: {
    type: trafficVolumeSchema,
    required: true,
  },
  additionalNotes: {
    type: String,
    maxlength: 1000,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
  },
  reviewedBy: {
    type: String,
  },
  reviewedAt: {
    type: Date,
  },
  approved: {
    type: Boolean,
  },
  adminNotes: {
    type: String,
    maxlength: 1000,
  },
}, {
  timestamps: true,
  collection: 'user_onboarding',
});

// Indexes
userOnboardingSchema.index({ completed: 1 });
userOnboardingSchema.index({ approved: 1 });
userOnboardingSchema.index({ createdAt: -1 });

// Export types
export type UserOnboarding = IUserOnboarding;
export type ContactMethod = IContactMethod;
export type ServiceInterest = IServiceInterest;
export type TrafficVolume = ITrafficVolume;

// Create and export the model
const UserOnboardingModel = (mongoose.models.UserOnboarding as IUserOnboardingModel) || 
  mongoose.model<IUserOnboardingDocument, IUserOnboardingModel>('UserOnboarding', userOnboardingSchema);

export default UserOnboardingModel; 