import { NotificationLog, LowBalanceSettings } from '@/models/NotificationLog';
import { ISmtpSettings } from '@/types/smtp';
import UserNotificationSettingsModel, { UserNotificationSettings } from '@/models/UserNotificationSettings';
import SmtpSettingsModel from '@/models/SmtpSettings';
import BrandingSettings from '@/models/BrandingSettings';
import { NotificationLog as NotificationLogModel } from '@/models/NotificationLog';
import User from '@/models/User';
import { connectToDatabase } from '@/lib/db';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClient, AccountInfo } from '@/lib/sippyClient';
import { getEmailBrandingStyles } from '@/lib/brandingUtils';
import { generateBalanceNotificationTemplate } from '@/lib/emailTemplates';
import nodemailer from 'nodemailer';
import SmtpService from '@/services/SmtpService';
import { Types } from 'mongoose';

// Update data interface for notification status updates
interface NotificationUpdateData {
  status: 'sent' | 'failed';
  updatedAt: Date;
  sentAt?: Date;
  errorMessage?: string;
  fromEmail?: string;
}

// This would typically integrate with your user database and Sippy API
interface UserAccount {
  id: string;
  name: string;
  email: string;
  sippyAccountId: number;
  balance: number;
  currency: string;
}

/**
 * Parse XML-RPC response from Sippy API to extract account information
 */
function parseAccountInfoXml(xmlString: string | AccountInfo): AccountInfo | null {
  try {
    if (typeof xmlString !== 'string') {
      // If it's already parsed, return it
      return xmlString as AccountInfo;
    }

    console.log('Parsing XML response, length:', xmlString.length);
    console.log('XML preview:', xmlString.substring(0, 500));

    // Check for fault response first
    const faultRegex = new RegExp('<fault>\\s*<value>\\s*<struct>(.*?)</struct>\\s*</value>\\s*</fault>', 's');
    const faultMatch = xmlString.match(faultRegex);
    if (faultMatch) {
      const faultContent = faultMatch[1];
      const codeMatch = faultContent.match(/<n>faultCode<\/name>\s*<value>\s*<int>(\d+)<\/int>/);
      const messageMatch = faultContent.match(/<n>faultString<\/name>\s*<value>\s*<string>([^<]*)<\/string>/);
      
      const faultCode = codeMatch ? parseInt(codeMatch[1], 10) : 'Unknown';
      const faultMessage = messageMatch ? messageMatch[1] : 'Unknown error';
      
      throw new Error(`Sippy API Fault ${faultCode}: ${faultMessage}`);
    }

    // Look for the main struct containing account data
    const structRegex = new RegExp('<methodResponse>\\s*<params>\\s*<param>\\s*<value>\\s*<struct>(.*?)</struct>\\s*</value>\\s*</param>\\s*</params>\\s*</methodResponse>', 's');
    const structMatch = xmlString.match(structRegex);
    
    if (!structMatch) {
      console.log('No struct found in XML response');
      return null;
    }

    const structContent = structMatch[1];
    const result: Partial<AccountInfo> = {};
    
    // Extract all members from the struct
    const memberRegex = new RegExp('<member>\\s*<n>([^<]+)</n>\\s*<value>\\s*<([^>]+)>([^<]*)</[^>]+>\\s*</value>\\s*</member>', 'g');
    let memberMatch;
    let memberCount = 0;
    
    while ((memberMatch = memberRegex.exec(structContent)) !== null) {
      memberCount++;
      const [, name, type, value] = memberMatch;
      
      let parsedValue: string | number | boolean | null;
      switch (type) {
        case 'int':
          parsedValue = parseInt(value || '0', 10);
          break;
        case 'double':
          parsedValue = parseFloat(value || '0');
          break;
        case 'string':
          parsedValue = value || '';
          break;
        case 'boolean':
          parsedValue = value === '1' || value === 'true';
          break;
        case 'nil':
          parsedValue = null;
          break;
        default:
          parsedValue = value || '';
      }
      
      // Convert field names to match the AccountInfo interface
      const fieldName = name as keyof AccountInfo;
      (result as Record<string, unknown>)[fieldName] = parsedValue;
    }

    console.log(`Parsed ${memberCount} fields from XML response`);
    console.log('Parsed balance field:', result.balance, typeof result.balance);
    
    return result as AccountInfo;
  } catch (error) {
    console.error('Error parsing account info XML:', error);
    return null;
  }
}

