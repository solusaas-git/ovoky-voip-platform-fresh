import mongoose, { Document, Model, Schema } from 'mongoose';
import { EmailCategory, ISmtpSettings, SmtpTestResult, EmailRoutingConfig, EMAIL_CATEGORY_DESCRIPTIONS, EMAIL_CATEGORY_EXAMPLES } from '@/types/smtp';

// SMTP Settings document interface
export interface ISmtpSettingsDocument extends Omit<ISmtpSettings, '_id'>, Document {}

// SMTP Settings model interface
export interface ISmtpSettingsModel extends Model<ISmtpSettingsDocument> {}

// SMTP Settings schema
const smtpSettingsSchema = new Schema<ISmtpSettingsDocument, ISmtpSettingsModel>(
  {
    name: {
      type: String,
      required: [true, 'SMTP account name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Email category is required'],
      enum: ['billing', 'authentication', 'support', 'default'],
      default: 'default',
    },
    host: {
      type: String,
      required: [true, 'SMTP host is required'],
      trim: true,
    },
    port: {
      type: Number,
      required: [true, 'SMTP port is required'],
      min: [1, 'Port must be at least 1'],
      max: [65535, 'Port must be at most 65535'],
    },
    secure: {
      type: Boolean,
      required: true,
      default: false,
    },
    username: {
      type: String,
      trim: true,
      default: '',
    },
    password: {
      type: String,
      select: false, // Don't return password by default for security
      default: '',
    },
    fromEmail: {
      type: String,
      required: [true, 'From email is required'],
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    fromName: {
      type: String,
      trim: true,
      default: 'Sippy Dashboard',
    },
    enabled: {
      type: Boolean,
      required: true,
      default: false,
    },
    isDefault: {
      type: Boolean,
      required: true,
      default: false,
    },
    priority: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Priority must be at least 0'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must be less than 500 characters'],
    },
  },
  {
    timestamps: true,
    collection: 'smtp_settings',
  }
);

// Indexes for efficient querying
smtpSettingsSchema.index({ category: 1, enabled: 1, priority: 1 });
smtpSettingsSchema.index({ isDefault: 1 });

// Ensure only one default SMTP account exists
smtpSettingsSchema.pre('save', async function (next) {
  if (this.isDefault) {
    // Remove default flag from other accounts
    await (this.constructor as ISmtpSettingsModel).updateMany(
      { _id: { $ne: this._id }, isDefault: true },
      { isDefault: false }
    );
  }
  next();
});

// Create and export the SmtpSettings model
const SmtpSettings = (mongoose.models.SmtpSettings as ISmtpSettingsModel) || 
  mongoose.model<ISmtpSettingsDocument, ISmtpSettingsModel>('SmtpSettings', smtpSettingsSchema);

export default SmtpSettings;

// Re-export types for server-side use
export type { EmailCategory, ISmtpSettings, SmtpTestResult, EmailRoutingConfig } from '@/types/smtp';
export { EMAIL_CATEGORY_DESCRIPTIONS, EMAIL_CATEGORY_EXAMPLES } from '@/types/smtp'; 