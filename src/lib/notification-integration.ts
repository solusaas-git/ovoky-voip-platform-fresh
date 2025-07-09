import InternalNotificationService from '@/services/InternalNotificationService';
import { NotificationType } from '@/types/notifications';

/**
 * Production-ready notification integration functions
 * These functions should be called from your existing business logic
 */

// Create service instance
const notificationService = InternalNotificationService.getInstance();

// Interface for notification data
interface NotificationData {
  [key: string]: unknown;
}

/**
 * Ticket-related notifications
 */
export async function notifyTicketCreated(
  userId: string,
  ticketData: {
    ticketNumber: string;
    title: string;
    priority?: string;
    category?: string;
    assignedTo?: string;
  }
) {
  await notificationService.createNotification(userId, 'ticket_created', {
    ticketNumber: ticketData.ticketNumber,
    title: ticketData.title,
    priority: ticketData.priority,
    category: ticketData.category,
    assignedTo: ticketData.assignedTo,
    actionUrl: `/tickets/${ticketData.ticketNumber}`
  });
}

export async function notifyTicketUpdated(
  userId: string,
  ticketData: {
    ticketNumber: string;
    title: string;
    status: string;
    updatedBy: string;
  }
) {
  await notificationService.createNotification(userId, 'ticket_updated', {
    ticketNumber: ticketData.ticketNumber,
    title: ticketData.title,
    status: ticketData.status,
    updatedBy: ticketData.updatedBy,
    actionUrl: `/tickets/${ticketData.ticketNumber}`
  });
}

export async function notifyTicketAssigned(
  userId: string,
  ticketData: {
    ticketNumber: string;
    title: string;
    assignedBy: string;
    priority?: string;
  }
) {
  await notificationService.createNotification(userId, 'ticket_assigned', {
    ticketNumber: ticketData.ticketNumber,
    title: ticketData.title,
    assignedBy: ticketData.assignedBy,
    priority: ticketData.priority,
    actionUrl: `/tickets/${ticketData.ticketNumber}`
  });
}

export async function notifyTicketReply(
  userId: string,
  ticketData: {
    ticketNumber: string;
    title: string;
    repliedBy: string;
    isCustomerReply: boolean;
  }
) {
  await notificationService.createNotification(userId, 'ticket_reply', {
    ticketNumber: ticketData.ticketNumber,
    title: ticketData.title,
    repliedBy: ticketData.repliedBy,
    isCustomerReply: ticketData.isCustomerReply,
    actionUrl: `/tickets/${ticketData.ticketNumber}`
  });
}

export async function notifyTicketResolved(
  userId: string,
  ticketData: {
    ticketNumber: string;
    title: string;
    resolvedBy: string;
    resolution?: string;
  }
) {
  await notificationService.createNotification(userId, 'ticket_resolved', {
    ticketNumber: ticketData.ticketNumber,
    title: ticketData.title,
    resolvedBy: ticketData.resolvedBy,
    resolution: ticketData.resolution,
    actionUrl: `/tickets/${ticketData.ticketNumber}`
  });
}

/**
 * Payment-related notifications
 */
export async function notifyPaymentSuccess(
  userId: string,
  paymentData: {
    amount: string;
    currency: string;
    paymentId: string;
    paymentMethod?: string;
    description?: string;
  }
) {
  await notificationService.createNotification(userId, 'payment_success', {
    amount: paymentData.amount,
    currency: paymentData.currency,
    paymentId: paymentData.paymentId,
    paymentMethod: paymentData.paymentMethod,
    description: paymentData.description,
    actionUrl: `/billing/payments/${paymentData.paymentId}`
  });
}

export async function notifyPaymentFailed(
  userId: string,
  paymentData: {
    amount: string;
    currency: string;
    paymentId?: string;
    reason: string;
    retryUrl?: string;
  }
) {
  await notificationService.createNotification(userId, 'payment_failed', {
    amount: paymentData.amount,
    currency: paymentData.currency,
    paymentId: paymentData.paymentId,
    reason: paymentData.reason,
    actionUrl: paymentData.retryUrl || '/billing'
  });
}

/**
 * Balance-related notifications
 */
export async function notifyLowBalance(
  userId: string,
  balanceData: {
    balance: string;
    currency: string;
    threshold: string;
    lastTopUp?: Date;
  }
) {
  await notificationService.createNotification(userId, 'low_balance', {
    balance: balanceData.balance,
    currency: balanceData.currency,
    threshold: balanceData.threshold,
    lastTopUp: balanceData.lastTopUp,
    actionUrl: '/billing/top-up'
  });
}

export async function notifyZeroBalance(
  userId: string,
  balanceData: {
    balance: string;
    currency: string;
    servicesAffected?: string[];
  }
) {
  await notificationService.createNotification(userId, 'zero_balance', {
    balance: balanceData.balance,
    currency: balanceData.currency,
    servicesAffected: balanceData.servicesAffected,
    actionUrl: '/billing/top-up'
  });
}

/**
 * Phone number-related notifications
 */
export async function notifyPhoneNumberApproved(
  userId: string,
  phoneData: {
    phoneNumber: string;
    country: string;
    type: string;
    monthlyCost?: string;
  }
) {
  await notificationService.createNotification(userId, 'phone_number_approved', {
    phoneNumber: phoneData.phoneNumber,
    country: phoneData.country,
    type: phoneData.type,
    monthlyCost: phoneData.monthlyCost,
    actionUrl: '/phone-numbers'
  });
}