export class NotificationService {
  private static instance: NotificationService;
  
  private constructor() {}
  
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Main method to check all user balances and send notifications
   */
  public async checkAndNotifyLowBalances(): Promise<void> {
    try {
      console.log('Starting low balance check...');
      
      // Check if we have any SMTP accounts configured
      const smtpService = SmtpService.getInstance();
      const smtpAccounts = await smtpService.getAllSmtpAccounts();
      
      const hasEnabledAccount = Object.values(smtpAccounts).some(accounts => accounts.length > 0);
      if (!hasEnabledAccount) {
        console.log('No SMTP accounts configured, skipping notifications');
        return;
      }

      // Get all user accounts (this would come from your database)
      const userAccounts = await this.getUserAccounts();
      
      for (const account of userAccounts) {
        // Get individual user notification settings
        const userSettings = await this.getUserNotificationSettings(account.id, account.email);
        if (userSettings) {
          await this.processAccountBalance(account, userSettings);
        } else {
          console.log(`No notification settings found for user ${account.id}, skipping`);
        }
      }
      
      console.log('Low balance check completed');
    } catch (error) {
      console.error('Error in low balance check:', error);
    }
  }

  /**
   * Process a single account's balance and send notifications if needed
   */
  private async processAccountBalance(
    account: UserAccount, 
    settings: UserNotificationSettings
  ): Promise<void> {
    const notifications = this.determineNotificationsNeeded(account, settings);
    
    for (const notification of notifications) {
      // Check if we've already sent this type of notification recently
      const recentNotification = await this.getRecentNotification(
        account.id,
        notification.type,
        settings.notificationFrequencyHours
      );
      
      if (recentNotification) {
        console.log(`Skipping ${notification.type} notification for user ${account.id} - recent notification exists`);
        continue;
      }

      // Create notification log entry
      const notificationLog = await this.createNotificationLog(account, notification);
      
      // Send email using the new SMTP service with billing category
      try {
        const smtpService = SmtpService.getInstance();
        const emailContent = await this.createEmailContent(account, notification.type, notification.threshold);
        
        const result = await smtpService.sendBillingEmail({
          to: account.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        });

        if (result.success) {
          await this.updateNotificationStatus(notificationLog.id, 'sent', new Date(), undefined, result.accountUsed?.fromEmail);
          console.log(`Sent ${notification.type} notification to ${account.email} using ${result.accountUsed?.name} (${result.accountUsed?.category})`);
        } else {
          await this.updateNotificationStatus(
            notificationLog.id, 
            'failed', 
            undefined, 
            result.error || 'Unknown error',
            result.accountUsed?.fromEmail
          );
          console.error(`Failed to send ${notification.type} notification to ${account.email}: ${result.error}`);
        }
      } catch (error) {
        await this.updateNotificationStatus(
          notificationLog.id, 
          'failed', 
          undefined, 
          error instanceof Error ? error.message : 'Unknown error',
          undefined
        );
        console.error(`Failed to send ${notification.type} notification to ${account.email}:`, error);
      }
    }
  }

  /**
   * Determine what notifications are needed for an account
   */
  private determineNotificationsNeeded(
    account: UserAccount, 
    settings: UserNotificationSettings
  ): Array<{ type: 'low_balance' | 'zero_balance' | 'negative_balance', threshold: number }> {
    const notifications = [];

    // Check negative balance first (most critical)
    if (settings.enableNegativeBalanceNotifications && 
        account.balance <= settings.negativeBalanceThreshold) {
      notifications.push({ 
        type: 'negative_balance' as const, 
        threshold: settings.negativeBalanceThreshold 
      });
    }
    // Check zero balance
    else if (settings.enableZeroBalanceNotifications && 
             account.balance <= settings.zeroBalanceThreshold) {
      notifications.push({ 
        type: 'zero_balance' as const, 
        threshold: settings.zeroBalanceThreshold 
      });
    }
    // Check low balance
    else if (settings.enableLowBalanceNotifications && 
             account.balance <= settings.lowBalanceThreshold) {
      notifications.push({ 
        type: 'low_balance' as const, 
        threshold: settings.lowBalanceThreshold 
      });
    }

    return notifications;
  }

