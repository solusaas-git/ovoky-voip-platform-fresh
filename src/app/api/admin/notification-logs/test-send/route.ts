import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { NotificationService } from '@/services/NotificationService';
import { EmailVerificationService } from '@/services/EmailVerificationService';
import { AccountActivationService } from '@/services/AccountActivationService';
import SmtpService from '@/services/SmtpService';
import { 
  generateHighCostAlertEmail, 
  generateLowAsrAlertEmail, 
  generateExtremeUsageAlertEmail 
} from '@/lib/emailTemplates/kpiAlerts';
import { generatePaymentSuccessTemplate } from '@/lib/emailTemplates';
import {
  generateBackorderNotificationTemplate,
  generateCancellationNotificationTemplate,
  generateNumberPurchaseNotificationTemplate,
  generateNumberAssignmentNotificationTemplate
} from '@/lib/emailTemplates/phoneNumberNotifications';
import User from '@/models/User';
import { getCurrentUser } from '@/lib/authService';
import BrandingSettings from '@/models/BrandingSettings';
import { generatePasswordResetEmail } from '@/lib/emailTemplates/authNotifications';

// TypeScript interface for password reset email data
interface PasswordResetEmailData {
  name: string;
  email: string;
  resetToken: string;
  resetUrl: string;
  branding: {
    companyName: string;
    companySlogan: string;
    primaryColor: string;
    fontFamily: string;
    supportEmail: string;
    websiteUrl: string;
  };
}

interface UserWithCompany {
  _id: { toString(): string };
  name: string;
  email: string;
  company?: string;
  sippyAccountId?: number;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(currentUser.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, notificationType = 'low_balance', testBalance, testThreshold } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get the target user
    const targetUser = await User.findById(userId) as UserWithCompany | null;
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get branding settings for phone number notifications
    const brandingSettings = await BrandingSettings.findOne();
    const defaultBranding = {
      companyName: brandingSettings?.companyName || 'OVOKY',
      companySlogan: brandingSettings?.companySlogan || 'Your trusted communications partner',
      primaryColor: brandingSettings?.primaryColor || '#667eea',
      fontFamily: brandingSettings?.fontFamily || 'Arial, sans-serif'
    };

