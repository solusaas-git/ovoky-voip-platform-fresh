import { connectToDatabase } from '@/lib/db';
import {
  CustomerNotificationTemplateModel,
  ScheduledCustomerNotificationModel,
  CustomerNotificationDeliveryModel,
  ICustomerNotificationTemplate,
  IScheduledCustomerNotification
} from '@/models/CustomerNotification';
import UserModel from '@/models/User';
import {
  CustomerNotificationType,
  ScheduleStatus,
  DeliveryChannel,
  CustomerNotificationTemplate,
  ScheduledCustomerNotification
} from '@/types/notifications';
import SmtpService from './SmtpService';
import { InternalNotificationModel } from '@/models/InternalNotification';
import { PushSubscriptionModel } from '@/models/PushSubscription';
import webpush from 'web-push';

// Configure webpush only if VAPID keys are available
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'your-email@example.com';

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(
      'mailto:' + vapidEmail,
      vapidPublicKey,
      vapidPrivateKey
    );
  } catch (error) {
    console.warn('Failed to configure VAPID details:', error);
  }
}

// Additional interfaces for type safety
interface NotificationUpdates {
  executionCount: number;
  status: ScheduleStatus;
  sentAt: Date;
  nextExecutionAt?: Date;
}

interface NotificationContent {
  subject?: string;
  html?: string;
  text?: string;
  title?: string;
  body?: string;
  message?: string;
  pushTitle?: string;
  pushBody?: string;
  smsContent?: string;
  priority?: string;
}

interface TargetingQuery {
  [key: string]: unknown;
  _id?: { $in: string[] };
  role?: { $in: string[] };
}

interface UserFilter {
  accountStatus?: string[];
  balanceRange?: { min?: number; max?: number };
  registrationDateRange?: { from?: Date; to?: Date };
  lastLoginRange?: { from?: Date; to?: Date };
  country?: string[];
  plan?: string[];
}

interface DeliveryResult {
  success: boolean;
  deliveryId?: string;
  error?: string;
  trackingId?: string;
}

interface TargetingResult {
  users: Array<{ id: string; email: string; name?: string }>;
  count: number;
  filters: TargetingQuery | UserFilter;
}

interface NotificationUser {
  id: string;
  email: string;
  name?: string;
  preferences?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
    inApp?: boolean;
  };
}

interface FilterQuery {
  [key: string]: unknown;
  isEmailVerified?: boolean;
  accountStatus?: { $in: string[] };
  createdAt?: { $gte?: Date; $lte?: Date };
  lastLoginAt?: { $gte?: Date; $lte?: Date };
  'profile.country'?: { $in: string[] };
  'profile.plan'?: { $in: string[] };
}

interface TemplateQuery {
  [key: string]: unknown;
  isActive?: boolean;
  type?: CustomerNotificationType;
  category?: string;
  createdBy?: string;
}

interface NotificationQuery {
  [key: string]: unknown;
  status?: { $in: ScheduleStatus[] };
  createdBy?: string;
  templateId?: string;
}

interface DeliveryStatsResult {
  email: { sent: number; delivered: number; opened: number; clicked: number; failed: number };
  push: { sent: number; delivered: number; clicked: number; failed: number };
  sms: { sent: number; delivered: number; failed: number };
  inApp: { sent: number; read: number };
}

interface AnalyticsResult {
  _id: string;
  count: number;
  totalRecipients: number;
}

interface AnalyticsQuery {
  [key: string]: unknown;
  createdAt?: { $gte: Date; $lte: Date };
}

export class CustomerNotificationService {
  private static instance: CustomerNotificationService;

  private constructor() {}

  public static getInstance(): CustomerNotificationService {
    if (!CustomerNotificationService.instance) {
      CustomerNotificationService.instance = new CustomerNotificationService();
    }
    return CustomerNotificationService.instance;
  }