  /**
   * Create email content based on notification type
   */
  public async createEmailContent(account: UserAccount, notificationType: string, threshold: number): Promise<{ subject: string; html: string; text: string }> {
    // Get branding settings
    const brandingSettings = await BrandingSettings.getSettings();
    const branding = getEmailBrandingStyles(brandingSettings || {});

    // Use centralized template
    const emailContent = generateBalanceNotificationTemplate({
      account,
      threshold,
      notificationType: notificationType as 'low_balance' | 'zero_balance' | 'negative_balance',
      branding
    });

    return emailContent;
  }

  /**
   * Real implementation methods - replacing the mock ones
   */
  private async getLowBalanceSettings(): Promise<LowBalanceSettings | null> {
    try {
      await connectToDatabase();
      const settings = await LowBalanceSettings.findOne();
      if (!settings) return null;
      
      return {
        id: (settings._id as Types.ObjectId).toString(),
        lowBalanceThreshold: settings.lowBalanceThreshold,
        zeroBalanceThreshold: settings.zeroBalanceThreshold,
        negativeBalanceThreshold: settings.negativeBalanceThreshold,
        enableLowBalanceNotifications: settings.enableLowBalanceNotifications,
        enableZeroBalanceNotifications: settings.enableZeroBalanceNotifications,
        enableNegativeBalanceNotifications: settings.enableNegativeBalanceNotifications,
        notificationFrequencyHours: settings.notificationFrequencyHours,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt
      };
    } catch (error) {
      console.error('Error fetching low balance settings:', error);
      return null;
    }
  }

  private async getSmtpSettings(): Promise<ISmtpSettings | null> {
    try {
      await connectToDatabase();
      const settings = await SmtpSettingsModel.findOne().select('+password');
      return settings ? settings.toObject() as ISmtpSettings : null;
    } catch (error) {
      console.error('Error fetching SMTP settings:', error);
      return null;
    }
  }

