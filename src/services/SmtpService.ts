import SmtpSettings from '@/models/SmtpSettings';
import { EmailCategory, ISmtpSettings } from '@/types/smtp';
import { connectToDatabase } from '@/lib/db';
import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  accountUsed?: {
    name: string;
    category: EmailCategory;
    fromEmail: string;
  };
}

export class SmtpService {
  private static instance: SmtpService;
  
  private constructor() {}
  
  public static getInstance(): SmtpService {
    if (!SmtpService.instance) {
      SmtpService.instance = new SmtpService();
    }
    return SmtpService.instance;
  }

  /**
   * Get SMTP account for a specific email category
   */
  public async getSmtpAccountForCategory(category: EmailCategory): Promise<unknown> {
    try {
      await connectToDatabase();
      
      // First try to find an enabled account for the specific category
      let account = await SmtpSettings.findOne({
        category,
        enabled: true
      })
      .select('+password')
      .sort({ priority: 1, createdAt: 1 });

      // If no specific category account found, try to get the default account
      if (!account && category !== 'default') {
        account = await SmtpSettings.findOne({
          isDefault: true,
          enabled: true
        })
        .select('+password') as typeof account;
      }

      // If still no account, get any enabled account as last resort
      if (!account) {
        account = await SmtpSettings.findOne({
          enabled: true
        })
        .select('+password')
        .sort({ priority: 1, createdAt: 1 });
      }

      return account;
    } catch (error) {
      console.error('Error getting SMTP account for category:', error);
      return null;
    }
  }

  /**
   * Send email using appropriate SMTP account based on category
   */
  public async sendEmail(category: EmailCategory, emailOptions: EmailOptions): Promise<EmailResult> {
    try {
      const smtpAccount = await this.getSmtpAccountForCategory(category);
      
      if (!smtpAccount) {
        return {
          success: false,
          error: `No SMTP account available for category: ${category}`
        };
      }

      const transporter = this.createTransporter(smtpAccount as unknown as ISmtpSettings);
      
      // Verify connection first
      await transporter.verify();

      const mailOptions = {
        from: emailOptions.from || `"${(smtpAccount as { fromName: string }).fromName}" <${(smtpAccount as { fromEmail: string }).fromEmail}>`,
        to: emailOptions.to,
        subject: emailOptions.subject,
        html: emailOptions.html,
        text: emailOptions.text,
        replyTo: emailOptions.replyTo
      };

      const info = await transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
        accountUsed: {
          name: (smtpAccount as { name: string }).name,
          category: (smtpAccount as { category: EmailCategory }).category,
          fromEmail: (smtpAccount as { fromEmail: string }).fromEmail
        }
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send billing-related emails (payments, balance alerts, invoices)
   */
  public async sendBillingEmail(emailOptions: EmailOptions): Promise<EmailResult> {
    return this.sendEmail('billing', emailOptions);
  }

  /**
   * Send authentication-related emails (signup, login, password reset, OTP)
   */
  public async sendAuthenticationEmail(emailOptions: EmailOptions): Promise<EmailResult> {
    return this.sendEmail('authentication', emailOptions);
  }

  /**
   * Send support-related emails (KPI alerts, system notifications)
   */
  public async sendSupportEmail(emailOptions: EmailOptions): Promise<EmailResult> {
    return this.sendEmail('support', emailOptions);
  }

  /**
   * Send general emails using default SMTP account
   */
  public async sendDefaultEmail(emailOptions: EmailOptions): Promise<EmailResult> {
    return this.sendEmail('default', emailOptions);
  }

  /**
   * Get all available SMTP accounts by category
   */
  public async getAllSmtpAccounts(): Promise<Record<EmailCategory, ISmtpSettings[]>> {
    try {
      await connectToDatabase();
      
      const accounts = await SmtpSettings.find({ enabled: true })
        .select('-password')
        .sort({ category: 1, priority: 1, createdAt: 1 });

      const categorizedAccounts: Record<EmailCategory, ISmtpSettings[]> = {
        billing: [],
        authentication: [],
        support: [],
        default: []
      };

      accounts.forEach(account => {
        categorizedAccounts[account.category].push(account as unknown as ISmtpSettings);
      });

      return categorizedAccounts;
    } catch (error) {
      console.error('Error getting all SMTP accounts:', error);
      return {
        billing: [],
        authentication: [],
        support: [],
        default: []
      };
    }
  }

  /**
   * Test SMTP connection for a specific account
   */
  public async testSmtpAccount(accountId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await connectToDatabase();
      
      const account = await SmtpSettings.findById(accountId).select('+password');
      if (!account) {
        return { success: false, error: 'Account not found' };
      }

      const transporter = this.createTransporter(account as unknown as ISmtpSettings);
      await transporter.verify();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Create nodemailer transporter for an SMTP account
   */
  private createTransporter(account: ISmtpSettings) {
    return nodemailer.createTransport({
      host: account.host,
      port: account.port,
      secure: account.secure,
      auth: account.username && account.password ? {
        user: account.username,
        pass: account.password,
      } : undefined,
      connectionTimeout: 10000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  /**
   * Determine email category based on email type or content
   */
  public static categorizeEmail(emailType: string): EmailCategory {
    const billingTypes = [
      'topup-success', 'payment-confirmation', 'balance-low', 'balance-critical', 
      'payment-failed', 'invoice-generated', 'billing-update', 'subscription-renewal'
    ];
    
    const authTypes = [
      'signup-welcome', 'email-verification', 'forgot-password', 'password-reset', 
      'password-changed', 'otp-code', 'account-activation', 'login-alert', 
      'security-notification', 'account-locked'
    ];
    
    const supportTypes = [
      'kpi-alert', 'system-maintenance', 'performance-report', 'error-notification',
      'usage-report', 'quota-exceeded', 'service-degradation', 'support-ticket'
    ];

    if (billingTypes.includes(emailType.toLowerCase())) {
      return 'billing';
    }
    
    if (authTypes.includes(emailType.toLowerCase())) {
      return 'authentication';
    }
    
    if (supportTypes.includes(emailType.toLowerCase())) {
      return 'support';
    }
    
    return 'default';
  }
}

export default SmtpService; 