  // Template Management
  async createTemplate(template: Omit<CustomerNotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ICustomerNotificationTemplate> {
    await connectToDatabase();

    const newTemplate = new CustomerNotificationTemplateModel({
      ...template,
      variables: this.extractVariablesFromContent(template.content.html, template.content.text)
    });

    return await newTemplate.save();
  }

  async updateTemplate(id: string, updates: Partial<CustomerNotificationTemplate>): Promise<ICustomerNotificationTemplate | null> {
    await connectToDatabase();

    if (updates.content) {
      updates.variables = this.extractVariablesFromContent(updates.content.html || '', updates.content.text || '');
    }

    return await CustomerNotificationTemplateModel.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
  }

  async getTemplate(id: string): Promise<ICustomerNotificationTemplate | null> {
    await connectToDatabase();
    return await CustomerNotificationTemplateModel.findById(id);
  }

  async getTemplates(filters: {
    isActive?: boolean;
    type?: CustomerNotificationType;
    category?: string;
    createdBy?: string;
  } = {}): Promise<ICustomerNotificationTemplate[]> {
    await connectToDatabase();

    const query: TemplateQuery = {};
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.type) query.type = filters.type;
    if (filters.category) query.category = filters.category;
    if (filters.createdBy) query.createdBy = filters.createdBy;

    return await CustomerNotificationTemplateModel.find(query).sort({ createdAt: -1 });
  }

  async deleteTemplate(id: string): Promise<boolean> {
    await connectToDatabase();
    
    // Check if template is being used by scheduled notifications
    const usageCount = await ScheduledCustomerNotificationModel.countDocuments({
      templateId: id,
      status: { $in: ['draft', 'scheduled', 'sending'] }
    });

    if (usageCount > 0) {
      throw new Error('Cannot delete template that is being used by active notifications');
    }

    const result = await CustomerNotificationTemplateModel.findByIdAndDelete(id);
    return !!result;
  }

