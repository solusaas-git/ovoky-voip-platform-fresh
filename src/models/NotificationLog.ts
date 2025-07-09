import mongoose, { Document, Model, Schema } from 'mongoose';

// Notification Log interface
export interface INotificationLog {
  userId: string;
  userEmail: string;
  userName: string;
  sippyAccountId?: number; // Make optional for auth templates
  notificationType: 'low_balance' | 'zero_balance' | 'negative_balance' | 'email_verification' | 'account_activation' | 'high_cost_alert' | 'low_asr_alert' | 'extreme_usage_alert' | 'payment_success_gateway' | 'payment_success_admin' | 'payment_debit_admin' | 'password_reset' | 'ticket_created' | 'ticket_updated' | 'ticket_resolved' | 'ticket_assigned' | 'ticket_replied' | 'backorder_approved' | 'backorder_rejected' | 'cancellation_approved' | 'cancellation_rejected' | 'number_purchase_single' | 'number_purchase_bulk' | 'number_assignment' | 'number_unassignment' | 'admin_user_purchase_single' | 'admin_user_purchase_bulk' | 'admin_backorder_request' | 'admin_cancellation_request' | 'admin_user_registration';
  
  // Balance notification fields (optional for other types)
  balanceAmount?: number;
  thresholdAmount?: number;
  currency?: string;
  
  // Email verification fields
  otpCode?: string;
  
  // Account activation fields
  activationData?: any;
  
  // KPI alert fields  
  alertData?: any;
  
  // Payment notification fields
  paymentData?: {
    amount: number;
    currency: string;
    paymentMethod?: string;
    transactionId?: string;
    fees?: {
      processingFee?: number;
      fixedFee?: number;
    };
    gateway?: string;
    notes?: string;
    processedBy?: string; // For admin credits
  };
  
  status: 'pending' | 'sent' | 'failed';
  errorMessage?: string;
  emailSubject: string;
  emailBody: string;
  fromEmail?: string; // SMTP account used to send the email
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Notification Log document interface
export interface INotificationLogDocument extends INotificationLog, Document {}

// Notification Log model interface
export interface INotificationLogModel extends Model<INotificationLogDocument> {}

// Low Balance Settings interface
export interface ILowBalanceSettings {
  lowBalanceThreshold: number;
  zeroBalanceThreshold: number;
  negativeBalanceThreshold: number;
  enableLowBalanceNotifications: boolean;
  enableZeroBalanceNotifications: boolean;
  enableNegativeBalanceNotifications: boolean;
  notificationFrequencyHours: number; // How often to send notifications for the same condition
  createdAt: Date;
  updatedAt: Date;
}

// Low Balance Settings document interface
export interface ILowBalanceSettingsDocument extends ILowBalanceSettings, Document {}

// Low Balance Settings model interface
export interface ILowBalanceSettingsModel extends Model<ILowBalanceSettingsDocument> {}

// Notification Log schema
const notificationLogSchema = new Schema<INotificationLogDocument, INotificationLogModel>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
    },
    userEmail: {
      type: String,
      required: [true, 'User email is required'],
      trim: true,
      lowercase: true,
    },
    userName: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
    },
    sippyAccountId: {
      type: Number,
      index: true,
      // Not required anymore as auth templates may not have this
    },
    notificationType: {
      type: String,
      required: true,
      enum: ['low_balance', 'zero_balance', 'negative_balance', 'email_verification', 'account_activation', 'high_cost_alert', 'low_asr_alert', 'extreme_usage_alert', 'payment_success_gateway', 'payment_success_admin', 'payment_debit_admin', 'password_reset', 'ticket_created', 'ticket_updated', 'ticket_resolved', 'ticket_assigned', 'ticket_replied', 'backorder_approved', 'backorder_rejected', 'cancellation_approved', 'cancellation_rejected', 'number_purchase_single', 'number_purchase_bulk', 'number_assignment', 'number_unassignment', 'admin_user_purchase_single', 'admin_user_purchase_bulk', 'admin_backorder_request', 'admin_cancellation_request', 'admin_user_registration'],
      index: true,
    },
    // Balance notification fields (optional)
    balanceAmount: {
      type: Number,
    },
    thresholdAmount: {
      type: Number,
    },
    currency: {
      type: String,
      default: 'EUR',
      uppercase: true,
    },
    // Email verification fields
    otpCode: {
      type: String,
      trim: true,
    },
    // Account activation fields
    activationData: {
      type: Schema.Types.Mixed,
    },
    // KPI alert fields
    alertData: {
      type: Schema.Types.Mixed,
    },
    // Payment notification fields
    paymentData: {
      type: Schema.Types.Mixed,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
      index: true,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    emailSubject: {
      type: String,
      required: [true, 'Email subject is required'],
      trim: true,
    },
    emailBody: {
      type: String,
      required: [true, 'Email body is required'],
    },
    fromEmail: {
      type: String,
      trim: true,
    },
    sentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'notification_logs',
  }
);

