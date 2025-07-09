import EmailVerification from '@/models/EmailVerification';
import BrandingSettings from '@/models/BrandingSettings';
import { connectToDatabase } from '@/lib/db';
import { generateEmailVerificationTemplate } from '@/lib/emailTemplates';
import { getEmailBrandingStyles } from '@/lib/brandingUtils';
import { logAndSendEmail } from '@/lib/emailLogger';
import SmtpService from '@/services/SmtpService';

export class EmailVerificationService {
  private static instance: EmailVerificationService;

  public static getInstance(): EmailVerificationService {
    if (!EmailVerificationService.instance) {
      EmailVerificationService.instance = new EmailVerificationService();
    }
    return EmailVerificationService.instance;
  }

  /**
   * Send OTP verification email to user
   */
  public async sendVerificationEmail(email: string, name: string, userId?: string): Promise<void> {
    try {
      await connectToDatabase();

      // Check if authentication SMTP is available
      const smtpService = SmtpService.getInstance();
      const authAccount = await smtpService.getSmtpAccountForCategory('authentication');
      
      if (!authAccount) {
        throw new Error('No authentication SMTP account configured');
      }

      // Generate OTP
      const verification = await EmailVerification.createOTP(email);

      // Create email content
      const emailContent = await this.createVerificationEmailContent(name, verification.otpCode);

      // Log and send email using the new SMTP service
      await logAndSendEmail(
        {
          userId: userId || 'system', // Use provided userId or fallback to 'system'
          userEmail: email,
          userName: name,
          notificationType: 'email_verification',
          emailSubject: emailContent.subject,
          emailBody: emailContent.html,
          otpCode: verification.otpCode
        },
        async () => {
          const result = await smtpService.sendAuthenticationEmail({
            to: email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text
          });

          if (!result.success) {
            throw new Error(`Failed to send email: ${result.error}`);
          }

          console.log(`Verification email sent successfully to ${email} using ${result.accountUsed?.name} (${result.accountUsed?.category})`);
          return result as any;
        }
      );

      console.log(`Verification email sent to ${email}`);
    } catch (error) {
      console.error(`Failed to send verification email to ${email}:`, error);
      throw error;
    }
  }

  /**
   * Verify OTP code
   */
  public async verifyOTP(email: string, otpCode: string): Promise<{ isValid: boolean; message: string }> {
    try {
      await connectToDatabase();
      return await EmailVerification.verifyOTP(email, otpCode);
    } catch (error) {
      console.error(`Error verifying OTP for ${email}:`, error);
      throw error;
    }
  }

  /**
   * Resend verification email
   */
  public async resendVerificationEmail(email: string, name: string, userId?: string): Promise<void> {
    try {
      await connectToDatabase();

      // Check if there's a recent verification attempt (rate limiting)
      const recentVerification = await EmailVerification.findOne({
        email,
        createdAt: { $gt: new Date(Date.now() - 60000) } // Last 1 minute
      });

      if (recentVerification) {
        throw new Error('Please wait a moment before requesting another verification code');
      }

      // Send new verification email
      await this.sendVerificationEmail(email, name, userId);
    } catch (error) {
      console.error(`Failed to resend verification email to ${email}:`, error);
      throw error;
    }
  }

  /**
   * Create sophisticated email verification template
   */
  private async createVerificationEmailContent(name: string, otpCode: string) {
    // Get branding settings
    const brandingSettings = await BrandingSettings.getSettings();
    const branding = getEmailBrandingStyles(brandingSettings || {});

    // Use centralized template
    return generateEmailVerificationTemplate({
      name,
      otpCode,
      branding
    });
  }

  /**
   * Cleanup expired verification records
   */
  public async cleanupExpiredVerifications(): Promise<void> {
    try {
      await connectToDatabase();
      await EmailVerification.cleanupExpired();
      console.log('Cleaned up expired email verifications');
    } catch (error) {
      console.error('Error cleaning up expired verifications:', error);
    }
  }
} 