// Internal Notification System Types

export type NotificationType = 
  | 'ticket_created'
  | 'ticket_updated' 
  | 'ticket_assigned'
  | 'ticket_reply'
  | 'ticket_resolved'
  | 'payment_success'
  | 'payment_failed'
  | 'low_balance'
  | 'zero_balance'
  | 'phone_number_approved'
  | 'phone_number_rejected'
  | 'phone_number_purchased'
  | 'phone_number_assigned'
  | 'system_maintenance'
  | 'user_verification'
  | 'admin_alert'
  | 'rate_deck_updated'
  | 'call_quality_alert'
  | 'security_alert';

// Customer Notification Types
export type CustomerNotificationType = 
  | 'service_update'
  | 'maintenance_scheduled'
  | 'feature_announcement'
  | 'billing_reminder'
  | 'account_expiry'
  | 'promotional_offer'
  | 'system_alert'
  | 'security_notice'
  | 'welcome_message'
  | 'onboarding_tip'
  | 'payment_reminder'
  | 'service_disruption'
  | 'new_feature'
  | 'policy_update'
  | 'survey_request';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationStatus = 'unread' | 'read' | 'archived';

export type NotificationSoundType = 
  | 'default'
  | 'subtle'
  | 'success'
  | 'warning'
  | 'error'
  | 'urgent'
  | 'ticket'
  | 'payment'
  | 'chime'
  | 'bell'
  | 'piano'
  | 'none';

// Scheduling types for customer notifications
export type ScheduleStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'failed';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export type DeliveryChannel = 'email' | 'push' | 'sms' | 'in_app' | 'all';

// Interfaces for notification data types
export interface NotificationErrorDetails {
  code?: string;
  stack?: string;
  context?: Record<string, string | number | boolean>;
}

