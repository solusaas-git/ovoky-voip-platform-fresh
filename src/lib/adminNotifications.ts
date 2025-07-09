import User from '@/models/User';
import BrandingSettings from '@/models/BrandingSettings';
import { logAndSendEmail } from '@/lib/emailLogger';
import SmtpService from '@/services/SmtpService';
import {
  generateAdminUserPurchaseNotificationTemplate,
  generateAdminBackorderRequestNotificationTemplate,
  generateAdminCancellationRequestNotificationTemplate,
  AdminUserPurchaseNotificationData,
  AdminBackorderRequestNotificationData,
  AdminCancellationRequestNotificationData
} from '@/lib/emailTemplates/phoneNumberNotifications';
import {
  generateAdminUserRegistrationTemplate,
  AdminUserRegistrationData
} from '@/lib/emailTemplates/adminNotifications';

/**
 * Get admin email addresses who should receive notifications
 */
export async function getAdminEmails(): Promise<string[]> {
  try {
    const adminUsers = await User.find({ role: 'admin' }).select('email').lean();
    return adminUsers.map(admin => admin.email);
  } catch (error) {
    console.error('Error fetching admin emails:', error);
    return [];
  }
}

/**
 * Get branding settings for email templates
 */
async function getBrandingSettings() {
  try {
    const brandingSettings = await BrandingSettings.findOne();
    return {
      companyName: brandingSettings?.companyName || 'Your VoIP Company',
      companySlogan: brandingSettings?.companySlogan || 'Connecting the world',
      primaryColor: brandingSettings?.primaryColor || '#3b82f6',
      fontFamily: brandingSettings?.fontFamily || 'Inter'
    };
  } catch (error) {
    console.error('Error fetching branding settings:', error);
    return {
      companyName: 'Your VoIP Company',
      companySlogan: 'Connecting the world',
      primaryColor: '#3b82f6',
      fontFamily: 'Inter'
    };
  }
}

/**
 * Send admin notification when user purchases phone numbers
 */
export async function sendAdminUserPurchaseNotification(data: {
  phoneNumber: {
    number: string;
    country: string;
    numberType: string;
    monthlyRate: number;
    setupFee?: number;
    currency: string;
    capabilities: string[];
  };
  user: {
    name: string;
    email: string;
    company?: string;
  };
  purchase: {
    purchaseId: string;
    purchaseDate: string;
    totalAmount: number;
    billingStartDate: string;
    nextBillingDate: string;
  };
  purchaseType: 'direct' | 'bulk';
  numbersCount?: number;
  purchasedNumbers?: Array<{
    number: string;
    country: string;
    numberType: string;
    monthlyRate: number;
    setupFee?: number;
    capabilities: string[];
  }>;
}): Promise<void> {
  try {
    const adminUsers = await User.find({ role: 'admin' }).select('email _id name').lean();
    if (adminUsers.length === 0) {
      console.log('No admin users found for purchase notification');
      return;
    }

    const branding = await getBrandingSettings();

    // Send notification to each admin
    for (const adminUser of adminUsers) {
      const notificationData: AdminUserPurchaseNotificationData = {
        ...data,
        branding,
        adminEmail: adminUser.email
      };

      const emailTemplate = generateAdminUserPurchaseNotificationTemplate(notificationData);

      // Send the email using logAndSendEmail
      await logAndSendEmail(
        {
          userId: adminUser._id.toString(), // Use actual admin user's ObjectId
          userEmail: adminUser.email,
          userName: adminUser.name || 'Admin',
          notificationType: data.purchaseType === 'bulk' ? 'admin_user_purchase_bulk' : 'admin_user_purchase_single',
          emailSubject: emailTemplate.subject,
          emailBody: emailTemplate.html
        },
        async () => {
          const smtpService = SmtpService.getInstance();
          return await smtpService.sendSupportEmail({
            to: adminUser.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
          }) as any;
        }
      );
    }

    console.log(`📧 Admin purchase notifications sent to ${adminUsers.length} admins for user ${data.user.email}`);
  } catch (error) {
    console.error('Failed to send admin purchase notification:', error);
    // Don't fail the purchase if admin email fails
  }
}

/**
 * Send admin notification when user submits backorder request
 */
