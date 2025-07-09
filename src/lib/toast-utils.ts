import { InternalNotification, NotificationType, NotificationTemplates } from '@/types/notifications';

/**
 * Utility functions for triggering custom toast notifications
 */

// Global function to show toast (will be attached by ToastContainer)
declare global {
  interface Window {
    showNotificationToast?: (
      notification: InternalNotification,
      options?: {
        position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
        duration?: number;
      }
    ) => void;
  }
}

interface ToastOptions {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  duration?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  data?: Record<string, any>;
  userId?: string;
}

/**
 * Generate a unique ID for toast notifications
 */
function generateToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Show a quick toast notification
 */
export function showToast(
  type: NotificationType,
  title?: string,
  message?: string,
  options: ToastOptions = {}
) {
  if (typeof window === 'undefined' || !window.showNotificationToast) {
    console.warn('Toast system not initialized');
    return;
  }

  const template = NotificationTemplates[type];
  
  const notification: InternalNotification = {
    id: generateToastId(),
    userId: options.userId || 'anonymous',
    type,
    title: title || template.getTitle(options.data),
    message: message || template.getMessage(options.data),
    priority: options.priority || 'medium',
    status: 'unread',
    data: options.data,
    actionUrl: options.actionUrl,
    icon: template.icon,
    sound: template.sound,
    showToast: true,
    showPush: false,
    persistent: false,
    createdAt: new Date()
  };

  window.showNotificationToast(notification, {
    position: options.position,
    duration: options.duration
  });
}

/**
 * Show a success toast
 */
export function showSuccessToast(
  message: string,
  title?: string,
  options: ToastOptions = {}
) {
  showToast(
    'payment_success', // Using payment_success as a generic success type
    title || 'Success',
    message,
    { ...options, priority: 'medium' }
  );
}

/**
 * Show an error toast
 */
export function showErrorToast(
  message: string,
  title?: string,
  options: ToastOptions = {}
) {
  showToast(
    'payment_failed', // Using payment_failed as a generic error type
    title || 'Error',
    message,
    { ...options, priority: 'high' }
  );
}

/**
 * Show a warning toast
 */
export function showWarningToast(
  message: string,
  title?: string,
  options: ToastOptions = {}
) {
  showToast(
    'low_balance', // Using low_balance as a generic warning type
    title || 'Warning',
    message,
    { ...options, priority: 'high' }
  );
}

/**
 * Show an info toast
 */
export function showInfoToast(
  message: string,
  title?: string,
  options: ToastOptions = {}
) {
  showToast(
    'system_maintenance', // Using system_maintenance as a generic info type
    title || 'Information',
    message,
    { ...options, priority: 'low' }
  );
}

/**
 * Show an urgent toast
 */
export function showUrgentToast(
  message: string,
  title?: string,
  options: ToastOptions = {}
) {
  showToast(
    'security_alert', // Using security_alert as a generic urgent type
    title || 'Urgent',
    message,
    { ...options, priority: 'urgent' }
  );
}

/**
 * Show a ticket-related toast
 */
export function showTicketToast(
  action: 'created' | 'updated' | 'assigned' | 'resolved' | 'reply',
  ticketNumber: string,
  options: ToastOptions = {}
) {
  const typeMap = {
    created: 'ticket_created',
    updated: 'ticket_updated',
    assigned: 'ticket_assigned',
    resolved: 'ticket_resolved',
    reply: 'ticket_reply'
  } as const;

  showToast(
    typeMap[action],
    undefined,
    undefined,
    {
      ...options,
      data: { ticketNumber, ...options.data }
    }
  );
}

/**
 * Show a payment-related toast
 */
export function showPaymentToast(
  success: boolean,
  amount: string,
  currency: string = 'USD',
  options: ToastOptions = {}
) {
  showToast(
    success ? 'payment_success' : 'payment_failed',
    undefined,
    undefined,
    {
      ...options,
      priority: success ? 'medium' : 'high',
      data: { amount, currency, ...options.data }
    }
  );
}

/**
 * Show a phone number related toast
 */
export function showPhoneNumberToast(
  action: 'approved' | 'rejected' | 'purchased' | 'assigned',
  phoneNumber: string,
  options: ToastOptions = {}
) {
  const typeMap = {
    approved: 'phone_number_approved',
    rejected: 'phone_number_rejected',
    purchased: 'phone_number_purchased',
    assigned: 'phone_number_assigned'
  } as const;

  showToast(
    typeMap[action],
    undefined,
    undefined,
    {
      ...options,
      data: { phoneNumber, ...options.data }
    }
  );
}

/**
 * Show a balance-related toast
 */
export function showBalanceToast(
  balance: number,
  threshold: number,
  currency: string = 'USD',
  options: ToastOptions = {}
) {
  const type = balance <= 0 ? 'zero_balance' : 'low_balance';
  const priority = balance <= 0 ? 'urgent' : 'high';

  showToast(
    type,
    undefined,
    undefined,
    {
      ...options,
      priority,
      data: { balance: balance.toFixed(2), threshold: threshold.toFixed(2), currency, ...options.data }
    }
  );
}

/**
 * Hook to easily show toasts from React components
 */
export function useToast() {
  return {
    showToast,
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    showInfoToast,
    showUrgentToast,
    showTicketToast,
    showPaymentToast,
    showPhoneNumberToast,
    showBalanceToast
  };
} 