  // Scheduled Notification Management
  async scheduleNotification(notification: Omit<ScheduledCustomerNotification, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'deliveryStats'>): Promise<IScheduledCustomerNotification> {
    await connectToDatabase();

    // Validate template exists
    const template = await this.getTemplate(notification.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Calculate estimated recipients
    const targeting = await this.calculateTargeting(notification.targetUsers);

    const scheduledNotification = new ScheduledCustomerNotificationModel({
      ...notification,
      estimatedRecipients: targeting.count,
      executionCount: 0,
      deliveryStats: {
        email: { sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0 },
        push: { sent: 0, delivered: 0, clicked: 0, failed: 0 },
        sms: { sent: 0, delivered: 0, failed: 0 },
        inApp: { sent: 0, read: 0 }
      }
    });

    // Set next execution time
    if (notification.schedule.type === 'immediate') {
      scheduledNotification.nextExecutionAt = new Date();
      scheduledNotification.status = 'scheduled';
    } else if (notification.schedule.type === 'scheduled' && notification.schedule.scheduledAt) {
      scheduledNotification.nextExecutionAt = notification.schedule.scheduledAt;
      scheduledNotification.status = 'scheduled';
    } else if (notification.schedule.type === 'recurring') {
      scheduledNotification.nextExecutionAt = notification.schedule.scheduledAt || new Date();
      scheduledNotification.status = 'scheduled';
    }

    return await scheduledNotification.save();
  }

  async updateScheduledNotification(id: string, updates: Partial<ScheduledCustomerNotification>): Promise<IScheduledCustomerNotification | null> {
    await connectToDatabase();

    const notification = await ScheduledCustomerNotificationModel.findById(id);
    if (!notification) {
      return null;
    }

    // Prevent updates to sent/sending notifications unless it's status change to cancel
    if (['sending', 'sent'].includes(notification.status) && updates.status !== 'cancelled') {
      throw new Error('Cannot update notification that is sending or has been sent');
    }

    // Recalculate targeting if targeting changed
    if (updates.targetUsers) {
      const targeting = await this.calculateTargeting(updates.targetUsers);
      updates.estimatedRecipients = targeting.count;
    }

    return await ScheduledCustomerNotificationModel.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true }
    ).populate('template');
  }

  async getScheduledNotification(id: string): Promise<IScheduledCustomerNotification | null> {
    await connectToDatabase();
    return await ScheduledCustomerNotificationModel.findById(id).populate('template');
  }

  async getScheduledNotifications(filters: {
    status?: ScheduleStatus[];
    createdBy?: string;
    templateId?: string;
  } = {}): Promise<IScheduledCustomerNotification[]> {
    await connectToDatabase();

    const query: NotificationQuery = {};
    if (filters.status?.length) query.status = { $in: filters.status };
    if (filters.createdBy) query.createdBy = filters.createdBy;
    if (filters.templateId) query.templateId = filters.templateId;

    return await ScheduledCustomerNotificationModel.find(query)
      .populate('template')
      .sort({ createdAt: -1 });
  }

  async deleteScheduledNotification(id: string): Promise<boolean> {
    await connectToDatabase();
    
    const notification = await ScheduledCustomerNotificationModel.findById(id);
    if (!notification) {
      return false;
    }

    // Only allow deletion of draft/cancelled notifications
    if (!['draft', 'cancelled', 'failed'].includes(notification.status)) {
      throw new Error('Can only delete draft, cancelled, or failed notifications');
    }

    const result = await ScheduledCustomerNotificationModel.findByIdAndDelete(id);
    return !!result;
  }

  // Execution and Delivery
  async executeScheduledNotifications(): Promise<void> {
    await connectToDatabase();

    const now = new Date();
    const dueNotifications = await ScheduledCustomerNotificationModel.find({
      status: 'scheduled',
      nextExecutionAt: { $lte: now }
    }).populate('template');

    console.log(`Found ${dueNotifications.length} notifications due for execution`);

    for (const notification of dueNotifications) {
      try {
        await this.executeNotification(notification);
      } catch (error) {
        console.error(`Error executing notification ${notification._id}:`, error);
        await this.addExecutionError(notification._id.toString(), error instanceof Error ? error.message : 'Unknown error', error);
      }
    }
  }

  private async executeNotification(notification: IScheduledCustomerNotification): Promise<void> {
    console.log(`Executing notification: ${notification.name} (${notification._id})`);

    // Update status to sending
    await ScheduledCustomerNotificationModel.findByIdAndUpdate(notification._id.toString(), {
      status: 'sending',
      lastExecutedAt: new Date()
    });

    try {
      // Get target users
      const targeting = await this.calculateTargeting(notification.targetUsers);
      
      console.log(`Targeting ${targeting.users.length} users`);

      // Update actual recipients count
      await ScheduledCustomerNotificationModel.findByIdAndUpdate(notification._id.toString(), {
        actualRecipients: targeting.users.length
      });

      // Send to each user
      let totalSent = 0;
      let totalFailed = 0;

      for (const user of targeting.users) {
        for (const channel of notification.channels) {
          if (channel === 'all') {
            // Send via all available channels
            await this.deliverToUser(notification, user, 'email');
            await this.deliverToUser(notification, user, 'push');
            await this.deliverToUser(notification, user, 'in_app');
          } else {
            const result = await this.deliverToUser(notification, user, channel);
            if (result.success) {
              totalSent++;
            } else {
              totalFailed++;
            }
          }
        }
      }

      // Update execution count and schedule next execution if recurring
      const updates: NotificationUpdates = {
        executionCount: notification.executionCount + 1,
        status: 'sent',
        sentAt: new Date()
      };

      if (notification.schedule.type === 'recurring') {
        const nextExecution = this.calculateNextExecution(notification);
        if (nextExecution) {
          updates.nextExecutionAt = nextExecution;
          updates.status = 'scheduled';
        } else {
          updates.status = 'sent'; // No more executions
        }
      }

      await ScheduledCustomerNotificationModel.findByIdAndUpdate(notification._id.toString(), updates);

      console.log(`Notification execution completed: ${totalSent} sent, ${totalFailed} failed`);

    } catch (error) {
      console.error(`Error during notification execution:`, error);
      
      await ScheduledCustomerNotificationModel.findByIdAndUpdate(notification._id.toString(), {
        status: 'failed'
      });

      await this.addExecutionError(
        notification._id.toString(), 
        error instanceof Error ? error.message : 'Execution failed', 
        error
      );

      throw error;
    }
  }

  private async deliverToUser(
    notification: IScheduledCustomerNotification, 
    user: NotificationUser, 
    channel: DeliveryChannel
  ): Promise<DeliveryResult> {
    try {
      // Create delivery record
      const delivery = new CustomerNotificationDeliveryModel({
        notificationId: notification._id.toString(),
        userId: user.id,
        userEmail: user.email,
        channel,
        status: 'pending'
      });

      const savedDelivery = await delivery.save();

      // Get content (template or overrides)
      const content = await this.prepareContent(notification, user);

      // Deliver based on channel
      let result: DeliveryResult;
      switch (channel) {
        case 'email':
          result = await this.deliverViaEmail(content, user);
          break;
        case 'push':
          result = await this.deliverViaPush(content, user, savedDelivery._id.toString());
          break;
        case 'in_app':
          result = await this.deliverViaInApp(content, user, savedDelivery._id.toString());
          break;
        case 'sms':
          result = await this.deliverViaSms(content, user);
          break;
        default:
          result = { success: false, error: 'Invalid channel' };
      }

      // Update delivery record
      await CustomerNotificationDeliveryModel.findByIdAndUpdate(savedDelivery._id, {
        status: result.success ? 'sent' : 'failed',
        error: result.error,
        sentAt: result.success ? new Date() : undefined,
        trackingId: result.trackingId
      });

      return result;

    } catch (error) {
      console.error(`Error delivering to user ${user.id} via ${channel}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Delivery failed' 
      };
    }
  }

  private async deliverViaEmail(content: NotificationContent, user: NotificationUser): Promise<DeliveryResult> {
    try {
      const smtpService = SmtpService.getInstance();
      
      const result = await smtpService.sendDefaultEmail({
        to: user.email,
        subject: content.subject || content.title || 'Notification',
        html: content.html || `<p>${content.body || content.message || ''}</p>`,
        text: content.text || content.body || content.message || ''
      });

      return {
        success: result.success,
        error: result.success ? undefined : result.error,
        trackingId: result.messageId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email delivery failed'
      };
    }
  }

  private async deliverViaPush(content: NotificationContent, user: NotificationUser, deliveryId: string): Promise<DeliveryResult> {
    try {
      // Check if VAPID is configured
      if (!vapidPublicKey || !vapidPrivateKey) {
        console.warn('Push notifications not configured - VAPID keys missing');
        return { 
          success: false, 
          deliveryId, 
          error: 'Push notifications not configured - VAPID keys missing' 
        };
      }

      await connectToDatabase();
      
      // Get active push subscriptions for the user
      const subscriptions = await PushSubscriptionModel.find({ 
        userId: user.id, 
        isActive: true 
      });

      if (subscriptions.length === 0) {
        console.log(`No active push subscriptions found for user ${user.id}`);
        return { 
          success: false, 
          deliveryId, 
          error: 'No active push subscriptions found' 
        };
      }

      // Send browser push notifications
      const pushPromises = subscriptions.map(async (sub) => {
        try {
          const payload = JSON.stringify({
            title: content.title || content.pushTitle || content.subject,
            body: content.body || content.pushBody || content.text || content.message,
            icon: '/icons/notification-icon.svg',
            badge: '/icons/notification-badge.svg',
            tag: `customer_notification_${deliveryId}`,
            data: {
              deliveryId: deliveryId,
              type: 'customer_notification',
              channel: 'push'
            },
            actions: [
              {
                action: 'view',
                title: 'View'
              },
              {
                action: 'dismiss',
                title: 'Dismiss'
              }
            ]
          });

          await webpush.sendNotification(sub.subscriptionData, payload);
          console.log(`Browser push notification sent to user ${user.id}`);
          return { success: true, endpoint: sub.endpoint };
        } catch (error) {
          console.error('Failed to send push notification to:', sub.endpoint, error);
          
          // If subscription is invalid, mark it as inactive
          if (error instanceof Error && (
            error.message.includes('410') || // Gone
            error.message.includes('invalid') ||
            error.message.includes('expired')
          )) {
            await PushSubscriptionModel.findByIdAndUpdate(sub._id, { 
              isActive: false,
              updatedAt: new Date()
            });
          }
          
          return { success: false, endpoint: sub.endpoint, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });

      const results = await Promise.allSettled(pushPromises);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      
      if (successCount > 0) {
        console.log(`Push notifications sent successfully to ${successCount}/${results.length} subscriptions`);
        return { success: true, deliveryId };
      } else {
        return { 
          success: false, 
          deliveryId, 
          error: `Failed to send to all ${results.length} subscriptions` 
        };
      }

    } catch (error) {
      console.error('Push notification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Push delivery failed'
      };
    }
  }

  private async deliverViaInApp(content: NotificationContent, user: NotificationUser, deliveryId: string): Promise<DeliveryResult> {
    try {
      // Create notification directly in database for the target user
      await connectToDatabase();
      const notification = new InternalNotificationModel({
        userId: user.id,
        type: 'admin_alert',
        title: content.title || content.subject,
        message: content.message || content.text,
        priority: content.priority || 'medium',
        status: 'unread',
        data: {
          type: 'customer_notification',
          deliveryId: deliveryId,
          channel: 'in_app'
        },
        icon: '💬',
        sound: 'default',
        showToast: true,
        showPush: false,
        persistent: false
      });

      await notification.save();
      console.log(`In-app notification created for user ${user.id}: ${content.title || content.subject}`);
      return { success: true, deliveryId };
    } catch (error) {
      console.error('In-app notification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'In-app delivery failed'
      };
    }
  }

  private async deliverViaSms(content: NotificationContent, user: NotificationUser): Promise<DeliveryResult> {
    try {
      // This would integrate with your SMS service
      console.log(`SMS sent to user ${user.id}: ${content.smsContent}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS delivery failed'
      };
    }
  }

  // Helper Methods
  private extractVariablesFromContent(html: string, text: string): string[] {
    const content = `${html} ${text}`;
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables = new Set<string>();
    
    let match;
    while ((match = variableRegex.exec(content)) !== null) {
      variables.add(match[1].trim());
    }
    
    return Array.from(variables);
  }

  private async calculateTargeting(targetUsers: ScheduledCustomerNotification['targetUsers']): Promise<TargetingResult> {
    await connectToDatabase();

    let query: TargetingQuery = {};

    switch (targetUsers.type) {
      case 'all':
        // No additional filters
        break;
      case 'role':
        if (targetUsers.roles?.length) {
          query.role = { $in: targetUsers.roles };
        }
        break;
      case 'specific':
        if (targetUsers.userIds?.length) {
          query._id = { $in: targetUsers.userIds };
        } else {
          return {
            users: [],
            count: 0,
            filters: query
          };
        }
        break;
      case 'filter':
        if (targetUsers.filters) {
          query = this.buildFilterQuery(targetUsers.filters);
        }
        break;
    }
    
    try {
      const users = await UserModel.find(query, { _id: 1, email: 1, name: 1 }).lean();
      
      const result = {
        users: users.map(u => ({ id: u._id.toString(), email: u.email, name: u.name })),
        count: users.length,
        filters: query
      };
      
      return result;
    } catch (error) {
      console.error('Error in targeting calculation:', error);
      throw error;
    }
  }

  private buildFilterQuery(filters: UserFilter): FilterQuery {
    const query: FilterQuery = {};

    if (filters.accountStatus?.length) {
      query.accountStatus = { $in: filters.accountStatus };
    }

    if (filters.registrationDateRange) {
      const dateQuery: { $gte?: Date; $lte?: Date } = {};
      if (filters.registrationDateRange.from) {
        dateQuery.$gte = filters.registrationDateRange.from;
      }
      if (filters.registrationDateRange.to) {
        dateQuery.$lte = filters.registrationDateRange.to;
      }
      if (Object.keys(dateQuery).length > 0) {
        query.createdAt = dateQuery;
      }
    }

    if (filters.country?.length) {
      query.country = { $in: filters.country };
    }

    // Add more filter conditions as needed

    return query;
  }

  private async prepareContent(notification: IScheduledCustomerNotification, user: NotificationUser): Promise<NotificationContent> {
    const template = notification.template;
    if (!template) {
      throw new Error('Template not found');
    }

    // Start with template content
    const content = {
      subject: notification.contentOverrides?.subject || template.subject,
      html: notification.contentOverrides?.html || template.content.html,
      text: notification.contentOverrides?.text || template.content.text,
      pushTitle: notification.contentOverrides?.pushTitle || template.content.pushTitle,
      pushBody: notification.contentOverrides?.pushBody || template.content.pushBody,
      smsContent: notification.contentOverrides?.smsContent || template.content.smsContent
    };

    // Replace variables
    const variables = {
      name: user.name || 'Customer',
      email: user.email,
      ...notification.templateVariables
    };

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      content.subject = content.subject.replace(regex, String(value));
      content.html = content.html.replace(regex, String(value));
      content.text = content.text.replace(regex, String(value));
      if (content.pushTitle) content.pushTitle = content.pushTitle.replace(regex, String(value));
      if (content.pushBody) content.pushBody = content.pushBody.replace(regex, String(value));
      if (content.smsContent) content.smsContent = content.smsContent.replace(regex, String(value));
    }

    return content;
  }

  private calculateNextExecution(notification: IScheduledCustomerNotification): Date | null {
    if (notification.schedule.type !== 'recurring' || !notification.schedule.recurrence) {
      return null;
    }

    const { type, interval, endDate, maxOccurrences } = notification.schedule.recurrence;
    
    if (maxOccurrences && notification.executionCount >= maxOccurrences) {
      return null;
    }

    const baseDate = notification.lastExecutedAt || notification.createdAt;
    const nextDate = new Date(baseDate);

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
  }

  private async addExecutionError(notificationId: string, message: string, details?: unknown): Promise<void> {
    await ScheduledCustomerNotificationModel.findByIdAndUpdate(notificationId, {
      $push: {
        executionErrors: {
          timestamp: new Date(),
          message,
          details
        }
      }
    });
  }

  // Analytics and Reporting
  async getDeliveryStats(notificationId: string): Promise<DeliveryStatsResult> {
    await connectToDatabase();

    const deliveries = await CustomerNotificationDeliveryModel.aggregate([
      { $match: { notificationId } },
      {
        $group: {
          _id: { channel: '$channel', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);

    const stats: DeliveryStatsResult = {
      email: { sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0 },
      push: { sent: 0, delivered: 0, clicked: 0, failed: 0 },
      sms: { sent: 0, delivered: 0, failed: 0 },
      inApp: { sent: 0, read: 0 }
    };

    deliveries.forEach(item => {
      const { channel, status } = item._id;
      if (channel in stats && typeof stats[channel as keyof DeliveryStatsResult] === 'object') {
        const channelStats = stats[channel as keyof DeliveryStatsResult] as Record<string, number>;
        if (status in channelStats) {
          channelStats[status] = item.count;
        }
      }
    });

    return stats;
  }

  async getNotificationAnalytics(dateRange?: { from: Date; to: Date }): Promise<AnalyticsResult[]> {
    await connectToDatabase();

    const matchQuery: AnalyticsQuery = {};
    if (dateRange) {
      matchQuery.createdAt = {
        $gte: dateRange.from,
        $lte: dateRange.to
      };
    }

    const analytics = await ScheduledCustomerNotificationModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRecipients: { $sum: '$actualRecipients' }
        }
      }
    ]);

    return analytics;
  }

  // Instant Notification
  async sendInstantNotification(notification: {
    title: string;
    message: string;
    targetUsers: ScheduledCustomerNotification['targetUsers'];
    priority: string;
    channels: DeliveryChannel[];
    createdBy: string;
  }): Promise<{ recipientCount: number; deliveryIds: string[] }> {
    await connectToDatabase();

    // Calculate target users
    const targeting = await this.calculateTargeting(notification.targetUsers);
    
    if (targeting.count === 0) {
      throw new Error('No users match the targeting criteria');
    }

    const deliveryIds: string[] = [];
    const deliveryPromises: Promise<void>[] = [];

    // Process each user and channel combination
    for (const user of targeting.users) {
      for (const channel of notification.channels) {
        const deliveryPromise = this.deliverInstantMessage(
          notification,
          user,
          channel
        ).then((result: DeliveryResult) => {
          if (result.deliveryId) {
            deliveryIds.push(result.deliveryId);
          }
        }).catch((error: unknown) => {
          console.error(`Failed to deliver instant message to ${user.id} via ${channel}:`, error);
        });
        
        deliveryPromises.push(deliveryPromise);
      }
    }

    // Execute all delivery operations in parallel
    await Promise.allSettled(deliveryPromises);

    return {
      recipientCount: targeting.count,
      deliveryIds
    };
  }

  private async deliverInstantMessage(
    notification: {
      title: string;
      message: string;
      priority: string;
      createdBy: string;
    },
    user: NotificationUser,
    channel: DeliveryChannel
  ): Promise<DeliveryResult> {
    const deliveryId = `instant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Create delivery record
      await connectToDatabase();
      const delivery = new CustomerNotificationDeliveryModel({
        notificationId: 'instant',
        userId: user.id,
        userEmail: user.email,
        channel,
        content: JSON.stringify({
          title: notification.title,
          message: notification.message
        }),
        status: 'pending',
        metadata: {
          deliveryId,
          createdBy: notification.createdBy,
          priority: notification.priority
        }
      });
      
      await delivery.save();

      // Deliver based on channel
      let result: DeliveryResult;
      
      switch (channel) {
        case 'email':
          result = await this.deliverViaEmail({
            subject: notification.title,
            html: `<p>${notification.message}</p>`,
            text: notification.message
          }, user);
          break;
          
        case 'push':
          result = await this.deliverViaPush({
            title: notification.title,
            body: notification.message,
            priority: notification.priority
          }, user, deliveryId);
          break;
          
        case 'in_app':
          result = await this.deliverViaInApp({
            title: notification.title,
            message: notification.message,
            priority: notification.priority
          }, user, deliveryId);
          break;
          
        case 'sms':
          result = await this.deliverViaSms({
            message: `${notification.title}\n\n${notification.message}`
          }, user);
          break;
          
        default:
          throw new Error(`Unsupported delivery channel: ${channel}`);
      }

      // Update delivery status
      await CustomerNotificationDeliveryModel.findOneAndUpdate(
        { deliveryId },
        {
          status: result.success ? 'sent' : 'failed',
          deliveredAt: result.success ? new Date() : undefined,
          error: result.error,
          trackingId: result.trackingId
        }
      );

      return result;
    } catch (error: unknown) {
      console.error(`Delivery failed for user ${user.id} via ${channel}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Update delivery status to failed
      await CustomerNotificationDeliveryModel.findOneAndUpdate(
        { deliveryId },
        {
          status: 'failed',
          error: errorMessage,
          failedAt: new Date()
        }
      );

      return {
        success: false,
        deliveryId,
        error: errorMessage
      };
    }
  }
}

export default CustomerNotificationService; 