export interface NotificationMetadata {
  source?: string;
  version?: string;
  correlation_id?: string;
  user_agent?: string;
  ip_address?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface NotificationData {
  ticketId?: string;
  amount?: string | number;
  currency?: string;
  balance?: string | number;
  phoneNumber?: string;
  message?: string;
  rateDeckName?: string;
  issue?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface TemplateVariables {
  name?: string;
  balance?: string | number;
  currency?: string;
  ticketId?: string;
  phoneNumber?: string;
  amount?: string | number;
  [key: string]: string | number | boolean | undefined;
}

export interface ScheduleConfig {
  type: 'immediate' | 'scheduled' | 'recurring';
  scheduledAt?: Date;
  recurrence?: {
    type: RecurrenceType;
    interval: number; // e.g., every 2 weeks = interval: 2, type: 'weekly'
    endDate?: Date;
    maxOccurrences?: number;
  };
  timezone: string;
}

export interface CustomerNotificationTemplate {
  id: string;
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
  variables: string[]; // Available template variables like {{name}}, {{balance}}, etc.
  channels: DeliveryChannel[];
  priority: NotificationPriority;
  category: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduledCustomerNotification {
  id: string;
  templateId: string;
  template?: CustomerNotificationTemplate;
  
  // Scheduling
  schedule: ScheduleConfig;
  status: ScheduleStatus;
  
  // Targeting
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
  
  // Content overrides (if different from template)
  contentOverrides?: {
    subject?: string;
    html?: string;
    text?: string;
    pushTitle?: string;
    pushBody?: string;
    smsContent?: string;
  };
  
  // Variables for template substitution
  templateVariables?: TemplateVariables;
  
  // Delivery options
  channels: DeliveryChannel[];
  
  // Tracking
  estimatedRecipients?: number;
  actualRecipients?: number;
  deliveryStats?: {
    email?: { sent: number; delivered: number; opened: number; clicked: number; failed: number };
    push?: { sent: number; delivered: number; clicked: number; failed: number };
    sms?: { sent: number; delivered: number; failed: number };
    inApp?: { sent: number; read: number };
  };
  
  // Metadata
  name: string;
  description?: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  sentAt?: Date;
  lastExecutedAt?: Date;
  nextExecutionAt?: Date;
  executionCount: number;
  
  // Error handling
  errors?: Array<{
    timestamp: Date;
    message: string;
    details?: NotificationErrorDetails;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerNotificationDelivery {
  id: string;
  notificationId: string;
  userId: string;
  userEmail: string;
  channel: DeliveryChannel;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed';
  subject?: string;
  content?: string;
  
  // Delivery details
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  
  // Error details
  error?: string;
  retryCount: number;
  maxRetries: number;
  
  // Tracking
  trackingId?: string;
  metadata?: NotificationMetadata;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface InternalNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  data?: NotificationData; // Additional context data
  actionUrl?: string; // URL to navigate when clicked
  icon?: string; // Icon name or emoji
  sound?: NotificationSoundType;
  showToast?: boolean;
  showPush?: boolean;
  persistent?: boolean; // Don't auto-dismiss
  createdAt: Date;
  readAt?: Date;
  archivedAt?: Date;
  expiresAt?: Date;
}

export interface NotificationPreferences {
  userId: string;
  // Toast notifications
  showToasts: boolean;
  toastDuration: number; // in seconds
  toastPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  
  // Sound preferences
  enableSounds: boolean;
  soundVolume: number; // 0-1
  soundTheme: NotificationSoundType;
  
  // Push notifications
  enablePushNotifications: boolean;
  pushOnlyWhenAway: boolean; // Only send push when tab is not active
  
  // Notification types preferences
  typePreferences: {
    [K in NotificationType]: {
      enabled: boolean;
      showToast: boolean;
      playSound: boolean;
      enablePush: boolean;
      priority: NotificationPriority;
    };
  };
  
  // Do not disturb
  doNotDisturbEnabled: boolean;
  doNotDisturbStart?: string; // HH:MM format
  doNotDisturbEnd?: string; // HH:MM format
  
  // Email fallback
  emailFallbackEnabled: boolean;
  emailFallbackDelay: number; // minutes to wait before sending email
  
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
  todayCount: number;
  weekCount: number;
}

export interface NotificationFilter {
  types?: NotificationType[];
  priorities?: NotificationPriority[];
  status?: NotificationStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface NotificationContextType {
  // State
  notifications: InternalNotification[];
  preferences: NotificationPreferences | null;
  stats: NotificationStats;
  isLoading: boolean;
  error: string | null;
  
  // Notification Center
  isNotificationCenterOpen: boolean;
  setNotificationCenterOpen: (open: boolean) => void;
  
  // Actions
  addNotification: (notification: Omit<InternalNotification, 'id' | 'createdAt'>) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  archiveNotification: (notificationId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  
  // Preferences
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
  
  // Filtering
  filter: NotificationFilter;
  setFilter: (filter: NotificationFilter) => void;
  filteredNotifications: InternalNotification[];
  
  // Utility
  refreshNotifications: () => Promise<void>;
  requestPushPermission: () => Promise<boolean>;
  testNotification: (type: NotificationType) => Promise<void>;
}

// Template for creating default preferences
export const createDefaultPreferences = (userId: string): NotificationPreferences => ({
  userId,
  showToasts: true,
  toastDuration: 5,
  toastPosition: 'top-right',
  enableSounds: true,
  soundVolume: 0.7,
  soundTheme: 'chime',
  enablePushNotifications: true,
  pushOnlyWhenAway: true,
  typePreferences: {
    ticket_created: { enabled: true, showToast: true, playSound: true, enablePush: true, priority: 'medium' },
    ticket_updated: { enabled: true, showToast: true, playSound: false, enablePush: false, priority: 'low' },
    ticket_assigned: { enabled: true, showToast: true, playSound: true, enablePush: true, priority: 'medium' },
    ticket_reply: { enabled: true, showToast: true, playSound: true, enablePush: true, priority: 'medium' },
    ticket_resolved: { enabled: true, showToast: true, playSound: true, enablePush: false, priority: 'low' },
    payment_success: { enabled: true, showToast: true, playSound: true, enablePush: true, priority: 'medium' },
    payment_failed: { enabled: true, showToast: true, playSound: true, enablePush: true, priority: 'high' },
    low_balance: { enabled: true, showToast: true, playSound: true, enablePush: true, priority: 'high' },
    zero_balance: { enabled: true, showToast: true, playSound: true, enablePush: true, priority: 'urgent' },
    phone_number_approved: { enabled: true, showToast: true, playSound: true, enablePush: true, priority: 'medium' },
    phone_number_rejected: { enabled: true, showToast: true, playSound: false, enablePush: false, priority: 'low' },
    phone_number_purchased: { enabled: true, showToast: true, playSound: true, enablePush: true, priority: 'medium' },
    phone_number_assigned: { enabled: true, showToast: true, playSound: false, enablePush: false, priority: 'low' },
    system_maintenance: { enabled: true, showToast: true, playSound: false, enablePush: true, priority: 'medium' },
    user_verification: { enabled: true, showToast: true, playSound: false, enablePush: false, priority: 'low' },
    admin_alert: { enabled: true, showToast: true, playSound: true, enablePush: true, priority: 'high' },
    rate_deck_updated: { enabled: true, showToast: false, playSound: false, enablePush: false, priority: 'low' },
    call_quality_alert: { enabled: true, showToast: true, playSound: true, enablePush: true, priority: 'high' },
    security_alert: { enabled: true, showToast: true, playSound: true, enablePush: true, priority: 'urgent' }
  },
  doNotDisturbEnabled: false,
  emailFallbackEnabled: true,
  emailFallbackDelay: 15,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Notification templates for different types
export const NotificationTemplates: Record<NotificationType, {
  icon: string;
  sound: NotificationSoundType;
  color: string;
  getTitle: (data?: NotificationData) => string;
  getMessage: (data?: NotificationData) => string;
}> = {
  ticket_created: {
    icon: '🎫',
    sound: 'chime',
    color: 'bg-blue-500',
    getTitle: () => 'New Support Ticket',
    getMessage: (data) => `Ticket #${data?.ticketId || 'Unknown'} has been created`
  },
  ticket_updated: {
    icon: '🔄',
    sound: 'subtle',
    color: 'bg-amber-500',
    getTitle: () => 'Ticket Updated',
    getMessage: (data) => `Ticket #${data?.ticketId || 'Unknown'} has been updated`
  },
  ticket_assigned: {
    icon: '👤',
    sound: 'bell',
    color: 'bg-green-500',
    getTitle: () => 'Ticket Assigned',
    getMessage: (data) => `Ticket #${data?.ticketId || 'Unknown'} has been assigned to you`
  },
  ticket_reply: {
    icon: '💬',
    sound: 'chime',
    color: 'bg-purple-500',
    getTitle: () => 'New Ticket Reply',
    getMessage: (data) => `New reply on ticket #${data?.ticketId || 'Unknown'}`
  },
  ticket_resolved: {
    icon: '✅',
    sound: 'success',
    color: 'bg-green-600',
    getTitle: () => 'Ticket Resolved',
    getMessage: (data) => `Ticket #${data?.ticketId || 'Unknown'} has been resolved`
  },
  payment_success: {
    icon: '💳',
    sound: 'piano',
    color: 'bg-green-500',
    getTitle: () => 'Payment Successful',
    getMessage: (data) => `Payment of ${data?.amount || 'N/A'} ${data?.currency || 'USD'} was successful`
  },
  payment_failed: {
    icon: '❌',
    sound: 'warning',
    color: 'bg-red-500',
    getTitle: () => 'Payment Failed',
    getMessage: (data) => `Payment of ${data?.amount || 'N/A'} ${data?.currency || 'USD'} failed`
  },
  low_balance: {
    icon: '⚠️',
    sound: 'warning',
    color: 'bg-orange-500',
    getTitle: () => 'Low Balance Alert',
    getMessage: (data) => `Your balance is low: ${data?.balance || 'Unknown'} ${data?.currency || ''}`
  },
  zero_balance: {
    icon: '🚨',
    sound: 'urgent',
    color: 'bg-red-600',
    getTitle: () => 'Zero Balance Alert',
    getMessage: () => `Your account balance has reached zero`
  },
  phone_number_approved: {
    icon: '📞',
    sound: 'success',
    color: 'bg-green-500',
    getTitle: () => 'Number Request Approved',
    getMessage: (data) => `Your phone number request for ${data?.phoneNumber || 'Unknown'} has been approved`
  },
  phone_number_rejected: {
    icon: '📞',
    sound: 'subtle',
    color: 'bg-red-500',
    getTitle: () => 'Number Request Rejected',
    getMessage: (data) => `Your phone number request for ${data?.phoneNumber || 'Unknown'} has been rejected`
  },
  phone_number_purchased: {
    icon: '📞',
    sound: 'success',
    color: 'bg-blue-500',
    getTitle: () => 'Number Purchased',
    getMessage: (data) => `Phone number ${data?.phoneNumber || 'Unknown'} has been purchased successfully`
  },
  phone_number_assigned: {
    icon: '📞',
    sound: 'default',
    color: 'bg-blue-400',
    getTitle: () => 'Number Assigned',
    getMessage: (data) => `Phone number ${data?.phoneNumber || 'Unknown'} has been assigned to your account`
  },
  system_maintenance: {
    icon: '🔧',
    sound: 'default',
    color: 'bg-gray-500',
    getTitle: () => 'System Maintenance',
    getMessage: (data) => data?.message || 'System maintenance is scheduled'
  },
  user_verification: {
    icon: '✅',
    sound: 'success',
    color: 'bg-green-500',
    getTitle: () => 'Account Verified',
    getMessage: () => 'Your account has been successfully verified'
  },
  admin_alert: {
    icon: '🚨',
    sound: 'urgent',
    color: 'bg-red-500',
    getTitle: () => 'Admin Alert',
    getMessage: (data) => data?.message || 'Admin attention required'
  },
  rate_deck_updated: {
    icon: '💰',
    sound: 'subtle',
    color: 'bg-blue-500',
    getTitle: () => 'Rate Deck Updated',
    getMessage: (data) => `Rate deck ${data?.rateDeckName || 'Unknown'} has been updated`
  },
  call_quality_alert: {
    icon: '📊',
    sound: 'warning',
    color: 'bg-orange-500',
    getTitle: () => 'Call Quality Alert',
    getMessage: (data) => `Call quality issue detected: ${data?.issue || 'Unknown'}`
  },
  security_alert: {
    icon: '🔒',
    sound: 'urgent',
    color: 'bg-red-600',
    getTitle: () => 'Security Alert',
    getMessage: (data) => data?.message || 'Security issue detected'
  }
}; 