import mongoose, { Schema, Document } from 'mongoose';
import { 
  NotificationType, 
  NotificationPriority, 
  NotificationStatus,
  NotificationSoundType 
} from '@/types/notifications';

// Internal Notification Schema - omit 'id' from our interface since Mongoose provides it
export interface IInternalNotification extends Document {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  data?: Record<string, any>;
  actionUrl?: string;
  icon?: string;
  sound?: NotificationSoundType;
  showToast?: boolean;
  showPush?: boolean;
  persistent?: boolean;
  readAt?: Date;
  archivedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InternalNotificationSchema = new Schema<IInternalNotification>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'ticket_created', 'ticket_updated', 'ticket_assigned', 'ticket_reply', 'ticket_resolved',
      'payment_success', 'payment_failed', 'low_balance', 'zero_balance',
      'phone_number_approved', 'phone_number_rejected', 'phone_number_purchased', 'phone_number_assigned',
      'system_maintenance', 'user_verification', 'admin_alert', 'rate_deck_updated',
      'call_quality_alert', 'security_alert'
    ] as NotificationType[],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'] as NotificationPriority[],
    required: true,
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'archived'] as NotificationStatus[],
    required: true,
    default: 'unread'
  },
  data: {
    type: Schema.Types.Mixed,
    default: {}
  },
  actionUrl: {
    type: String,
    maxlength: 500
  },
  icon: {
    type: String,
    maxlength: 50
  },
  sound: {
    type: String,
    enum: ['default', 'subtle', 'success', 'warning', 'error', 'urgent', 'ticket', 'payment', 'chime', 'bell', 'piano', 'none'] as NotificationSoundType[],
    default: 'default'
  },
  showToast: {
    type: Boolean,
    default: true
  },
  showPush: {
    type: Boolean,
    default: false
  },
  persistent: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  archivedAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
InternalNotificationSchema.index({ userId: 1, createdAt: -1 });
InternalNotificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
InternalNotificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
InternalNotificationSchema.index({ userId: 1, priority: 1, createdAt: -1 });
InternalNotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // Auto-delete after 30 days

// Virtual for formatted creation time
InternalNotificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now.getTime() - this.createdAt.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return this.createdAt.toLocaleDateString();
});

// Static methods
InternalNotificationSchema.statics.getUnreadCount = function(userId: string) {
  return this.countDocuments({ userId, status: 'unread' });
};

