// Email verification templates
export { generateEmailVerificationTemplate } from './emailVerification';
export type { EmailVerificationData } from './emailVerification';

// Account activation templates
export { generateAccountActivationTemplate } from './accountActivation';
export type { AccountActivationData } from './accountActivation';

// Admin notification templates
export { generateAdminUserRegistrationTemplate } from './adminNotifications';
export type { AdminUserRegistrationData } from './adminNotifications';

// Balance notification templates
export { generateBalanceNotificationTemplate } from './balanceNotifications';
export type { BalanceNotificationData } from './balanceNotifications';

// Payment notification templates
export { generatePaymentSuccessTemplate } from './paymentNotifications';
export type { PaymentSuccessData } from './paymentNotifications';

// Phone number notification templates
export {
  generateBackorderNotificationTemplate,
  generateCancellationNotificationTemplate,
  generateNumberPurchaseNotificationTemplate,
  generateNumberAssignmentNotificationTemplate,
  generateNumberUnassignmentNotificationTemplate
} from './phoneNumberNotifications';
export type {
  BackorderNotificationData,
  CancellationNotificationData,
  NumberPurchaseNotificationData,
  NumberAssignmentNotificationData
} from './phoneNumberNotifications';

// KPI alert templates (existing)
export {
  generateHighCostAlertEmail,
  generateLowAsrAlertEmail,
  generateExtremeUsageAlertEmail
} from './kpiAlerts';

// Re-export interfaces for convenience
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Template categories for easy reference
export const EMAIL_TEMPLATE_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  ACCOUNT_MANAGEMENT: 'account_management',
  NOTIFICATIONS: 'notifications',
  ALERTS: 'alerts',
  PAYMENTS: 'payments',
  PHONE_NUMBERS: 'phone_numbers'
} as const;

export type EmailTemplateCategory = typeof EMAIL_TEMPLATE_CATEGORIES[keyof typeof EMAIL_TEMPLATE_CATEGORIES]; 