// Low Balance Settings schema
const lowBalanceSettingsSchema = new Schema<ILowBalanceSettingsDocument, ILowBalanceSettingsModel>(
  {
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
      default: -1.0000,
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
  },
  {
    timestamps: true,
    collection: 'low_balance_settings',
  }
);

// Add indexes for better query performance
notificationLogSchema.index({ userId: 1, notificationType: 1, createdAt: -1 });
notificationLogSchema.index({ status: 1, createdAt: -1 });
notificationLogSchema.index({ createdAt: -1 });

// Create and export the models
const NotificationLog = (mongoose.models.NotificationLog as INotificationLogModel) || 
  mongoose.model<INotificationLogDocument, INotificationLogModel>('NotificationLog', notificationLogSchema);

const LowBalanceSettings = (mongoose.models.LowBalanceSettings as ILowBalanceSettingsModel) || 
  mongoose.model<ILowBalanceSettingsDocument, ILowBalanceSettingsModel>('LowBalanceSettings', lowBalanceSettingsSchema);

export { NotificationLog, LowBalanceSettings };

// Legacy interfaces for compatibility
export interface NotificationLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  sippyAccountId?: number; // Optional for auth templates
  notificationType: 'low_balance' | 'zero_balance' | 'negative_balance' | 'email_verification' | 'account_activation' | 'high_cost_alert' | 'low_asr_alert' | 'extreme_usage_alert' | 'payment_success_gateway' | 'payment_success_admin' | 'payment_debit_admin' | 'password_reset' | 'ticket_created' | 'ticket_updated' | 'ticket_resolved' | 'ticket_assigned' | 'ticket_replied' | 'backorder_approved' | 'backorder_rejected' | 'cancellation_approved' | 'cancellation_rejected' | 'number_purchase_single' | 'number_purchase_bulk' | 'number_assignment' | 'number_unassignment' | 'admin_user_purchase_single' | 'admin_user_purchase_bulk' | 'admin_backorder_request' | 'admin_cancellation_request' | 'admin_user_registration';
  
  // Balance notification fields (optional for other types)
  balanceAmount?: number;
  thresholdAmount?: number;
  currency?: string;
  
  // Email verification fields
  otpCode?: string;
  
  // Account activation fields
  activationData?: any;
  
  // KPI alert fields  
  alertData?: any;
  
  // Payment notification fields
  paymentData?: {
    amount: number;
    currency: string;
    paymentMethod?: string;
    transactionId?: string;
    fees?: {
      processingFee?: number;
      fixedFee?: number;
    };
    gateway?: string;
    notes?: string;
    processedBy?: string; // For admin credits
  };
  
  status: 'pending' | 'sent' | 'failed';
  errorMessage?: string;
  emailSubject: string;
  emailBody: string;
  fromEmail?: string; // SMTP account used to send the email
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LowBalanceSettings {
  id: string;
  lowBalanceThreshold: number;
  zeroBalanceThreshold: number;
  negativeBalanceThreshold: number;
  enableLowBalanceNotifications: boolean;
  enableZeroBalanceNotifications: boolean;
  enableNegativeBalanceNotifications: boolean;
  notificationFrequencyHours: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationStats {
  totalSent: number;
  totalFailed: number;
  totalPending: number;
  last24Hours: {
    sent: number;
    failed: number;
  };
  last7Days: {
    sent: number;
    failed: number;
  };
} 