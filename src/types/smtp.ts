// Email category types for routing
export type EmailCategory = 'billing' | 'authentication' | 'support' | 'default';

// SMTP Settings interface (client-side compatible)
export interface ISmtpSettings {
  _id?: string;
  name: string;
  category: EmailCategory;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string; // Optional for security
  fromEmail: string;
  fromName: string;
  enabled: boolean;
  isDefault: boolean;
  priority: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// SMTP test result interface
export interface SmtpTestResult {
  success: boolean;
  message: string;
  error?: string;
}

// Email routing configuration
export interface EmailRoutingConfig {
  category: EmailCategory;
  smtpAccountId: string;
  smtpAccount: ISmtpSettings;
}

// Helper constants for email routing
export const EMAIL_CATEGORY_DESCRIPTIONS = {
  billing: 'Payment confirmations, balance alerts, invoice notifications',
  authentication: 'Login, signup, password reset, email verification, OTP',
  support: 'KPI alerts, system notifications, support communications',
  default: 'General notifications and fallback for uncategorized emails'
} as const;

export const EMAIL_CATEGORY_EXAMPLES = {
  billing: ['topup-success', 'balance-low', 'payment-failed', 'invoice-generated'],
  authentication: ['signup-welcome', 'forgot-password', 'email-verification', 'otp-code', 'account-activation'],
  support: ['kpi-alert', 'system-maintenance', 'support-ticket', 'performance-report'],
  default: ['general-notification', 'system-update', 'announcement']
} as const; 