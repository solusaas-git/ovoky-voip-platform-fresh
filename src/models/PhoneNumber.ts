import mongoose, { Document, Model, Schema } from 'mongoose';

// Phone Number interface
export interface IPhoneNumber {
  number: string;
  country: string;
  countryCode: string;
  numberType: 'Geographic/Local' | 'Mobile' | 'National' | 'Toll-free' | 'Shared Cost' | 'NPV (Verified Numbers)' | 'Premium';
  provider: string;
  status: 'available' | 'assigned' | 'reserved' | 'suspended' | 'cancelled';
  
  // Backorder configuration
  backorderOnly: boolean; // If true, users must place backorder requests instead of direct purchase
  
  // Rate deck assignment - DEPRECATED: Rate decks are now assigned to users, not phone numbers
  // rateDeckId?: mongoose.Types.ObjectId;
  monthlyRate?: number;
  setupFee?: number;
  currency: string;
  
  // Assignment details
  assignedTo?: mongoose.Types.ObjectId;
  assignedBy?: string;
  assignedAt?: Date;
  unassignedAt?: Date;
  unassignedBy?: string;
  unassignedReason?: string;
  
  // Billing details
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate?: Date;
  lastBilledDate?: Date;
  billingDayOfMonth: number; // 1-28, for monthly billing
  
  // Additional metadata
  description?: string;
  capabilities: ('voice' | 'sms' | 'fax')[];
  region?: string;
  timeZone?: string;
  
  // Technical connection parameters
  connectionType?: 'ip_routing' | 'credentials';
  // For IP routing
  ipAddress?: string;
  port?: number;
  // For credentials
  login?: string;
  password?: string;
  domain?: string; // Can be IP or domain name
  credentialsPort?: number;
  
  // Admin fields
  createdBy: string;
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// Phone Number document interface
export interface IPhoneNumberDocument extends IPhoneNumber, Document {
  _id: mongoose.Types.ObjectId;
}

// Phone Number model interface
export interface IPhoneNumberModel extends Model<IPhoneNumberDocument> {}

// Phone Number schema
const phoneNumberSchema = new Schema<IPhoneNumberDocument, IPhoneNumberModel>(
  {
    number: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters'],
      index: true,
    },
    countryCode: {
      type: String,
      required: [true, 'Country code is required'],
      trim: true,
      maxlength: [10, 'Country code cannot exceed 10 characters'],
    },
    numberType: {
      type: String,
      required: [true, 'Number type is required'],
      enum: {
        values: ['Geographic/Local', 'Mobile', 'National', 'Toll-free', 'Shared Cost', 'NPV (Verified Numbers)', 'Premium'],
        message: 'Invalid number type',
      },
      index: true,
    },
    provider: {
      type: String,
      required: [true, 'Provider is required'],
      trim: true,
      maxlength: [100, 'Provider cannot exceed 100 characters'],
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['available', 'assigned', 'reserved', 'suspended', 'cancelled'],
        message: 'Invalid status',
      },
      default: 'available',
      index: true,
    },
    
    // Backorder configuration
    backorderOnly: {
      type: Boolean,
      required: true,
      default: false, // Default to allowing direct purchase
      index: true, // Index for filtering queries
    },
    
    // Rate deck assignment - DEPRECATED: Rate decks are now assigned to users, not phone numbers
    // rateDeckId: {
    //   type: Schema.Types.ObjectId,
    //   ref: 'NumberRateDeck',
    //   index: true,
    // },
    monthlyRate: {
      type: Number,
      min: [0, 'Monthly rate cannot be negative'],
    },
    setupFee: {
      type: Number,
      min: [0, 'Setup fee cannot be negative'],
      default: 0,
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      uppercase: true,
      trim: true,
      minlength: [3, 'Currency must be 3 characters'],
      maxlength: [3, 'Currency must be 3 characters'],
      default: 'EUR',
    },
    
    // Assignment details
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    assignedBy: {
      type: String,
      trim: true,
    },
    assignedAt: {
      type: Date,
      index: true,
    },
    unassignedAt: {
      type: Date,
    },
    unassignedBy: {
      type: String,
      trim: true,
    },
    unassignedReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Unassigned reason cannot exceed 500 characters'],
    },
    
    // Billing details
    billingCycle: {
      type: String,
      required: true,
      enum: {
        values: ['monthly', 'yearly'],
        message: 'Billing cycle must be monthly or yearly',
      },
      default: 'monthly',
    },
    nextBillingDate: {
      type: Date,
      index: true,
    },
    lastBilledDate: {
      type: Date,
    },
    billingDayOfMonth: {
      type: Number,
      required: true,
      min: [1, 'Billing day must be between 1 and 28'],
      max: [28, 'Billing day must be between 1 and 28'],
      default: 1,
    },
    
    // Additional metadata
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    capabilities: [{
      type: String,
      enum: {
        values: ['voice', 'sms', 'fax'],
        message: 'Invalid capability',
      },
    }],
    region: {
      type: String,
      trim: true,
      maxlength: [100, 'Region cannot exceed 100 characters'],
    },
    timeZone: {
      type: String,
      trim: true,
      maxlength: [100, 'Time zone cannot exceed 100 characters'],
    },
    
    // Technical connection parameters
    connectionType: {
      type: String,
      enum: {
        values: ['ip_routing', 'credentials'],
        message: 'Invalid connection type',
      },
    },
    // For IP routing
    ipAddress: {
      type: String,
      trim: true,
    },
    port: {
      type: Number,
    },
    // For credentials
    login: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      trim: true,
    },
    domain: {
      type: String,
      trim: true,
    },
    credentialsPort: {
      type: Number,
    },
    
    // Admin fields
    createdBy: {
      type: String,
      required: [true, 'Created by is required'],
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
    collection: 'phone_numbers',
  }
);

// Add indexes for better query performance
phoneNumberSchema.index({ status: 1, assignedTo: 1 });
phoneNumberSchema.index({ nextBillingDate: 1, status: 1 });
phoneNumberSchema.index({ country: 1, numberType: 1 });
phoneNumberSchema.index({ assignedTo: 1, status: 1 });

// Export the model
const PhoneNumber: IPhoneNumberModel = mongoose.models.PhoneNumber || mongoose.model<IPhoneNumberDocument, IPhoneNumberModel>('PhoneNumber', phoneNumberSchema);
export default PhoneNumber; 