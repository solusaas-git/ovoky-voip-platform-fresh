import mongoose, { Document, Model, Schema } from 'mongoose';

// SMS Billing Settings interface
export interface ISmsBillingSettings {
  userId?: mongoose.Types.ObjectId; // null for global settings
  
  // Billing frequency
  billingFrequency: 'daily' | 'weekly' | 'monthly' | 'threshold';
  
  // Threshold settings
  maxAmount: number; // Max amount before triggering billing
  maxMessages: number; // Max messages before triggering billing
  
  // Billing day settings
  billingDayOfWeek?: number; // 0-6 for weekly billing (0 = Sunday)
  billingDayOfMonth?: number; // 1-28 for monthly billing
  
  // Advanced settings
  autoProcessing: boolean; // Auto-process or require manual approval
  notificationEnabled: boolean; // Send notifications when billing is created
  notificationThreshold: number; // Notify when amount reaches this threshold
  
  // Administrative
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

// SMS Billing Settings document interface
export interface ISmsBillingSettingsDocument extends ISmsBillingSettings, Document {
  id: string;
}

// SMS Billing Settings model interface
export interface ISmsBillingSettingsModel extends Model<ISmsBillingSettingsDocument> {
  getSettingsForUser(userId: string): Promise<ISmsBillingSettingsDocument>;
  getGlobalSettings(): Promise<ISmsBillingSettingsDocument>;
  shouldTriggerBilling(userId: string, currentAmount: number, currentMessages: number): Promise<boolean>;
}

// SMS Billing Settings schema
const smsBillingSettingsSchema = new Schema<ISmsBillingSettingsDocument, ISmsBillingSettingsModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      sparse: true, // Allows null for global settings
    },
    
    billingFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'threshold'],
      required: [true, 'Billing frequency is required'],
      default: 'daily',
    },
    
    maxAmount: {
      type: Number,
      required: [true, 'Max amount is required'],
      min: [0, 'Max amount cannot be negative'],
      default: 100, // $100 default threshold
    },
    
    maxMessages: {
      type: Number,
      required: [true, 'Max messages is required'],
      min: [0, 'Max messages cannot be negative'],
      default: 1000, // 1000 messages default threshold
    },
    
    billingDayOfWeek: {
      type: Number,
      min: [0, 'Day of week must be 0-6'],
      max: [6, 'Day of week must be 0-6'],
      default: 1, // Monday
    },
    
    billingDayOfMonth: {
      type: Number,
      min: [1, 'Day of month must be 1-28'],
      max: [28, 'Day of month must be 1-28'],
      default: 1, // 1st of month
    },
    
    autoProcessing: {
      type: Boolean,
      default: true,
    },
    
    notificationEnabled: {
      type: Boolean,
      default: true,
    },
    
    notificationThreshold: {
      type: Number,
      min: [0, 'Notification threshold cannot be negative'],
      default: 50, // Notify at $50
    },
    
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required'],
    },
    
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    collection: 'sms_billing_settings',
  }
);

// Add compound indexes
smsBillingSettingsSchema.index({ userId: 1, isActive: 1 });
smsBillingSettingsSchema.index({ billingFrequency: 1, isActive: 1 });

// Static method to get settings for a user (with fallback to global)
smsBillingSettingsSchema.static('getSettingsForUser', async function getSettingsForUser(userId: string) {
  // First try user-specific settings
  let settings = await this.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    isActive: true
  });
  
  // Fallback to global settings
  if (!settings) {
    settings = await this.findOne({
      userId: null,
      isActive: true
    });
  }
  
  // Create default global settings if none exist
  if (!settings) {
    settings = await this.create({
      userId: null,
      billingFrequency: 'daily',
      maxAmount: 100,
      maxMessages: 1000,
      autoProcessing: true,
      notificationEnabled: true,
      notificationThreshold: 50,
      isActive: true,
      createdBy: new mongoose.Types.ObjectId('000000000000000000000000'), // System user
    });
  }
  
  return settings;
});

// Static method to get global settings
smsBillingSettingsSchema.static('getGlobalSettings', async function getGlobalSettings() {
  let settings = await this.findOne({
    userId: null,
    isActive: true
  });
  
  if (!settings) {
    settings = await this.create({
      userId: null,
      billingFrequency: 'daily',
      maxAmount: 100,
      maxMessages: 1000,
      autoProcessing: true,
      notificationEnabled: true,
      notificationThreshold: 50,
      isActive: true,
      createdBy: new mongoose.Types.ObjectId('000000000000000000000000'),
    });
  }
  
  return settings;
});

// Static method to check if billing should be triggered
smsBillingSettingsSchema.static('shouldTriggerBilling', async function shouldTriggerBilling(
  userId: string,
  currentAmount: number,
  currentMessages: number
) {
  const settings = await this.getSettingsForUser(userId);
  
  if (settings.billingFrequency !== 'threshold') {
    return false; // Only trigger for threshold-based billing
  }
  
  // Check if either threshold is exceeded
  return currentAmount >= settings.maxAmount || currentMessages >= settings.maxMessages;
});

const SmsBillingSettings = mongoose.model<ISmsBillingSettingsDocument, ISmsBillingSettingsModel>(
  'SmsBillingSettings',
  smsBillingSettingsSchema
);

export default SmsBillingSettings; 