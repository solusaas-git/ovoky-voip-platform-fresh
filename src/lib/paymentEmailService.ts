import { generatePaymentSuccessTemplate, PaymentSuccessData } from '@/lib/emailTemplates';
import { sendEmail } from '@/lib/emailService';
import { logAndSendEmail } from '@/lib/emailLogger';
import User from '@/models/User';
import BrandingSettings from '@/models/BrandingSettings';
import SmtpService from '@/services/SmtpService';

export interface PaymentEmailData {
  userId: string;
  paymentAmount: number;
  currency: string;
  paymentType: 'gateway_payment' | 'admin_credit' | 'admin_debit';
  paymentMethod?: string;
  transactionId?: string;
  fees?: {
    processingFee?: number;
    fixedFee?: number;
  };
  gateway?: string;
  notes?: string;
  processedBy?: string; // Admin name for admin credits
  currentBalance?: number; // Updated balance after payment
}

export async function sendPaymentSuccessEmail(data: PaymentEmailData): Promise<boolean> {
  try {
    // Get user details
    const user = await User.findById(data.userId);
    if (!user) {
      console.error('User not found for payment notification:', data.userId);
      return false;
    }

    // Get branding settings
    const brandingSettings = await BrandingSettings.findOne({});
    if (!brandingSettings) {
      console.error('Branding settings not found');
      return false;
    }

    // Prepare email template data
    const templateData: PaymentSuccessData = {
      account: {
        name: user.name,
        email: user.email,
        sippyAccountId: user.sippyAccountId || 0,
        balance: data.currentBalance,
        currency: data.currency,
      },
      payment: {
        amount: data.paymentAmount,
        currency: data.currency,
        paymentMethod: data.paymentMethod,
        transactionId: data.transactionId,
        fees: data.fees,
        gateway: data.gateway,
        notes: data.notes,
      },
      paymentType: data.paymentType,
      processedBy: data.processedBy,
      branding: {
        companyName: brandingSettings.companyName,
        companySlogan: brandingSettings.companySlogan,
        primaryColor: brandingSettings.primaryColor,
        fontFamily: brandingSettings.fontFamily || 'Arial, sans-serif',
      },
    };

    // Generate email content
    const emailContent = generatePaymentSuccessTemplate(templateData);

    // Determine notification type
    const notificationType: 'payment_success_gateway' | 'payment_success_admin' = data.paymentType === 'gateway_payment' 
      ? 'payment_success_gateway' 
      : data.paymentType === 'admin_credit' ? 'payment_success_admin' : 'payment_success_admin';

    // Send email using logAndSendEmail for proper logging
    const emailLogResult = await logAndSendEmail(
      {
        userId: data.userId,
        userEmail: user.email,
        userName: user.name,
        sippyAccountId: user.sippyAccountId,
        notificationType,
        emailSubject: emailContent.subject,
        emailBody: emailContent.html,
        paymentData: {
          amount: data.paymentAmount,
          currency: data.currency,
          paymentMethod: data.paymentMethod || 'Unknown',
          transactionId: data.transactionId,
          fees: data.fees,
          gateway: data.gateway,
          notes: data.notes,
          processedBy: data.processedBy
        }
      },
      async () => {
        const smtpService = SmtpService.getInstance();
        const result = await smtpService.sendBillingEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        });
        
        if (!result.success) {
          throw new Error(`Failed to send payment notification: ${result.error}`);
        }
        
        return result as any;
      }
    );

    if (emailLogResult) {
      console.log(`✅ Payment success email sent to ${user.email} for ${data.paymentType}`);
      return true;
    } else {
      console.error(`❌ Failed to send payment success email to ${user.email}`);
      return false;
    }
  } catch (error) {
    console.error('Error sending payment success email:', error);
    return false;
  }
}

export async function sendGatewayPaymentSuccessEmail(params: {
  userId: string;
  amount: number;
  currency: string;
  paymentMethod?: string;
  transactionId?: string;
  fees?: {
    processingFee?: number;
    fixedFee?: number;
  };
  gateway?: string;
  currentBalance?: number;
}): Promise<boolean> {
  return sendPaymentSuccessEmail({
    ...params,
    paymentAmount: params.amount,
    paymentType: 'gateway_payment',
  });
}

export async function sendAdminCreditSuccessEmail(params: {
  userId: string;
  amount: number;
  currency: string;
  processedBy: string;
  notes?: string;
  currentBalance?: number;
}): Promise<boolean> {
  return sendPaymentSuccessEmail({
    ...params,
    paymentAmount: params.amount,
    paymentType: 'admin_credit',
    paymentMethod: 'Admin Credit',
  });
}

export async function sendAdminDebitNotificationEmail(params: {
  userId: string;
  amount: number;
  currency: string;
  processedBy: string;
  notes?: string;
  currentBalance?: number;
}): Promise<boolean> {
  // For debit operations, use the admin_debit payment type
  return sendPaymentSuccessEmail({
    ...params,
    paymentAmount: params.amount, // Keep positive amount, template will handle display
    paymentType: 'admin_debit', // Use new admin_debit type
    paymentMethod: 'Admin Debit',
  });
} 