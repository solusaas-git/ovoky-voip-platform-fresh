import { 
  InternalNotification, 
  NotificationPreferences, 
  NotificationType, 
  NotificationTemplates,
  createDefaultPreferences 
} from '@/types/notifications';
import NotificationSoundService from './NotificationSoundService';

// Interfaces for type safety
interface NotificationData {
  [key: string]: unknown;
}

interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byStatus: Record<string, number>;
  recent: number;
}

interface TicketEventData {
  ticketNumber: string;
  status: string;
  priority: string;
  title: string;
  [key: string]: unknown;
}

interface PaymentEventData {
  amount: number | string;
  currency: string;
  id: string;
  failureReason?: string;
  [key: string]: unknown;
}

interface PhoneNumberEventData {
  number: string;
  country: string;
  type: string;
  [key: string]: unknown;
}

export class InternalNotificationService {
  private static instance: InternalNotificationService;
  private soundService: NotificationSoundService;
  private pushNotificationSupported: boolean = false;
  private pushSubscription: PushSubscription | null = null;
  private isClient: boolean = false;

  private constructor() {
    this.isClient = typeof window !== 'undefined';
    this.soundService = NotificationSoundService.getInstance();
    if (this.isClient) {
      this.initializePushNotifications();
    }
  }

  public static getInstance(): InternalNotificationService {
    if (!InternalNotificationService.instance) {
      InternalNotificationService.instance = new InternalNotificationService();
    }
    return InternalNotificationService.instance;
  }