export async function sendAdminBackorderRequestNotification(data: {
  phoneNumber: {
    number: string;
    country: string;
    numberType: string;
    monthlyRate: number;
    setupFee?: number;
    currency: string;
    capabilities: string[];
  };
  user: {
    name: string;
    email: string;
    company?: string;
  };
  request: {
    requestNumber: string;
    submittedAt: string;
    reason?: string;
    businessJustification?: string;
  };
  requestType?: 'single' | 'bulk';
  numbersCount?: number;
}): Promise<void> {
  try {
    const adminUsers = await User.find({ role: 'admin' }).select('email _id name').lean();
    if (adminUsers.length === 0) {
      console.log('No admin users found for backorder request notification');
      return;
    }

    const branding = await getBrandingSettings();

    // Send notification to each admin
    for (const adminUser of adminUsers) {
      const notificationData: AdminBackorderRequestNotificationData = {
        ...data,
        branding,
        adminEmail: adminUser.email
      };

      const emailTemplate = generateAdminBackorderRequestNotificationTemplate(notificationData);

      // Send the email using logAndSendEmail
      await logAndSendEmail(
        {
          userId: adminUser._id.toString(), // Use actual admin user's ObjectId
          userEmail: adminUser.email,
          userName: adminUser.name || 'Admin',
          notificationType: 'admin_backorder_request',
          emailSubject: emailTemplate.subject,
          emailBody: emailTemplate.html
        },
        async () => {
          const smtpService = SmtpService.getInstance();
          return await smtpService.sendSupportEmail({
            to: adminUser.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
          }) as any;
        }
      );
    }

    console.log(`📧 Admin backorder request notifications sent to ${adminUsers.length} admins for request ${data.request.requestNumber}`);
  } catch (error) {
    console.error('Failed to send admin backorder request notification:', error);
    // Don't fail the request if admin email fails
  }
}

/**
 * Send admin notification when user submits cancellation request
 */
export async function sendAdminCancellationRequestNotification(data: {
  phoneNumber: {
    number: string;
    country: string;
    numberType: string;
    monthlyRate: number;
    setupFee?: number;
    currency: string;
    capabilities: string[];
  };
  user: {
    name: string;
    email: string;
    company?: string;
  };
  request: {
    requestId: string;
    submittedAt: string;
    reason?: string;
    businessJustification?: string;
  };
}): Promise<void> {
  try {
    const adminUsers = await User.find({ role: 'admin' }).select('email _id name').lean();
    if (adminUsers.length === 0) {
      console.log('No admin users found for cancellation request notification');
      return;
    }

    const branding = await getBrandingSettings();

    // Send notification to each admin
    for (const adminUser of adminUsers) {
      const notificationData: AdminCancellationRequestNotificationData = {
        ...data,
        branding,
        adminEmail: adminUser.email
      };

      const emailTemplate = generateAdminCancellationRequestNotificationTemplate(notificationData);

      // Send the email using logAndSendEmail
      await logAndSendEmail(
        {
          userId: adminUser._id.toString(), // Use actual admin user's ObjectId
          userEmail: adminUser.email,
          userName: adminUser.name || 'Admin',
          notificationType: 'admin_cancellation_request',
          emailSubject: emailTemplate.subject,
          emailBody: emailTemplate.html
        },
        async () => {
          const smtpService = SmtpService.getInstance();
          return await smtpService.sendSupportEmail({
            to: adminUser.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
          }) as any;
        }
      );
    }

    console.log(`📧 Admin cancellation request notifications sent to ${adminUsers.length} admins for request ${data.request.requestId}`);
  } catch (error) {
    console.error('Failed to send admin cancellation request notification:', error);
    // Don't fail the request if admin email fails
  }
}

/**
 * Send admin notification when a new user registers
 */
export async function sendAdminUserRegistrationNotification(data: {
  user: {
    name: string;
    email: string;
    registrationDate: string;
    ipAddress?: string;
  };
}): Promise<void> {
  try {
    const adminUsers = await User.find({ role: 'admin' }).select('email _id name').lean();
    if (adminUsers.length === 0) {
      console.log('No admin users found for user registration notification');
      return;
    }

    const branding = await getBrandingSettings();

    // Send notification to each admin
    for (const adminUser of adminUsers) {
      const notificationData: AdminUserRegistrationData = {
        ...data,
        branding,
        adminEmail: adminUser.email
      };

      const emailTemplate = generateAdminUserRegistrationTemplate(notificationData);

      // Send the email using logAndSendEmail with the actual admin user's ObjectId
      await logAndSendEmail(
        {
          userId: adminUser._id.toString(), // Use actual admin user's ObjectId
          userEmail: adminUser.email,
          userName: adminUser.name || 'Admin',
          notificationType: 'admin_user_registration',
          emailSubject: emailTemplate.subject,
          emailBody: emailTemplate.html
        },
        async () => {
          const smtpService = SmtpService.getInstance();
          return await smtpService.sendSupportEmail({
            to: adminUser.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
          }) as any;
        }
      );
    }

    console.log(`📧 Admin registration notifications sent to ${adminUsers.length} admins for new user ${data.user.email}`);
  } catch (error) {
    console.error('Failed to send admin registration notification:', error);
    // Don't fail the registration if admin email fails
  }
} 