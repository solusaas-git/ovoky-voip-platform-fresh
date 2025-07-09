import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { 
  CustomerNotificationType, 
  ScheduleStatus, 
  RecurrenceType, 
  DeliveryChannel,
  NotificationPriority,
  CustomerNotificationTemplate,
  ScheduledCustomerNotification,
  CustomerNotificationDelivery,
  ScheduleConfig
} from '@/types/notifications';

// Template Model
export interface ICustomerNotificationTemplate extends Document {
  name: string;
  type: CustomerNotificationType;
  subject: string;
  content: {
    html: string;
    text: string;
    pushTitle?: string;
    pushBody?: string;
    smsContent?: string;
  };
  variables: string[];
  channels: DeliveryChannel[];
  priority: NotificationPriority;
  category: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerNotificationTemplateSchema = new Schema<ICustomerNotificationTemplate>({
  name: {
    type: String,
    required: true,
    maxlength: 200,
    index: true
  },
  type: {
    type: String,
    enum: [
      'service_update', 'maintenance_scheduled', 'feature_announcement', 'billing_reminder',
      'account_expiry', 'promotional_offer', 'system_alert', 'security_notice',
      'welcome_message', 'onboarding_tip', 'payment_reminder', 'service_disruption',
      'new_feature', 'policy_update', 'survey_request'
    ] as CustomerNotificationType[],
    required: true,
    index: true
  },
  subject: {
    type: String,
    required: true,
    maxlength: 300
  },
  content: {
    html: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true
    },
    pushTitle: {
      type: String,
      maxlength: 100
    },
    pushBody: {
      type: String,
      maxlength: 300
    },
    smsContent: {
      type: String,
      maxlength: 160
    }
  },
  variables: [{
    type: String,
    maxlength: 50
  }],
  channels: [{
    type: String,
    enum: ['email', 'push', 'sms', 'in_app', 'all'] as DeliveryChannel[]
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'] as NotificationPriority[],
    required: true,
    default: 'medium'
  },
  category: {
    type: String,
    required: true,
    maxlength: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
CustomerNotificationTemplateSchema.index({ isActive: 1, type: 1 });
CustomerNotificationTemplateSchema.index({ category: 1, isActive: 1 });

// Scheduled Notification Model
export interface IScheduledCustomerNotification extends Document {
  _id: Types.ObjectId;
  templateId: string;
  template?: ICustomerNotificationTemplate;
  schedule: ScheduleConfig;
  status: ScheduleStatus;
  targetUsers: {
    type: 'all' | 'role' | 'specific' | 'filter';
    userIds?: string[];
    roles?: string[];
    filters?: {
      accountStatus?: string[];
      balanceRange?: { min?: number; max?: number };
      registrationDateRange?: { from?: Date; to?: Date };
      lastLoginRange?: { from?: Date; to?: Date };
      country?: string[];
      plan?: string[];
    };
  };
  contentOverrides?: {
    subject?: string;
    html?: string;
    text?: string;
    pushTitle?: string;
    pushBody?: string;
    smsContent?: string;
  };
  templateVariables?: Record<string, any>;
  channels: DeliveryChannel[];
  estimatedRecipients?: number;
  actualRecipients?: number;
  deliveryStats?: {
    email?: { sent: number; delivered: number; opened: number; clicked: number; failed: number };
    push?: { sent: number; delivered: number; clicked: number; failed: number };
    sms?: { sent: number; delivered: number; failed: number };
    inApp?: { sent: number; read: number };
  };
  name: string;
  description?: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  sentAt?: Date;
  lastExecutedAt?: Date;
  nextExecutionAt?: Date;
  executionCount: number;
  executionErrors?: Array<{
    timestamp: Date;
    message: string;
    details?: any;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledCustomerNotificationSchema = new Schema<IScheduledCustomerNotification>({
  templateId: {
    type: String,
    required: true,
    index: true
  },
  schedule: {
    type: {
      type: String,
      enum: ['immediate', 'scheduled', 'recurring'],
      required: true
    },
    scheduledAt: Date,
    recurrence: {
      type: {
        type: String,
        enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'] as RecurrenceType[]
      },
      interval: Number,
      endDate: Date,
      maxOccurrences: Number
    },
    timezone: {
      type: String,
      required: true,
      default: 'UTC'
    }
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed'] as ScheduleStatus[],
    required: true,
    default: 'draft',
  },
  targetUsers: {
    type: {
      type: String,
      enum: ['all', 'role', 'specific', 'filter'],
      required: true
    },
    userIds: [String],
    roles: [String],
    filters: {
      accountStatus: [String],
      balanceRange: {
        min: Number,
        max: Number
      },
      registrationDateRange: {
        from: Date,
        to: Date
      },
      lastLoginRange: {
        from: Date,
        to: Date
      },
      country: [String],
      plan: [String]
    }
  },
  contentOverrides: {
    subject: String,
    html: String,
    text: String,
    pushTitle: String,
    pushBody: String,
    smsContent: String
  },
  templateVariables: {
    type: Schema.Types.Mixed,
    default: {}
  },
  channels: [{
    type: String,
    enum: ['email', 'push', 'sms', 'in_app', 'all'] as DeliveryChannel[],
    required: true
  }],
  estimatedRecipients: {
    type: Number,
    default: 0
  },
  actualRecipients: {
    type: Number,
    default: 0
  },
  deliveryStats: {
    email: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
      failed: { type: Number, default: 0 }
    },
    push: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
      failed: { type: Number, default: 0 }
    },
    sms: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      failed: { type: Number, default: 0 }
    },
    inApp: {
      sent: { type: Number, default: 0 },
      read: { type: Number, default: 0 }
    }
  },
  name: {
    type: String,
    required: true,
    maxlength: 200,
    index: true
  },
  description: {
    type: String,
    maxlength: 1000
  },
  createdBy: {
    type: String,
    required: true,
    index: true
  },
  approvedBy: {
    type: String,
    index: true
  },
  approvedAt: Date,
  sentAt: Date,
  lastExecutedAt: Date,
  nextExecutionAt: {
    type: Date,
    index: true
  },
  executionCount: {
    type: Number,
    default: 0
  },
  executionErrors: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    message: {
      type: String,
      required: true
    },
    details: Schema.Types.Mixed
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
ScheduledCustomerNotificationSchema.index({ createdBy: 1, status: 1 });
ScheduledCustomerNotificationSchema.index({ status: 1, nextExecutionAt: 1 });
ScheduledCustomerNotificationSchema.index({ 'schedule.type': 1, status: 1 });

// Virtual for populated template
ScheduledCustomerNotificationSchema.virtual('template', {
  ref: 'CustomerNotificationTemplate',
  localField: 'templateId',
  foreignField: '_id',
  justOne: true
});

// Delivery Tracking Model
export interface ICustomerNotificationDelivery extends Document {
  notificationId: string;
  userId: string;
  userEmail: string;
  channel: DeliveryChannel;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed';
  subject?: string;
  content?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
  trackingId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerNotificationDeliverySchema = new Schema<ICustomerNotificationDelivery>({
  notificationId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  channel: {
    type: String,
    enum: ['email', 'push', 'sms', 'in_app'] as DeliveryChannel[],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'opened', 'clicked', 'failed'],
    required: true,
    default: 'pending',
    index: true
  },
  subject: {
    type: String,
    maxlength: 300
  },
  content: String,
  sentAt: Date,
  deliveredAt: Date,
  openedAt: Date,
  clickedAt: Date,
  error: String,
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  trackingId: {
    type: String,
    index: { sparse: true }
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
CustomerNotificationDeliverySchema.index({ notificationId: 1, status: 1 });
CustomerNotificationDeliverySchema.index({ userId: 1, channel: 1 });
CustomerNotificationDeliverySchema.index({ status: 1, createdAt: -1 });

// Helper methods
ScheduledCustomerNotificationSchema.methods.calculateNextExecution = function(): Date | null {
  if (this.schedule.type !== 'recurring' || !this.schedule.recurrence) {
    return null;
  }

  const { type, interval, endDate, maxOccurrences } = this.schedule.recurrence;
  
  if (maxOccurrences && this.executionCount >= maxOccurrences) {
    return null;
  }

  const now = new Date();
  const baseDate = this.lastExecutedAt || this.createdAt;
  let nextDate = new Date(baseDate);

  switch (type) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + interval);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + (interval * 7));
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + interval);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      break;
    default:
      return null;
  }

  if (endDate && nextDate > endDate) {
    return null;
  }

  return nextDate;
};

CustomerNotificationDeliverySchema.methods.canRetry = function(): boolean {
  return this.retryCount < this.maxRetries && this.status === 'failed';
};

// Export models
export const CustomerNotificationTemplateModel = mongoose.models.CustomerNotificationTemplate || 
  mongoose.model<ICustomerNotificationTemplate>('CustomerNotificationTemplate', CustomerNotificationTemplateSchema);

export const ScheduledCustomerNotificationModel = mongoose.models.ScheduledCustomerNotification || 
  mongoose.model<IScheduledCustomerNotification>('ScheduledCustomerNotification', ScheduledCustomerNotificationSchema);

export const CustomerNotificationDeliveryModel = mongoose.models.CustomerNotificationDelivery || 
  mongoose.model<ICustomerNotificationDelivery>('CustomerNotificationDelivery', CustomerNotificationDeliverySchema); 