  private async initializePushNotifications(): Promise<void> {
    if (!this.isClient) return;
    
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      this.pushNotificationSupported = true;
      try {
        // Register service worker for push notifications
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered for push notifications');
        
        // Check for existing subscription
        this.pushSubscription = await registration.pushManager.getSubscription();
      } catch (error) {
        console.warn('Push notification initialization failed:', error);
        this.pushNotificationSupported = false;
      }
    }
  }

  /**
   * Create and send a new internal notification via API
   */
  public async createNotification(
    userId: string,
    type: NotificationType,
    data?: NotificationData
  ): Promise<InternalNotification | null> {
    if (!this.isClient) return null;
    
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          type,
          data
        })
      });

      if (!response.ok) {
        console.error('Failed to create notification:', await response.text());
        return null;
      }

      const notification = await response.json();

      // Get user preferences to handle client-side effects
      const preferences = await this.getUserPreferences(userId);
      if (preferences) {
        const template = NotificationTemplates[type];
        const typePrefs = preferences.typePreferences[type];

        // Handle sound notification
        if (preferences.enableSounds && typePrefs?.playSound) {
          await this.soundService.playSound(
            preferences.soundTheme || template.sound,
            preferences.soundVolume
          );
        }

        // Handle push notification
        if (preferences.enablePushNotifications && typePrefs?.enablePush) {
          await this.sendPushNotification(notification, preferences);
        }
      }

      return notification;
    } catch (error) {
      console.error('Error creating internal notification:', error);
      return null;
    }
  }

  /**
   * Get user's notification preferences via API
   */
  public async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    if (!this.isClient) return null;
    
    try {
      const response = await fetch('/api/notifications/preferences', {
        credentials: 'include' // Include cookies for authentication
      });

      if (!response.ok) {
        console.error('Failed to fetch preferences:', await response.text());
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return null;
    }
  }

  /**
   * Update user's notification preferences via API
   */
  public async updateUserPreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences | null> {
    if (!this.isClient) return null;
    
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(updates) // Don't include userId, use authentication
      });

      if (!response.ok) {
        console.error('Failed to update preferences:', await response.text());
        return null;
      }

      const preferences = await response.json();

      // Update sound service settings
      if (updates.enableSounds !== undefined) {
        this.soundService.setEnabled(updates.enableSounds);
      }
      if (updates.soundVolume !== undefined) {
        this.soundService.setVolume(updates.soundVolume);
      }

      return preferences;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return null;
    }
  }

  /**
   * Get user's notifications with filtering via API
   */
  public async getUserNotifications(
    userId: string,
    options: {
      status?: string[];
      types?: NotificationType[];
      limit?: number;
      offset?: number;
      search?: string;
    } = {}
  ): Promise<{ notifications: InternalNotification[]; total: number }> {
    if (!this.isClient) return { notifications: [], total: 0 };
    
    try {
      const params = new URLSearchParams();
      
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.search) params.append('search', options.search);
      if (options.types?.length) params.append('types', options.types.join(','));
      if (options.status?.length) params.append('statuses', options.status.join(','));

      const response = await fetch(`/api/notifications?${params}`, {
        credentials: 'include' // Include cookies for authentication
      });
      
      if (!response.ok) {
        console.error('Failed to fetch notifications:', await response.text());
        return { notifications: [], total: 0 };
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return { notifications: [], total: 0 };
    }
  }

  /**
   * Mark notification as read via API
   */
  public async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    if (!this.isClient) return false;
    
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      return response.ok;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user via API
   */
  public async markAllAsRead(userId: string): Promise<number> {
    if (!this.isClient) return 0;
    
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) return 0;
      
      const result = await response.json();
      return result.count || 0;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return 0;
    }
  }

  /**
   * Archive notification via API
   */
  public async archiveNotification(notificationId: string, userId: string): Promise<boolean> {
    if (!this.isClient) return false;
    
    try {
      const response = await fetch(`/api/notifications/${notificationId}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      return response.ok;
    } catch (error) {
      console.error('Error archiving notification:', error);
      return false;
    }
  }

  /**
   * Delete notification via API
   */
  public async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    if (!this.isClient) return false;
    
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  /**
   * Clear all notifications for a user via API
   */
  public async clearAllNotifications(userId: string): Promise<number> {
    if (!this.isClient) return 0;
    
    try {
      const response = await fetch('/api/notifications/clear-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) return 0;
      
      const result = await response.json();
      return result.count || 0;
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      return 0;
    }
  }

  /**
   * Get user's notification statistics via API
   */
  public async getUserStats(userId: string): Promise<NotificationStats> {
    const defaultStats: NotificationStats = {
      total: 0,
      unread: 0,
      byType: {} as Record<NotificationType, number>,
      byStatus: {},
      recent: 0
    };

    if (!this.isClient) return defaultStats;
    
    try {
      const response = await fetch('/api/notifications/stats', {
        credentials: 'include' // Include cookies for authentication
      });

      if (!response.ok) {
        console.error('Failed to fetch stats:', await response.text());
        return defaultStats;
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting user stats:', error);
      return defaultStats;
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    notification: InternalNotification,
    preferences: NotificationPreferences
  ): Promise<void> {
    if (!this.pushNotificationSupported || !this.pushSubscription || !this.isClient) {
      return;
    }

    // Don't send push if user is currently active (tab is focused)
    if (preferences.pushOnlyWhenAway && !document.hidden) {
      return;
    }

    try {
      const pushPayload = {
        title: notification.title,
        body: notification.message,
        icon: '/icons/notification-icon.svg',
        badge: '/icons/notification-badge.svg',
        tag: notification.type,
        data: {
          notificationId: notification.id,
          actionUrl: notification.actionUrl,
          type: notification.type
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
      };

      // Send to service worker for push notification
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(pushPayload.title, pushPayload);
      });

    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  /**
   * Request push notification permission
   */
  public async requestPushPermission(): Promise<boolean> {
    if (!this.pushNotificationSupported || !this.isClient) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Subscribe to push notifications
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
          )
        });

        this.pushSubscription = subscription;

        // Send subscription to server
        await this.savePushSubscription(subscription);
        return true;
      }
    } catch (error) {
      console.error('Error requesting push permission:', error);
    }

    return false;
  }

  /**
   * Save push subscription to server
   */
  private async savePushSubscription(subscription: PushSubscription): Promise<void> {
    if (!this.isClient) return;
    
    try {
      const response = await fetch('/api/notifications/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(subscription.toJSON())
      });

      if (!response.ok) {
        console.error('Failed to save push subscription:', await response.text());
        return;
      }

      console.log('Push subscription saved successfully');
    } catch (error) {
      console.error('Error saving push subscription:', error);
    }
  }

  /**
   * Test notification (for settings/preferences)
   */
  public async testNotification(
    userId: string,
    type: NotificationType
  ): Promise<void> {
    const testData = {
      ticketNumber: 'TEST-123',
      amount: '50.00',
      currency: 'USD',
      phoneNumber: '+1234567890',
      message: 'This is a test notification'
    };

    await this.createNotification(userId, type, testData);
  }

  /**
   * Helper function to convert VAPID key
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    if (!this.isClient) return new Uint8Array();
    
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Integration methods for existing notification systems
   */

  // Called when email notifications are sent to also create internal notifications
  public async onEmailNotificationSent(
    userId: string,
    type: NotificationType,
    data: NotificationData
  ): Promise<void> {
    // Only create internal notification if different from email
    const preferences = await this.getUserPreferences(userId);
    if (preferences?.typePreferences[type]?.enabled) {
      await this.createNotification(userId, type, data);
    }
  }

  // Called when tickets are created/updated to send notifications
  public async onTicketEvent(
    event: 'created' | 'updated' | 'assigned' | 'reply' | 'resolved',
    ticketData: TicketEventData,
    userId: string
  ): Promise<void> {
    const typeMap: Record<string, NotificationType> = {
      created: 'ticket_created',
      updated: 'ticket_updated',
      assigned: 'ticket_assigned',
      reply: 'ticket_reply',
      resolved: 'ticket_resolved'
    };

    const type = typeMap[event];
    if (type) {
      await this.createNotification(userId, type, {
        ticketNumber: ticketData.ticketNumber,
        status: ticketData.status,
        priority: ticketData.priority,
        title: ticketData.title
      });
    }
  }

  // Called when payments are processed
  public async onPaymentEvent(
    event: 'success' | 'failed',
    paymentData: PaymentEventData,
    userId: string
  ): Promise<void> {
    const type = event === 'success' ? 'payment_success' : 'payment_failed';
    
    await this.createNotification(userId, type, {
      amount: paymentData.amount,
      currency: paymentData.currency,
      paymentId: paymentData.id,
      reason: paymentData.failureReason
    });
  }

  // Called when phone number events occur
  public async onPhoneNumberEvent(
    event: 'approved' | 'rejected' | 'purchased' | 'assigned',
    phoneNumberData: PhoneNumberEventData,
    userId: string
  ): Promise<void> {
    const typeMap: Record<string, NotificationType> = {
      approved: 'phone_number_approved',
      rejected: 'phone_number_rejected',
      purchased: 'phone_number_purchased',
      assigned: 'phone_number_assigned'
    };

    const type = typeMap[event];
    if (type) {
      await this.createNotification(userId, type, {
        phoneNumber: phoneNumberData.number,
        country: phoneNumberData.country,
        type: phoneNumberData.type
      });
    }
  }
}

export default InternalNotificationService; 