export async function notifyPhoneNumberRejected(
  userId: string,
  phoneData: {
    phoneNumber: string;
    country: string;
    reason: string;
  }
) {
  await notificationService.createNotification(userId, 'phone_number_rejected', {
    phoneNumber: phoneData.phoneNumber,
    country: phoneData.country,
    reason: phoneData.reason,
    actionUrl: '/phone-numbers'
  });
}

export async function notifyPhoneNumberPurchased(
  userId: string,
  phoneData: {
    phoneNumber: string;
    country: string;
    type: string;
    cost: string;
    currency: string;
  }
) {
  await notificationService.createNotification(userId, 'phone_number_purchased', {
    phoneNumber: phoneData.phoneNumber,
    country: phoneData.country,
    type: phoneData.type,
    cost: phoneData.cost,
    currency: phoneData.currency,
    actionUrl: '/phone-numbers'
  });
}

export async function notifyPhoneNumberAssigned(
  userId: string,
  phoneData: {
    phoneNumber: string;
    assignedTo: string;
    purpose: string;
  }
) {
  await notificationService.createNotification(userId, 'phone_number_assigned', {
    phoneNumber: phoneData.phoneNumber,
    assignedTo: phoneData.assignedTo,
    purpose: phoneData.purpose,
    actionUrl: '/phone-numbers'
  });
}

/**
 * System and admin notifications
 */
export async function notifySystemMaintenance(
  userId: string,
  maintenanceData: {
    scheduledDate: Date;
    duration: string;
    affectedServices: string[];
    description?: string;
  }
) {
  await notificationService.createNotification(userId, 'system_maintenance', {
    scheduledDate: maintenanceData.scheduledDate,
    duration: maintenanceData.duration,
    affectedServices: maintenanceData.affectedServices,
    description: maintenanceData.description
  });
}

export async function notifySecurityAlert(
  userId: string,
  securityData: {
    alertType: string;
    description: string;
    ipAddress?: string;
    location?: string;
    actionRequired?: boolean;
  }
) {
  await notificationService.createNotification(userId, 'security_alert', {
    alertType: securityData.alertType,
    description: securityData.description,
    ipAddress: securityData.ipAddress,
    location: securityData.location,
    actionRequired: securityData.actionRequired,
    actionUrl: '/account/security'
  });
}

export async function notifyAdminAlert(
  userId: string,
  alertData: {
    alertType: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'urgent';
    source?: string;
    actionUrl?: string;
  }
) {
  await notificationService.createNotification(userId, 'admin_alert', {
    alertType: alertData.alertType,
    message: alertData.message,
    severity: alertData.severity,
    source: alertData.source,
    actionUrl: alertData.actionUrl || '/admin/alerts'
  });
}

export async function notifyUserVerification(
  userId: string,
  verificationData: {
    verificationType: string;
    status: 'pending' | 'approved' | 'rejected';
    documentsRequired?: string[];
    deadline?: Date;
  }
) {
  await notificationService.createNotification(userId, 'user_verification', {
    verificationType: verificationData.verificationType,
    status: verificationData.status,
    documentsRequired: verificationData.documentsRequired,
    deadline: verificationData.deadline,
    actionUrl: '/account/verification'
  });
}

export async function notifyCallQualityAlert(
  userId: string,
  qualityData: {
    route: string;
    qualityScore: number;
    issueType: string;
    affectedCalls: number;
    timeFrame: string;
  }
) {
  await notificationService.createNotification(userId, 'call_quality_alert', {
    route: qualityData.route,
    qualityScore: qualityData.qualityScore,
    issueType: qualityData.issueType,
    affectedCalls: qualityData.affectedCalls,
    timeFrame: qualityData.timeFrame,
    actionUrl: '/call-quality/reports'
  });
}

export async function notifyRateDeckUpdated(
  userId: string,
  rateDeckData: {
    rateDeckName: string;
    updatedBy: string;
    changesCount: number;
    effectiveDate: Date;
  }
) {
  await notificationService.createNotification(userId, 'rate_deck_updated', {
    rateDeckName: rateDeckData.rateDeckName,
    updatedBy: rateDeckData.updatedBy,
    changesCount: rateDeckData.changesCount,
    effectiveDate: rateDeckData.effectiveDate,
    actionUrl: '/rate-decks'
  });
}

/**
 * Bulk notification functions for admin use
 */
export async function notifyMultipleUsers(
  userIds: string[],
  notificationType: NotificationType,
  data: NotificationData
) {
  const promises = userIds.map(userId => 
    notificationService.createNotification(userId, notificationType, data)
  );
  
  try {
    await Promise.all(promises);
    console.log(`Successfully sent ${notificationType} notifications to ${userIds.length} users`);
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    throw error;
  }
}

/**
 * Utility function to notify all admins
 */
export async function notifyAllAdmins(
  notificationType: NotificationType,
  data: NotificationData
) {
  // This would need to be implemented with your user management system
  // Example: const adminUserIds = await getUsersByRole('admin');
  // await notifyMultipleUsers(adminUserIds, notificationType, data);
  console.warn('notifyAllAdmins: Please implement admin user retrieval logic');
} 