    // Handle different notification types
    try {
      let message = '';
      
      switch (notificationType) {
        case 'low_balance':
        case 'zero_balance':
        case 'negative_balance':
          // Balance notifications - BILLING category - require Sippy account
          if (!targetUser.sippyAccountId) {
            return NextResponse.json({ error: 'User does not have a Sippy account' }, { status: 400 });
          }
          
          const testAccount = {
            id: targetUser._id.toString(),
            name: targetUser.name,
            email: targetUser.email,
            sippyAccountId: targetUser.sippyAccountId,
            balance: testBalance !== undefined ? parseFloat(testBalance) : getTestBalance(notificationType),
            currency: 'EUR'
          };

          const threshold = testThreshold !== undefined ? parseFloat(testThreshold) : getTestThreshold(notificationType);
          
          // Generate balance alert email using NotificationService
          const notificationService = NotificationService.getInstance();
          const emailContent = await notificationService.createEmailContent(
            testAccount, 
            notificationType, 
            threshold
          );
          
          // Send using billing SMTP category
          const smtpServiceBalance = SmtpService.getInstance();
          const balanceResult = await smtpServiceBalance.sendBillingEmail({
            to: targetUser.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text
          });
          
          if (!balanceResult.success) {
            return NextResponse.json({ error: `Failed to send ${notificationType}: ${balanceResult.error}` }, { status: 500 });
          }
          
          message = `Test ${notificationType.replace('_', ' ')} notification sent successfully to ${targetUser.email} using ${balanceResult.accountUsed?.name} (${balanceResult.accountUsed?.category})`;
          break;

        case 'email_verification':
          // Email verification - doesn't require Sippy account
          const emailVerificationService = EmailVerificationService.getInstance();
          await emailVerificationService.sendVerificationEmail(
            targetUser.email, 
            targetUser.name, 
            targetUser._id.toString()
          );
          message = `Test email verification sent successfully to ${targetUser.email}`;
          break;

        case 'account_activation':
          // Account activation - requires Sippy account
          if (!targetUser.sippyAccountId) {
            return NextResponse.json({ error: 'User does not have a Sippy account' }, { status: 400 });
          }
          
          const accountActivationService = AccountActivationService.getInstance();
          await accountActivationService.sendActivationEmail(
            targetUser.email,
            targetUser.name,
            targetUser.sippyAccountId,
            targetUser._id.toString()
          );
          message = `Test account activation email sent successfully to ${targetUser.email}`;
          break;

        case 'high_cost_alert':
          // High cost alert - requires Sippy account - SUPPORT category
          if (!targetUser.sippyAccountId) {
            return NextResponse.json({ error: 'User does not have a Sippy account' }, { status: 400 });
          }
          
          const highCostAlertData = {
            costOfDay: 125.75,
            threshold: 100.00,
            currency: 'EUR',
            totalCalls: 1543,
            avgCostPerCall: 0.0815,
            date: new Date().toLocaleDateString(),
            userName: targetUser.name,
            userEmail: targetUser.email,
            branding: {
              companyName: 'OVOKY',
              companySlogan: 'Your trusted communications partner',
              primaryColor: '#667eea',
              fontFamily: 'Arial, sans-serif'
            }
          };

          const highCostEmailContent = generateHighCostAlertEmail(highCostAlertData);
          
          // Import logAndSendEmail for proper logging
          const { logAndSendEmail: logHighCostAlert } = await import('@/lib/emailLogger');
          
          // Use logAndSendEmail to ensure it appears in notification logs
          await logHighCostAlert(
            {
              userId: targetUser._id.toString(),
              userEmail: targetUser.email,
              userName: targetUser.name,
              notificationType: 'high_cost_alert',
              emailSubject: highCostEmailContent.subject,
              emailBody: highCostEmailContent.html,
              alertData: {
                costOfDay: highCostAlertData.costOfDay,
                threshold: highCostAlertData.threshold,
                currency: highCostAlertData.currency,
                totalCalls: highCostAlertData.totalCalls,
                avgCostPerCall: highCostAlertData.avgCostPerCall,
                date: highCostAlertData.date,
                testAlert: true,
                alertType: '',
                value: 0
              }
            },
            async () => {
              const smtpService = SmtpService.getInstance();
              const result = await smtpService.sendSupportEmail({
                to: targetUser.email,
                subject: highCostEmailContent.subject,
                html: highCostEmailContent.html,
                text: highCostEmailContent.text
              });
              
              if (!result.success) {
                throw new Error(`Failed to send high cost alert: ${result.error}`);
              }
              
              return result as typeof result & { [key: string]: unknown };
            }
          );
          
          message = `Test high cost alert sent successfully to ${targetUser.email} and logged in notification system`;
          break;

        case 'low_asr_alert':
          // Low ASR alert - requires Sippy account - SUPPORT category
          if (!targetUser.sippyAccountId) {
            return NextResponse.json({ error: 'User does not have a Sippy account' }, { status: 400 });
          }
          
          const lowAsrAlertData = {
            asr: 45.2,
            threshold: 60.0,
            totalCalls: 2341,
            failedCalls: 1284,
            successfulCalls: 1057, // totalCalls - failedCalls
            date: new Date().toLocaleDateString(),
            userName: targetUser.name,
            userEmail: targetUser.email,
            branding: {
              companyName: 'OVOKY',
              companySlogan: 'Your trusted communications partner',
              primaryColor: '#667eea',
              fontFamily: 'Arial, sans-serif'
            }
          };

          const lowAsrEmailContent = generateLowAsrAlertEmail(lowAsrAlertData);
          
          const { logAndSendEmail: logLowAsrAlert } = await import('@/lib/emailLogger');
          
          await logLowAsrAlert(
            {
              userId: targetUser._id.toString(),
              userEmail: targetUser.email,
              userName: targetUser.name,
              notificationType: 'low_asr_alert',
              emailSubject: lowAsrEmailContent.subject,
              emailBody: lowAsrEmailContent.html,
              alertData: {
                asr: lowAsrAlertData.asr,
                threshold: lowAsrAlertData.threshold,
                totalCalls: lowAsrAlertData.totalCalls,
                failedCalls: lowAsrAlertData.failedCalls,
                date: lowAsrAlertData.date,
                testAlert: true,
                alertType: '',
                value: 0
              }
            },
            async () => {
              const smtpService = SmtpService.getInstance();
              const result = await smtpService.sendSupportEmail({
                to: targetUser.email,
                subject: lowAsrEmailContent.subject,
                html: lowAsrEmailContent.html,
                text: lowAsrEmailContent.text
              });
              
              if (!result.success) {
                throw new Error(`Failed to send low ASR alert: ${result.error}`);
              }
              
              return result as typeof result & { [key: string]: unknown };
            }
          );
          
          message = `Test low ASR alert sent successfully to ${targetUser.email} and logged in notification system`;
          break;

        case 'extreme_usage_alert':
          // Extreme usage alert - requires Sippy account - SUPPORT category
          if (!targetUser.sippyAccountId) {
            return NextResponse.json({ error: 'User does not have a Sippy account' }, { status: 400 });
          }
          
          const extremeUsageAlertData = {
            dailyUsage: 1547.89,
            threshold: 1000.00,
            currency: 'EUR',
            totalMinutes: 18954,
            totalCalls: 1547, // Add missing property
            avgCostPerMinute: 0.0817,
            avgMinutesPerCall: 12.25, // Add missing property (totalMinutes / totalCalls)
            date: new Date().toLocaleDateString(),
            userName: targetUser.name,
            userEmail: targetUser.email,
            branding: {
              companyName: 'OVOKY',
              companySlogan: 'Your trusted communications partner',
              primaryColor: '#667eea',
              fontFamily: 'Arial, sans-serif'
            }
          };

          const extremeUsageEmailContent = generateExtremeUsageAlertEmail(extremeUsageAlertData);
          
          const { logAndSendEmail: logExtremeUsageAlert } = await import('@/lib/emailLogger');
          
          await logExtremeUsageAlert(
            {
              userId: targetUser._id.toString(),
              userEmail: targetUser.email,
              userName: targetUser.name,
              notificationType: 'extreme_usage_alert',
              emailSubject: extremeUsageEmailContent.subject,
              emailBody: extremeUsageEmailContent.html,
              alertData: {
                dailyUsage: extremeUsageAlertData.dailyUsage,
                threshold: extremeUsageAlertData.threshold,
                currency: extremeUsageAlertData.currency,
                totalMinutes: extremeUsageAlertData.totalMinutes,
                avgCostPerMinute: extremeUsageAlertData.avgCostPerMinute,
                date: extremeUsageAlertData.date,
                testAlert: true,
                alertType: '',
                value: 0
              }
            },
            async () => {
              const smtpService = SmtpService.getInstance();
              const result = await smtpService.sendSupportEmail({
                to: targetUser.email,
                subject: extremeUsageEmailContent.subject,
                html: extremeUsageEmailContent.html,
                text: extremeUsageEmailContent.text
              });
              
              if (!result.success) {
                throw new Error(`Failed to send extreme usage alert: ${result.error}`);
              }
              
              return result as typeof result & { [key: string]: unknown };
            }
          );
          
          message = `Test extreme usage alert sent successfully to ${targetUser.email} and logged in notification system`;
          break;

        case 'payment_success_gateway':
        case 'payment_success_admin':
          // Payment success notification - requires Sippy account - BILLING category
          if (!targetUser.sippyAccountId) {
            return NextResponse.json({ error: 'User does not have a Sippy account' }, { status: 400 });
          }
          
          const paymentType: 'gateway_payment' | 'admin_credit' = notificationType === 'payment_success_gateway' ? 'gateway_payment' : 'admin_credit';
          
          const paymentData = {
            account: {
              name: targetUser.name,
              email: targetUser.email,
              sippyAccountId: targetUser.sippyAccountId,
              balance: 150.75,
              currency: 'EUR'
            },
            payment: {
              amount: 100.00,
              currency: 'EUR',
              paymentMethod: paymentType === 'gateway_payment' ? 'Credit Card' : 'Admin Credit',
              transactionId: `TEST_${Date.now()}`,
              fees: paymentType === 'gateway_payment' ? {
                processingFee: 2.50,
                fixedFee: 0.30
              } : undefined
            },
            paymentType,
            processedBy: paymentType === 'admin_credit' ? user.name : undefined,
            branding: defaultBranding
          };

          const paymentEmailContent = generatePaymentSuccessTemplate(paymentData);
          
          const { logAndSendEmail: logPaymentAlert } = await import('@/lib/emailLogger');
          
          await logPaymentAlert(
            {
              userId: targetUser._id.toString(),
              userEmail: targetUser.email,
              userName: targetUser.name,
              notificationType: notificationType,
              emailSubject: paymentEmailContent.subject,
              emailBody: paymentEmailContent.html,
              alertData: {
                amount: paymentData.payment.amount,
                currency: paymentData.payment.currency,
                paymentType: paymentType,
                testPayment: true,
                alertType: '',
                value: 0,
                threshold: 0
              }
            },
            async () => {
              const smtpService = SmtpService.getInstance();
              const result = await smtpService.sendBillingEmail({
                to: targetUser.email,
                subject: paymentEmailContent.subject,
                html: paymentEmailContent.html,
                text: paymentEmailContent.text
              });
              
              if (!result.success) {
                throw new Error(`Failed to send payment notification: ${result.error}`);
              }
              
              return result as typeof result & { [key: string]: unknown };
            }
          );
          
          message = `Test ${paymentType === 'gateway_payment' ? 'gateway payment' : 'admin credit'} notification sent successfully to ${targetUser.email}`;
          break;

        case 'password_reset':
          // Password reset notification - AUTH category
          const resetToken = 'test_reset_token_' + Date.now();
          const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
          
          const passwordResetData: PasswordResetEmailData = {
            name: targetUser.name,
            email: targetUser.email,
            resetToken: resetToken,
            resetUrl: resetUrl,
            branding: {
              companyName: defaultBranding.companyName,
              companySlogan: defaultBranding.companySlogan || '',
              primaryColor: defaultBranding.primaryColor,
              fontFamily: defaultBranding.fontFamily,
              supportEmail: 'support@ovoky.com',
              websiteUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            }
          };

          const passwordResetEmailContent = generatePasswordResetEmail(passwordResetData);
          
          const { logAndSendEmail: logPasswordReset } = await import('@/lib/emailLogger');
          
          await logPasswordReset(
            {
              userId: targetUser._id.toString(),
              userEmail: targetUser.email,
              userName: targetUser.name,
              notificationType: 'password_reset',
              emailSubject: passwordResetEmailContent.subject,
              emailBody: passwordResetEmailContent.html,
              alertData: {
                resetToken: resetToken,
                testPasswordReset: true,
                alertType: '',
                value: 0,
                threshold: 0
              }
            },
            async () => {
              const smtpService = SmtpService.getInstance();
              const result = await smtpService.sendAuthenticationEmail({
                to: targetUser.email,
                subject: passwordResetEmailContent.subject,
                html: passwordResetEmailContent.html,
                text: passwordResetEmailContent.text
              });
              
              if (!result.success) {
                throw new Error(`Failed to send password reset: ${result.error}`);
              }
              
              return result as typeof result & { [key: string]: unknown };
            }
          );
          
          message = `Test password reset notification sent successfully to ${targetUser.email}`;
          break;

        // Phone number notifications
        case 'backorder_approved':
        case 'backorder_rejected':
          const backorderStatus = notificationType === 'backorder_approved' ? 'approved' : 'rejected';
          const backorderData = {
            phoneNumber: {
              number: '+1234567890',
              country: 'United States',
              numberType: 'Local',
              monthlyRate: 3.50,
              setupFee: 1.00,
              currency: 'EUR',
              capabilities: ['Voice', 'SMS']
            },
            user: {
              name: targetUser.name,
              email: targetUser.email,
              company: (targetUser as UserWithCompany).company || 'Test Company'
            },
            request: {
              requestNumber: `BO${Date.now()}`,
              status: backorderStatus as 'approved' | 'rejected',
              reviewNotes: backorderStatus === 'approved' 
                ? 'Request approved and number assigned successfully.'
                : 'Number not available for assignment at this time.',
              submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              reviewedAt: new Date().toISOString(),
              reviewedBy: user.name
            },
            requestType: 'bulk' as const, // Test bulk backorder
            numbersCount: 4,
            requestedNumbers: [
              {
                number: '+1234567890',
                country: 'United States',
                numberType: 'Local',
                monthlyRate: 3.50,
                setupFee: 1.00,
                capabilities: ['Voice', 'SMS'],
                status: (backorderStatus === 'approved' ? 'approved' : 'rejected') as 'approved' | 'rejected'
              },
              {
                number: '+1234567891',
                country: 'United States', 
                numberType: 'Toll-Free',
                monthlyRate: 2.00,
                setupFee: 5.00,
                capabilities: ['Voice', 'SMS'],
                status: (backorderStatus === 'approved' ? 'approved' : 'rejected') as 'approved' | 'rejected'
              },
              {
                number: '+4412345678',
                country: 'United Kingdom',
                numberType: 'Local',
                monthlyRate: 4.20,
                setupFee: 0.00,
                capabilities: ['Voice', 'SMS', 'MMS'],
                status: 'rejected' as const // Mixed results for approved case
              },
              {
                number: '+3312345678',
                country: 'France',
                numberType: 'National',
                monthlyRate: 5.80,
                setupFee: 2.50,
                capabilities: ['Voice', 'SMS'],
                status: (backorderStatus === 'approved' ? 'approved' : 'rejected') as 'approved' | 'rejected'
              }
            ],
            branding: defaultBranding
          };

          const backorderEmailContent = generateBackorderNotificationTemplate(backorderData);
          
          const { logAndSendEmail: logBackorder } = await import('@/lib/emailLogger');
          
          await logBackorder(
            {
              userId: targetUser._id.toString(),
              userEmail: targetUser.email,
              userName: targetUser.name,
              notificationType: notificationType,
              emailSubject: backorderEmailContent.subject,
              emailBody: backorderEmailContent.html,
              alertData: {
                phoneNumber: backorderData.phoneNumber.number,
                requestNumber: backorderData.request.requestNumber,
                status: backorderStatus,
                testNotification: true,
                alertType: '',
                value: 0,
                threshold: 0
              }
            },
            async () => {
              const smtpService = SmtpService.getInstance();
              const result = await smtpService.sendSupportEmail({
                to: targetUser.email,
                subject: backorderEmailContent.subject,
                html: backorderEmailContent.html,
                text: backorderEmailContent.text
              });
              
              if (!result.success) {
                throw new Error(`Failed to send backorder notification: ${result.error}`);
              }
              
              return result as typeof result & { [key: string]: unknown };
            }
          );
          
          message = `Test backorder ${backorderStatus} notification sent successfully to ${targetUser.email}`;
          break;

        case 'cancellation_approved':
        case 'cancellation_rejected':
          const cancellationStatus = notificationType === 'cancellation_approved' ? 'approved' : 'rejected';
          const cancellationData = {
            phoneNumber: {
              number: '+1234567890',
              country: 'United States',
              numberType: 'Local',
              monthlyRate: 3.50,
              currency: 'EUR',
              capabilities: ['Voice', 'SMS']
            },
            user: {
              name: targetUser.name,
              email: targetUser.email,
              company: (targetUser as UserWithCompany).company || 'Test Company'
            },
            request: {
              requestId: `CR${Date.now()}`,
              status: cancellationStatus as 'approved' | 'rejected',
              adminNotes: cancellationStatus === 'approved' 
                ? 'Cancellation processed and number removed from account.'
                : 'Cancellation request denied. Number is required for active services.',
              submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              reviewedAt: new Date().toISOString(),
              reviewedBy: user.name
            },
            branding: defaultBranding
          };

          const cancellationEmailContent = generateCancellationNotificationTemplate(cancellationData);
          
          const { logAndSendEmail: logCancellation } = await import('@/lib/emailLogger');
          
          await logCancellation(
            {
              userId: targetUser._id.toString(),
              userEmail: targetUser.email,
              userName: targetUser.name,
              notificationType: notificationType,
              emailSubject: cancellationEmailContent.subject,
              emailBody: cancellationEmailContent.html,
              alertData: {
                phoneNumber: cancellationData.phoneNumber.number,
                requestId: cancellationData.request.requestId,
                status: cancellationStatus,
                testNotification: true,
                alertType: '',
                value: 0,
                threshold: 0
              }
            },
            async () => {
              const smtpService = SmtpService.getInstance();
              const result = await smtpService.sendSupportEmail({
                to: targetUser.email,
                subject: cancellationEmailContent.subject,
                html: cancellationEmailContent.html,
                text: cancellationEmailContent.text
              });
              
              if (!result.success) {
                throw new Error(`Failed to send cancellation notification: ${result.error}`);
              }
              
              return result as typeof result & { [key: string]: unknown };
            }
          );
          
          message = `Test cancellation ${cancellationStatus} notification sent successfully to ${targetUser.email}`;
          break;

        case 'number_purchase_single':
        case 'number_purchase_bulk':
          const purchaseType: 'bulk' | 'direct' = notificationType === 'number_purchase_bulk' ? 'bulk' : 'direct';
          const numbersCount = purchaseType === 'bulk' ? 5 : undefined;
          
          // Sample purchased numbers for bulk purchases
          const samplePurchasedNumbers = purchaseType === 'bulk' ? [
            {
              number: '+1234567890',
              country: 'United States',
              numberType: 'Local',
              monthlyRate: 3.50,
              setupFee: 1.00,
              capabilities: ['Voice', 'SMS']
            },
            {
              number: '+1234567891',
              country: 'United States', 
              numberType: 'Toll-Free',
              monthlyRate: 2.00,
              setupFee: 5.00,
              capabilities: ['Voice', 'SMS']
            },
            {
              number: '+4412345678',
              country: 'United Kingdom',
              numberType: 'Local',
              monthlyRate: 4.20,
              setupFee: 0.00,
              capabilities: ['Voice', 'SMS', 'MMS']
            },
            {
              number: '+3312345678',
              country: 'France',
              numberType: 'National',
              monthlyRate: 5.80,
              setupFee: 2.50,
              capabilities: ['Voice', 'SMS']
            },
            {
              number: '+4912345678',
              country: 'Germany',
              numberType: 'Local',
              monthlyRate: 3.90,
              setupFee: 1.50,
              capabilities: ['Voice', 'SMS']
            }
          ] : undefined;
          
          const purchaseData = {
            phoneNumber: {
              number: '+1234567890',
              country: 'United States',
              numberType: 'Local',
              monthlyRate: 3.50,
              setupFee: 1.00,
              currency: 'EUR',
              capabilities: ['Voice', 'SMS']
            },
            user: {
              name: targetUser.name,
              email: targetUser.email,
              company: (targetUser as UserWithCompany).company || 'Test Company'
            },
            purchase: {
              purchaseId: `PU${Date.now()}`,
              purchaseDate: new Date().toISOString(),
              totalAmount: purchaseType === 'bulk' ? 28.90 : 4.50, // Updated to match sample numbers
              billingStartDate: new Date().toISOString(),
              nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            },
            purchaseType,
            numbersCount,
            purchasedNumbers: samplePurchasedNumbers,
            branding: defaultBranding
          };

          const purchaseEmailContent = generateNumberPurchaseNotificationTemplate(purchaseData);
          
          const { logAndSendEmail: logPurchase } = await import('@/lib/emailLogger');
          
          await logPurchase(
            {
              userId: targetUser._id.toString(),
              userEmail: targetUser.email,
              userName: targetUser.name,
              notificationType: notificationType,
              emailSubject: purchaseEmailContent.subject,
              emailBody: purchaseEmailContent.html,
              alertData: {
                phoneNumber: purchaseData.phoneNumber.number,
                purchaseId: purchaseData.purchase.purchaseId,
                purchaseType: purchaseType,
                totalAmount: purchaseData.purchase.totalAmount,
                numbersCount: numbersCount,
                testNotification: true,
                alertType: '',
                value: 0,
                threshold: 0
              }
            },
            async () => {
              const smtpService = SmtpService.getInstance();
              const result = await smtpService.sendSupportEmail({
                to: targetUser.email,
                subject: purchaseEmailContent.subject,
                html: purchaseEmailContent.html,
                text: purchaseEmailContent.text
              });
              
              if (!result.success) {
                throw new Error(`Failed to send purchase notification: ${result.error}`);
              }
              
              return result as typeof result & { [key: string]: unknown };
            }
          );
          
          message = `Test ${purchaseType} purchase notification sent successfully to ${targetUser.email}`;
          break;

        case 'number_assignment':
          const assignmentData = {
            phoneNumber: {
              number: '+1234567890',
              country: 'United States',
              numberType: 'Local',
              monthlyRate: 3.50,
              setupFee: 1.00,
              currency: 'EUR',
              capabilities: ['Voice', 'SMS']
            },
            user: {
              name: targetUser.name,
              email: targetUser.email,
              company: (targetUser as UserWithCompany).company || 'Test Company'
            },
            assignment: {
              assignmentId: `AS${Date.now()}`,
              assignedAt: new Date().toISOString(),
              assignedBy: user.name,
              notes: 'Number assigned for testing purposes.',
              billingStartDate: new Date().toISOString(),
              nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            },
            branding: defaultBranding
          };

          const assignmentEmailContent = generateNumberAssignmentNotificationTemplate(assignmentData);
          
          const { logAndSendEmail: logAssignment } = await import('@/lib/emailLogger');
          
          await logAssignment(
            {
              userId: targetUser._id.toString(),
              userEmail: targetUser.email,
              userName: targetUser.name,
              notificationType: 'number_assignment',
              emailSubject: assignmentEmailContent.subject,
              emailBody: assignmentEmailContent.html,
              alertData: {
                phoneNumber: assignmentData.phoneNumber.number,
                assignmentId: assignmentData.assignment.assignmentId,
                assignedBy: assignmentData.assignment.assignedBy,
                testNotification: true,
                alertType: '',
                value: 0,
                threshold: 0
              }
            },
            async () => {
              const smtpService = SmtpService.getInstance();
              const result = await smtpService.sendSupportEmail({
                to: targetUser.email,
                subject: assignmentEmailContent.subject,
                html: assignmentEmailContent.html,
                text: assignmentEmailContent.text
              });
              
              if (!result.success) {
                throw new Error(`Failed to send assignment notification: ${result.error}`);
              }
              
              return result as typeof result & { [key: string]: unknown };
            }
          );
          
          message = `Test number assignment notification sent successfully to ${targetUser.email}`;
          break;

        default:
          return NextResponse.json({ error: `Unknown notification type: ${notificationType}` }, { status: 400 });
      }

      return NextResponse.json({ 
        success: true, 
        message 
      });

    } catch (emailError) {
      console.error(`Error sending ${notificationType} test email:`, emailError);
      return NextResponse.json({ 
        error: `Failed to send ${notificationType} test email: ${emailError instanceof Error ? emailError.message : 'Unknown error'}` 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in test notification route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions to get realistic test values for balance notifications
function getTestBalance(notificationType: string): number {
  switch (notificationType) {
    case 'low_balance':
      return 5.25; // Below typical threshold of 10
    case 'zero_balance':
      return 0.0001; // Very small positive amount
    case 'negative_balance':
      return -15.75; // Negative balance
    default:
      return 5.25;
  }
}

function getTestThreshold(notificationType: string): number {
  switch (notificationType) {
    case 'low_balance':
      return 10.0000;
    case 'zero_balance':
      return 0.0000;
    case 'negative_balance':
      return -0.0001;
    default:
      return 10.0000;
  }
}