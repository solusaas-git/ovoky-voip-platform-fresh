import mongoose, { Document, Model, Schema } from 'mongoose';

// User Notification Settings interface
export interface IUserNotificationSettings {
  userId: string;
  userEmail: string;
  lowBalanceThreshold: number;
  zeroBalanceThreshold: number;
  negativeBalanceThreshold: number;
  enableLowBalanceNotifications: boolean;
  enableZeroBalanceNotifications: boolean;
  enableNegativeBalanceNotifications: boolean;
  notificationFrequencyHours: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

// User Notification Settings document interface
export interface IUserNotificationSettingsDocument extends IUserNotificationSettings, Document {
  id: string;
}

// User Notification Settings model interface
export interface IUserNotificationSettingsModel extends Model<IUserNotificationSettingsDocument> {}

// Export the main interface for use in other files
export type UserNotificationSettings = IUserNotificationSettings;

// User Notification Settings schema
const userNotificationSettingsSchema = new Schema<IUserNotificationSettingsDocument, IUserNotificationSettingsModel>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      unique: true,
    },
    userEmail: {
      type: String,
      required: [true, 'User email is required'],
      trim: true,
      lowercase: true,
    },
    lowBalanceThreshold: {
      type: Number,
      required: true,
      default: 10.0000,
      min: [0, 'Threshold cannot be negative'],
    },
    zeroBalanceThreshold: {
      type: Number,
      required: true,
      default: 0.0000,
    },
    negativeBalanceThreshold: {
      type: Number,
      required: true,
      default: -0.0001,
    },
    enableLowBalanceNotifications: {
      type: Boolean,
      required: true,
      default: true,
    },
    enableZeroBalanceNotifications: {
      type: Boolean,
      required: true,
      default: true,
    },
    enableNegativeBalanceNotifications: {
      type: Boolean,
      required: true,
      default: true,
    },
    notificationFrequencyHours: {
      type: Number,
      required: true,
      default: 24,
      min: [1, 'Frequency must be at least 1 hour'],
      max: [168, 'Frequency cannot exceed 168 hours (1 week)'],
    },
    currency: {
      type: String,
      required: true,
      default: 'EUR',
      uppercase: true,
    },
  },
  {
    timestamps: true,
    collection: 'user_notification_settings',
  }
);

// Add indexes for better query performance
userNotificationSettingsSchema.index({ userEmail: 1 });

// Create and export the UserNotificationSettings model
const UserNotificationSettingsModel = (mongoose.models.UserNotificationSettings as IUserNotificationSettingsModel) || 
  mongoose.model<IUserNotificationSettingsDocument, IUserNotificationSettingsModel>('UserNotificationSettings', userNotificationSettingsSchema);

export default UserNotificationSettingsModel; 