InternalNotificationSchema.statics.getUserStats = async function(userId: string) {
  const pipeline = [
    { $match: { userId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: {
          $sum: {
            $cond: [{ $eq: ['$status', 'unread'] }, 1, 0]
          }
        },
        todayCount: {
          $sum: {
            $cond: [
              { $gte: ['$createdAt', new Date(new Date().setHours(0, 0, 0, 0))] },
              1,
              0
            ]
          }
        },
        weekCount: {
          $sum: {
            $cond: [
              { $gte: ['$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
              1,
              0
            ]
          }
        }
      }
    }
  ];
  
  const typeStats = await this.aggregate([
    { $match: { userId } },
    { $group: { _id: '$type', count: { $sum: 1 } } }
  ]);
  
  const priorityStats = await this.aggregate([
    { $match: { userId } },
    { $group: { _id: '$priority', count: { $sum: 1 } } }
  ]);
  
  const result = await this.aggregate(pipeline);
  const stats = result[0] || { total: 0, unread: 0, todayCount: 0, weekCount: 0 };
  
  const byType: Record<string, number> = {};
  typeStats.forEach(stat => byType[stat._id] = stat.count);
  
  const byPriority: Record<string, number> = {};
  priorityStats.forEach(stat => byPriority[stat._id] = stat.count);
  
  return {
    ...stats,
    byType,
    byPriority
  };
};

// Notification Preferences Schema - omit 'id' from our interface since Mongoose provides it
export interface INotificationPreferences extends Document {
  userId: string;
  showToasts: boolean;
  toastDuration: number;
  toastPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  enableSounds: boolean;
  soundVolume: number;
  soundTheme: NotificationSoundType;
  enablePushNotifications: boolean;
  pushOnlyWhenAway: boolean;
  typePreferences: {
    [K in NotificationType]: {
      enabled: boolean;
      showToast: boolean;
      playSound: boolean;
      enablePush: boolean;
      priority: NotificationPriority;
    };
  };
  doNotDisturbEnabled: boolean;
  doNotDisturbStart?: string;
  doNotDisturbEnd?: string;
  emailFallbackEnabled: boolean;
  emailFallbackDelay: number;
  createdAt: Date;
  updatedAt: Date;
}

const TypePreferenceSchema = new Schema({
  enabled: { type: Boolean, default: true },
  showToast: { type: Boolean, default: true },
  playSound: { type: Boolean, default: true },
  enablePush: { type: Boolean, default: false },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'] as NotificationPriority[],
    default: 'medium'
  }
}, { _id: false });

const NotificationPreferencesSchema = new Schema<INotificationPreferences>({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Toast notifications
  showToasts: {
    type: Boolean,
    default: true
  },
  toastDuration: {
    type: Number,
    default: 5,
    min: 1,
    max: 30
  },
  toastPosition: {
    type: String,
    enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center'],
    default: 'top-right'
  },
  
  // Sound preferences
  enableSounds: {
    type: Boolean,
    default: true
  },
  soundVolume: {
    type: Number,
    default: 0.7,
    min: 0,
    max: 1
  },
  soundTheme: {
    type: String,
    enum: ['default', 'subtle', 'success', 'warning', 'error', 'urgent', 'ticket', 'payment', 'chime', 'bell', 'piano', 'none'] as NotificationSoundType[],
    default: 'default'
  },
  
  // Push notifications
  enablePushNotifications: {
    type: Boolean,
    default: false
  },
  pushOnlyWhenAway: {
    type: Boolean,
    default: true
  },
  
  // Notification types preferences
  typePreferences: {
    ticket_created: { type: TypePreferenceSchema, default: () => ({}) },
    ticket_updated: { type: TypePreferenceSchema, default: () => ({}) },
    ticket_assigned: { type: TypePreferenceSchema, default: () => ({}) },
    ticket_reply: { type: TypePreferenceSchema, default: () => ({}) },
    ticket_resolved: { type: TypePreferenceSchema, default: () => ({}) },
    payment_success: { type: TypePreferenceSchema, default: () => ({}) },
    payment_failed: { type: TypePreferenceSchema, default: () => ({}) },
    low_balance: { type: TypePreferenceSchema, default: () => ({}) },
    zero_balance: { type: TypePreferenceSchema, default: () => ({}) },
    phone_number_approved: { type: TypePreferenceSchema, default: () => ({}) },
    phone_number_rejected: { type: TypePreferenceSchema, default: () => ({}) },
    phone_number_purchased: { type: TypePreferenceSchema, default: () => ({}) },
    phone_number_assigned: { type: TypePreferenceSchema, default: () => ({}) },
    system_maintenance: { type: TypePreferenceSchema, default: () => ({}) },
    user_verification: { type: TypePreferenceSchema, default: () => ({}) },
    admin_alert: { type: TypePreferenceSchema, default: () => ({}) },
    rate_deck_updated: { type: TypePreferenceSchema, default: () => ({}) },
    call_quality_alert: { type: TypePreferenceSchema, default: () => ({}) },
    security_alert: { type: TypePreferenceSchema, default: () => ({}) }
  },
  
  // Do not disturb
  doNotDisturbEnabled: {
    type: Boolean,
    default: false
  },
  doNotDisturbStart: {
    type: String,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
  },
  doNotDisturbEnd: {
    type: String,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
  },
  
  // Email fallback
  emailFallbackEnabled: {
    type: Boolean,
    default: true
  },
  emailFallbackDelay: {
    type: Number,
    default: 15,
    min: 1,
    max: 1440 // 24 hours in minutes
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Methods
NotificationPreferencesSchema.methods.isInDoNotDisturbPeriod = function(): boolean {
  if (!this.doNotDisturbEnabled || !this.doNotDisturbStart || !this.doNotDisturbEnd) {
    return false;
  }
  
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  // Handle cases where DND period spans midnight
  if (this.doNotDisturbStart <= this.doNotDisturbEnd) {
    return currentTime >= this.doNotDisturbStart && currentTime <= this.doNotDisturbEnd;
  } else {
    return currentTime >= this.doNotDisturbStart || currentTime <= this.doNotDisturbEnd;
  }
};

NotificationPreferencesSchema.methods.shouldShowNotification = function(type: NotificationType): boolean {
  const typePrefs = this.typePreferences[type];
  if (!typePrefs || !typePrefs.enabled) return false;
  if (this.isInDoNotDisturbPeriod()) return false;
  return true;
};

// Export models
export const InternalNotificationModel = mongoose.models.InternalNotification || 
  mongoose.model<IInternalNotification>('InternalNotification', InternalNotificationSchema);

export const NotificationPreferencesModel = mongoose.models.NotificationPreferences || 
  mongoose.model<INotificationPreferences>('NotificationPreferences', NotificationPreferencesSchema);

export default InternalNotificationModel; 