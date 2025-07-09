import { connectToDatabase } from '@/lib/db';
import { NotificationLog as NotificationLogModel } from '@/models/NotificationLog';

// Interfaces for type safety
interface ActivationData {
  activationCode?: string;
  expiresAt?: Date;
  [key: string]: unknown;
}

interface AlertData {
  alertType: string;
  value: number;
  threshold: number;
  period?: string;
  [key: string]: unknown;
}

interface EmailMetadata {
  resetToken?: string;
  expiresAt?: Date;
  template?: string;
  [key: string]: unknown;
}

interface UpdateData {
  status: string;
  sentAt?: Date;
  fromEmail?: string;
  errorMessage?: string;
}

interface EmailResult {
  success?: boolean;
  accountUsed?: {
    fromEmail: string;
  };
  fromEmail?: string;
  [key: string]: unknown;
}

export interface EmailLogData {
  userId: string;
  userEmail: string;
  userName: string;
  sippyAccountId?: number;
  notificationType: 'low_balance' | 'zero_balance' | 'negative_balance' | 'email_verification' | 'account_activation' | 'high_cost_alert' | 'low_asr_alert' | 'extreme_usage_alert' | 'payment_success_gateway' | 'payment_success_admin' | 'payment_debit_admin' | 'password_reset' | 'number_purchase_single' | 'number_purchase_bulk' | 'number_assignment' | 'number_unassignment' | 'backorder_approved' | 'backorder_rejected' | 'cancellation_approved' | 'cancellation_rejected' | 'admin_user_purchase_single' | 'admin_user_purchase_bulk' | 'admin_backorder_request' | 'admin_cancellation_request' | 'admin_user_registration';
  emailSubject: string;
  emailBody: string;
  
  // Optional fields based on notification type
  balanceAmount?: number;
  thresholdAmount?: number;
  currency?: string;
  otpCode?: string;
  activationData?: ActivationData;
  alertData?: AlertData;
  paymentData?: {
    amount: number;
    currency: string;
    paymentMethod?: string;
    transactionId?: string;
    fees?: {
      processingFee?: number;
      fixedFee?: number;
    };
    gateway?: string;
    notes?: string;
    processedBy?: string;
  };
  metadata?: EmailMetadata; // Add metadata field for password reset and other flexible data
}

export interface EmailLogResponse {
  logId: string;
  success: boolean;
  error?: string;
}

/**
 * Create a notification log entry for an email that is about to be sent
 */
export async function createEmailLog(data: EmailLogData): Promise<EmailLogResponse> {
  try {
    await connectToDatabase();
    
    const logEntry = new NotificationLogModel({
      userId: data.userId,
      userEmail: data.userEmail,
      userName: data.userName,
      sippyAccountId: data.sippyAccountId,
      notificationType: data.notificationType,
      emailSubject: data.emailSubject,
      emailBody: data.emailBody,
      status: 'pending',
      
      // Optional fields
      ...(data.balanceAmount !== undefined && { balanceAmount: data.balanceAmount }),
      ...(data.thresholdAmount !== undefined && { thresholdAmount: data.thresholdAmount }),
      ...(data.currency && { currency: data.currency }),
      ...(data.otpCode && { otpCode: data.otpCode }),
      ...(data.activationData && { activationData: data.activationData }),
      ...(data.alertData && { alertData: data.alertData }),
      ...(data.paymentData && { paymentData: data.paymentData }),
    });
    
    const savedLog = await logEntry.save();
    
    return {
      logId: (savedLog._id as { toString(): string }).toString(),
      success: true
    };
  } catch (error) {
    console.error('Error creating email log:', error);
    return {
      logId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update a notification log entry when email is successfully sent
 */
export async function markEmailAsSent(logId: string, fromEmail?: string): Promise<boolean> {
  try {
    await connectToDatabase();
    
    const updateData: UpdateData = {
      status: 'sent',
      sentAt: new Date()
    };
    
    if (fromEmail) {
      updateData.fromEmail = fromEmail;
    }
    
    await NotificationLogModel.findByIdAndUpdate(logId, updateData);
    
    return true;
  } catch (error) {
    console.error('Error marking email as sent:', error);
    return false;
  }
}

/**
 * Update a notification log entry when email fails to send
 */
export async function markEmailAsFailed(logId: string, errorMessage: string): Promise<boolean> {
  try {
    await connectToDatabase();
    
    await NotificationLogModel.findByIdAndUpdate(logId, {
      status: 'failed',
      errorMessage: errorMessage
    });
    
    return true;
  } catch (error) {
    console.error('Error marking email as failed:', error);
    return false;
  }
}

/**
 * Log and send email in one operation with automatic status tracking
 */
export async function logAndSendEmail(
  data: EmailLogData, 
  sendEmailFunction: () => Promise<EmailResult>
): Promise<boolean> {
  const logResult = await createEmailLog(data);
  
  if (!logResult.success) {
    console.error('Failed to create email log:', logResult.error);
    return false;
  }
  
  try {
    const emailResult = await sendEmailFunction();
    
    // Extract fromEmail from the email service response
    let fromEmail: string | undefined;
    if (emailResult && typeof emailResult === 'object') {
      // Check if it's an SMTP service response with accountUsed
      if (emailResult.accountUsed && emailResult.accountUsed.fromEmail) {
        fromEmail = emailResult.accountUsed.fromEmail;
      }
      // Check if it's a direct response with fromEmail
      else if (emailResult.fromEmail) {
        fromEmail = emailResult.fromEmail;
      }
    }
    
    await markEmailAsSent(logResult.logId, fromEmail);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await markEmailAsFailed(logResult.logId, errorMessage);
    throw error; // Re-throw to maintain existing error handling
  }
} 