  private async getUserAccounts(): Promise<UserAccount[]> {
    try {
      await connectToDatabase();
      
      // Get all users with Sippy account IDs (filter out undefined/null values)
      const users = await User.find({ 
        sippyAccountId: { $exists: true, $ne: null, $type: 'number' } 
      });
      
      if (users.length === 0) {
        return [];
      }

      // Get Sippy API credentials
      const credentials = await getSippyApiCredentials();
      if (!credentials) {
        return [];
      }

      const sippyClient = new SippyClient(credentials);
      const accounts: UserAccount[] = [];

      // Fetch balance for each user
      for (const user of users) {
        // Type guard: skip users without sippyAccountId
        if (!user.sippyAccountId) {
          continue;
        }

        try {
          const rawResponse = await sippyClient.getAccountInfo({ 
            i_account: user.sippyAccountId 
          });
          
          // Parse the XML response to get account info
          const accountInfo = parseAccountInfoXml(rawResponse);
          
          if (!accountInfo) {
            console.error(`Failed to parse account info for user ${user.email}`);
            continue;
          }
          
          // Sippy API returns inverted balance values (negative for positive, positive for negative)
          // According to documentation: "For historical reasons the function returns negative number for positive balance and positive number for the negative balance"
          const rawBalance = accountInfo.balance || 0;
          const actualBalance = -rawBalance; // Invert the balance to get the correct value
          
          const userAccount = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            sippyAccountId: user.sippyAccountId,
            balance: actualBalance,
            currency: accountInfo.payment_currency || 'EUR'
          };
          
          accounts.push(userAccount);
          
        } catch (error) {
          console.error(`Error fetching balance for user ${user.email} (Account ID: ${user.sippyAccountId}):`, error);
          // Continue with other users
        }
      }

      return accounts;
    } catch (error) {
      console.error('Error fetching user accounts:', error);
      return [];
    }
  }

  private async getRecentNotification(
    userId: string, 
    type: string, 
    hoursBack: number
  ): Promise<NotificationLog | null> {
    try {
      await connectToDatabase();
      
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hoursBack);
      
      const recentNotification = await NotificationLogModel.findOne({
        userId: userId,
        notificationType: type,
        createdAt: { $gte: cutoffDate }
      }).sort({ createdAt: -1 });

      if (!recentNotification) return null;

      return {
        id: (recentNotification._id as Types.ObjectId).toString(),
        userId: recentNotification.userId,
        userEmail: recentNotification.userEmail,
        userName: recentNotification.userName,
        sippyAccountId: recentNotification.sippyAccountId,
        notificationType: recentNotification.notificationType,
        balanceAmount: recentNotification.balanceAmount,
        thresholdAmount: recentNotification.thresholdAmount,
        currency: recentNotification.currency,
        status: recentNotification.status,
        errorMessage: recentNotification.errorMessage,
        emailSubject: recentNotification.emailSubject,
        emailBody: recentNotification.emailBody,
        sentAt: recentNotification.sentAt,
        createdAt: recentNotification.createdAt,
        updatedAt: recentNotification.updatedAt
      };
    } catch (error) {
      console.error('Error checking for recent notifications:', error);
      return null;
    }
  }

  private async createNotificationLog(
    account: UserAccount, 
    notification: { type: string, threshold: number }
  ): Promise<NotificationLog> {
    try {
      await connectToDatabase();
      
      const emailContent = await this.createEmailContent(account, notification.type, notification.threshold);

      const log = await NotificationLogModel.create({
        userId: account.id,
        userEmail: account.email,
        userName: account.name,
        sippyAccountId: account.sippyAccountId,
        notificationType: notification.type,
        balanceAmount: account.balance,
        thresholdAmount: notification.threshold,
        currency: account.currency,
        status: 'pending',
        emailSubject: emailContent.subject,
        emailBody: emailContent.html
      });

      return {
        id: (log._id as Types.ObjectId).toString(),
        userId: log.userId,
        userEmail: log.userEmail,
        userName: log.userName,
        sippyAccountId: log.sippyAccountId,
        notificationType: log.notificationType,
        balanceAmount: log.balanceAmount,
        thresholdAmount: log.thresholdAmount,
        currency: log.currency,
        status: log.status,
        errorMessage: log.errorMessage,
        emailSubject: log.emailSubject,
        emailBody: log.emailBody,
        sentAt: log.sentAt,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt
      };
    } catch (error) {
      console.error('Error creating notification log:', error);
      throw error;
    }
  }

  private async sendEmail(log: NotificationLog, smtpSettings: ISmtpSettings): Promise<void> {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpSettings.host,
        port: smtpSettings.port,
        secure: smtpSettings.secure,
        auth: smtpSettings.username && smtpSettings.password ? {
          user: smtpSettings.username,
          pass: smtpSettings.password,
        } : undefined,
        connectionTimeout: 10000,
        socketTimeout: 10000,
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection before sending
      await transporter.verify();

      // Generate plain text version for accessibility
      const textVersion = (log.emailBody || '')
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      await transporter.sendMail({
        from: smtpSettings.fromName ? `"${smtpSettings.fromName}" <${smtpSettings.fromEmail}>` : smtpSettings.fromEmail,
        to: log.userEmail,
        subject: log.emailSubject,
        text: textVersion, // Plain text version
        html: log.emailBody // Rich HTML version with inlined CSS
      });

    } catch (error) {
      console.error(`Error sending email to ${log.userEmail}:`, error);
      throw error;
    }
  }

  private async updateNotificationStatus(
    logId: string, 
    status: 'sent' | 'failed', 
    sentAt?: Date, 
    errorMessage?: string,
    fromEmail?: string
  ): Promise<void> {
    try {
      await connectToDatabase();
      
      const updateData: NotificationUpdateData = { status, updatedAt: new Date() };
      if (sentAt) updateData.sentAt = sentAt;
      if (errorMessage) updateData.errorMessage = errorMessage;
      if (fromEmail) updateData.fromEmail = fromEmail;

      await NotificationLogModel.findByIdAndUpdate(logId, updateData);
    } catch (error) {
      console.error(`Error updating notification status for ${logId}:`, error);
    }
  }

  private async getUserNotificationSettings(userId: string, email: string): Promise<UserNotificationSettings | null> {
    try {
      // Try to get existing settings
      let settings = await UserNotificationSettingsModel.findOne({ userId });
      
      if (!settings) {
        // Create default settings for user
        console.log(`Creating default notification settings for user ${userId}`);
        settings = await UserNotificationSettingsModel.create({
          userId: userId,
          userEmail: email,
          lowBalanceThreshold: 10.0000,
          zeroBalanceThreshold: 0.0000,
          negativeBalanceThreshold: -0.0001, // Any balance below -0.0001 (i.e., any significant negative balance)
          enableLowBalanceNotifications: true,
          enableZeroBalanceNotifications: true,
          enableNegativeBalanceNotifications: true,
          notificationFrequencyHours: 24,
          currency: 'EUR'
        });
      }
      
      return settings;
    } catch (error) {
      console.error(`Error fetching notification settings for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Resend a specific notification by log ID with fresh balance data
   */
  public async resendNotification(logId: string): Promise<void> {
    try {
      await connectToDatabase();
      
      // Get the notification log
      const log = await NotificationLogModel.findById(logId);
      if (!log) {
        throw new Error('Notification log not found');
      }

      // Get SMTP settings
      const smtpSettings = await this.getSmtpSettings();
      if (!smtpSettings || !smtpSettings.enabled) {
        throw new Error('SMTP not configured or disabled');
      }

      // Get current balance from Sippy API for fresh data
      const credentials = await getSippyApiCredentials();
      if (!credentials) {
        throw new Error('Sippy API credentials not configured');
      }

      const sippyClient = new SippyClient(credentials);
      let currentBalance = log.balanceAmount; // fallback to original balance
      
      try {
        const rawResponse = await sippyClient.getAccountInfo({ 
          i_account: log.sippyAccountId || 0 // Provide default value
        });
        const accountInfo = parseAccountInfoXml(rawResponse);
        if (accountInfo && accountInfo.balance !== undefined) {
          // Sippy API returns inverted balance values
          currentBalance = -accountInfo.balance;
        }
      } catch (error) {
        console.warn(`Failed to fetch current balance for account ${log.sippyAccountId}, using original balance:`, error);
      }

      // Create fresh user account object with current balance
      const userAccount: UserAccount = {
        id: log.userId,
        name: log.userName,
        email: log.userEmail,
        sippyAccountId: log.sippyAccountId || 0, // Provide default value
        balance: currentBalance || 0, // Provide default value
        currency: log.currency || 'EUR' // Provide default value
      };

      // Generate fresh email content with current balance and resend indicator
      const emailContent = await this.createEmailContent(userAccount, log.notificationType, log.thresholdAmount || 0);
      
      // Add [RESEND] prefix to subject line
      const resendSubject = `[RESEND] ${emailContent.subject}`;

      // Validate that we have the required emailBody before attempting to save
      if (!emailContent.html || typeof emailContent.html !== 'string' || emailContent.html.trim() === '') {
        throw new Error('Generated email content is invalid - no HTML body');
      }

      // Create new notification log for the resend with current data
      const resendLog = await NotificationLogModel.create({
        userId: log.userId,
        userEmail: log.userEmail,
        userName: log.userName,
        sippyAccountId: log.sippyAccountId,
        notificationType: log.notificationType,
        balanceAmount: currentBalance, // Use current balance
        thresholdAmount: log.thresholdAmount,
        currency: log.currency,
        status: 'pending',
        emailSubject: resendSubject,
        emailBody: emailContent.html
      });

      const resendNotificationLog: NotificationLog = {
        id: (resendLog._id as Types.ObjectId).toString(),
        userId: resendLog.userId,
        userEmail: resendLog.userEmail,
        userName: resendLog.userName,
        sippyAccountId: resendLog.sippyAccountId,
        notificationType: resendLog.notificationType,
        balanceAmount: resendLog.balanceAmount,
        thresholdAmount: resendLog.thresholdAmount,
        currency: resendLog.currency,
        status: resendLog.status,
        errorMessage: resendLog.errorMessage,
        emailSubject: resendLog.emailSubject,
        emailBody: resendLog.emailBody,
        sentAt: resendLog.sentAt,
        createdAt: resendLog.createdAt,
        updatedAt: resendLog.updatedAt
      };

      // Send the email with fresh content
      await this.sendEmail(resendNotificationLog, smtpSettings);
      await this.updateNotificationStatus((resendLog._id as Types.ObjectId).toString(), 'sent', new Date(), undefined, resendLog.fromEmail);
      
    } catch (error) {
      console.error(`Failed to resend notification ${logId}:`, error);
      throw error;
    }
  }
}

// Usage example:
// const notificationService = NotificationService.getInstance();
// await notificationService.checkAndNotifyLowBalances(); 