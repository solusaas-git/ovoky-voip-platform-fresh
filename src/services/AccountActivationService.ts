import SmtpSettingsModel from '@/models/SmtpSettings';
import BrandingSettings from '@/models/BrandingSettings';
import { connectToDatabase } from '@/lib/db';
import { getEmailBrandingStyles } from '@/lib/brandingUtils';
import { generateAccountActivationTemplate } from '@/lib/emailTemplates';
import { logAndSendEmail } from '@/lib/emailLogger';
import nodemailer from 'nodemailer';

// Interfaces for type safety
interface BrandingData {
  primaryColor: string;
  fontFamily: string;
  companyName: string;
  companySlogan?: string;
  [key: string]: unknown;
}

interface SmtpSettingsData {
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
  fromEmail: string;
  fromName?: string;
  enabled: boolean;
  [key: string]: unknown;
}

export class AccountActivationService {
  private static instance: AccountActivationService;

  public static getInstance(): AccountActivationService {
    if (!AccountActivationService.instance) {
      AccountActivationService.instance = new AccountActivationService();
    }
    return AccountActivationService.instance;
  }

  /**
   * Send account activation email when Sippy Account ID is assigned
   */
  public async sendActivationEmail(
    email: string, 
    name: string, 
    sippyAccountId: number,
    userId?: string
  ): Promise<void> {
    try {
      await connectToDatabase();

      // Get SMTP settings
      const smtpSettings = await SmtpSettingsModel.findOne().select('+password');
      if (!smtpSettings || !smtpSettings.enabled) {
        throw new Error('SMTP not configured or disabled');
      }

      // Get branding settings
      const brandingSettings = await BrandingSettings.getSettings();
      const branding = getEmailBrandingStyles(brandingSettings || {});

      // Create email content
      const emailContent = this.createActivationEmailContent(name, sippyAccountId, branding);

      // Log and send email
      await logAndSendEmail(
        {
          userId: userId || 'system', // Use provided userId or fallback to 'system'
          userEmail: email,
          userName: name,
          sippyAccountId: sippyAccountId,
          notificationType: 'account_activation',
          emailSubject: emailContent.subject,
          emailBody: emailContent.html,
          activationData: {
            sippyAccountId,
            activatedAt: new Date()
          }
        },
        async () => {
          await this.sendEmail(email, name, emailContent, smtpSettings as unknown as SmtpSettingsData);
          return { success: true, fromEmail: (smtpSettings as { fromEmail: string }).fromEmail };
        }
      );

      console.log(`Account activation email sent to ${email}`);
    } catch (error) {
      console.error(`Failed to send activation email to ${email}:`, error);
      throw error;
    }
  }

  /**
   * Create account activation email template
   */
  private createActivationEmailContent(name: string, sippyAccountId: number, branding: BrandingData) {
    // Use centralized template
    return generateAccountActivationTemplate({
      name,
      sippyAccountId,
      branding
    });
  }

  /**
   * Send email using nodemailer
   */
  private async sendEmail(
    email: string, 
    name: string, 
    emailContent: { subject: string; html: string; text: string }, 
    smtpSettings: SmtpSettingsData
  ): Promise<void> {
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

      // Verify connection
      await transporter.verify();

      await transporter.sendMail({
        from: smtpSettings.fromName ? `"${smtpSettings.fromName}" <${smtpSettings.fromEmail}>` : smtpSettings.fromEmail,
        to: email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html
      });

      console.log(`Account activation email sent successfully to ${email}`);
    } catch (error) {
      console.error(`Error sending activation email to ${email}:`, error);
      throw error;
    }
  }
} 