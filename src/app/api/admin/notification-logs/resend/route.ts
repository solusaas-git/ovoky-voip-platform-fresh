import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { NotificationService } from '@/services/NotificationService';
import SmtpService from '@/services/SmtpService';
import connectToDatabase from '@/lib/db';
import { NotificationLog } from '@/models/NotificationLog';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClient } from '@/lib/sippyClient';
import User from '@/models/User';
import BrandingSettings from '@/models/BrandingSettings';
import { generatePaymentSuccessTemplate } from '@/lib/emailTemplates';
import {
  generateBackorderNotificationTemplate,
  generateCancellationNotificationTemplate,
  generateNumberPurchaseNotificationTemplate,
  generateNumberAssignmentNotificationTemplate
} from '@/lib/emailTemplates/phoneNumberNotifications';
import { generatePasswordResetEmail } from '@/lib/emailTemplates/authNotifications';
import { generateEmailVerificationTemplate } from '@/lib/emailTemplates/emailVerification';
import { generateAccountActivationTemplate } from '@/lib/emailTemplates/accountActivation';
import {
  generateHighCostAlertEmail,
  generateLowAsrAlertEmail,
  generateExtremeUsageAlertEmail
} from '@/lib/emailTemplates/kpiAlerts';

// Helper function to parse XML-RPC response (same as in NotificationService)
interface ParsedAccountInfo {
  [key: string]: string | number | boolean | null;
}

function parseAccountInfoXml(xmlString: string): ParsedAccountInfo | null {
  try {
    if (typeof xmlString !== 'string') {
      return xmlString;
    }

    // Check for fault response first
    const faultRegex = new RegExp('<fault>\\s*<value>\\s*<struct>(.*?)</struct>\\s*</value>\\s*</fault>', 's');
    const faultMatch = xmlString.match(faultRegex);
    if (faultMatch) {
      const faultContent = faultMatch[1];
      const codeMatch = faultContent.match(/<name>faultCode<\/name>\s*<value>\s*<int>(\d+)<\/int>/);
      const messageMatch = faultContent.match(/<name>faultString<\/name>\s*<value>\s*<string>([^<]*)<\/string>/);
      
      const faultCode = codeMatch ? parseInt(codeMatch[1], 10) : 'Unknown';
      const faultMessage = messageMatch ? messageMatch[1] : 'Unknown error';
      
      throw new Error(`Sippy API Fault ${faultCode}: ${faultMessage}`);
    }

    // Look for the main struct containing account data
    const structRegex = new RegExp('<methodResponse>\\s*<params>\\s*<param>\\s*<value>\\s*<struct>(.*?)</struct>\\s*</value>\\s*</param>\\s*</params>\\s*</methodResponse>', 's');
    const structMatch = xmlString.match(structRegex);
    
    if (!structMatch) {
      return null;
    }

    const structContent = structMatch[1];
    const result: ParsedAccountInfo = {};
    
    // Extract all members from the struct
    const memberRegex = new RegExp('<member>\\s*<name>([^<]+)</name>\\s*<value>\\s*<([^>]+)>([^<]*)</[^>]+>\\s*</value>\\s*</member>', 'g');
    let memberMatch;
    
    while ((memberMatch = memberRegex.exec(structContent)) !== null) {
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
      
      result[name] = parsedValue;
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing account info XML:', error);
    return null;
  }
}

// Helper function to get branding settings with fallbacks
async function getBrandingSettings() {
  try {
    await connectToDatabase(); // Ensure database connection
    const brandingSettings = await BrandingSettings.findOne();
    
    return {
      companyName: brandingSettings?.companyName || 'OVOKY',
      companySlogan: brandingSettings?.companySlogan || 'Your trusted communications partner',
      primaryColor: brandingSettings?.primaryColor || '#667eea',
      fontFamily: brandingSettings?.fontFamily || 'Arial, sans-serif'
    };
  } catch (error) {
    console.error('Error fetching branding settings:', error);
    return {
      companyName: 'OVOKY',
      companySlogan: 'Your trusted communications partner',
      primaryColor: '#667eea',
      fontFamily: 'Arial, sans-serif'
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { logIds } = body; // Array of notification log IDs to resend

    if (!logIds || !Array.isArray(logIds) || logIds.length === 0) {
      return NextResponse.json({ error: 'No log IDs provided' }, { status: 400 });
    }

    await connectToDatabase();

    // Get the notification logs
    const logs = await NotificationLog.find({ _id: { $in: logIds } });
    
    if (logs.length === 0) {
      return NextResponse.json({ error: 'No valid logs found' }, { status: 404 });
    }

    console.log(`Admin ${currentUser.email} triggering resend for ${logs.length} notifications`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Resend each notification
    for (const log of logs) {
      try {
        console.log(`\n=== RESENDING NOTIFICATION FOR ${log.userEmail} ===`);
        
        // Get user data to fetch current balance from Sippy API
        let user;
        
        // Handle legacy admin notifications that have userId: "admin" as string
        if (log.userId === 'admin') {
          // For legacy admin notifications, try to find the admin user by email
          user = await User.findOne({ email: log.userEmail, role: 'admin' });
          if (!user) {
            // If we can't find the specific admin, find any admin user for resend purposes
            user = await User.findOne({ role: 'admin' });
            if (!user) {
              throw new Error(`No admin users found for legacy admin notification ${log.userEmail}`);
            }
          }
        } else {
          // Normal user lookup by ObjectId
          user = await User.findById(log.userId);
          if (!user) {
            throw new Error(`User not found for log ${log.userEmail}`);
          }
        }

        // Get current account balance from Sippy API
        let currentBalance = log.balanceAmount; // Fallback to original balance
        let currentCurrency = log.currency;
        
        try {
          const credentials = await getSippyApiCredentials();
          if (credentials && user.sippyAccountId) {
            console.log(`Fetching current balance for account ${user.sippyAccountId}`);
            const sippyClient = new SippyClient(credentials);
            const rawResponse = await sippyClient.getAccountInfo({ 
              i_account: user.sippyAccountId 
            });
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const accountInfo = parseAccountInfoXml(rawResponse as unknown as string);
            if (accountInfo && accountInfo.balance !== undefined && accountInfo.balance !== null && typeof accountInfo.balance === 'number') {
              // Sippy API returns inverted balance values
              currentBalance = -accountInfo.balance;
              currentCurrency = typeof accountInfo.payment_currency === 'string' ? accountInfo.payment_currency : log.currency;
              console.log(`Current balance: ${currentBalance} ${currentCurrency} (was ${log.balanceAmount})`);
            }
          }
        } catch (balanceError) {
          console.warn(`Could not fetch current balance for ${log.userEmail}, using original balance:`, balanceError);
        }

        // Get user onboarding data for real company name
        let companyName = 'Default Company'; // fallback
        try {
          await connectToDatabase();
          const UserOnboarding = (await import('@/models/UserOnboarding')).default;
          const onboardingData = await UserOnboarding.findOne({ userId: user._id }).lean();
          if (onboardingData && onboardingData.companyName) {
            companyName = onboardingData.companyName;
          }
        } catch (error) {
          console.warn(`Could not fetch onboarding data for user ${user.email}:`, error);
        }

        // Create user account object for email generation
        const userAccount = {
          id: log.userId,
          name: user.name || log.userName, // Use real user name from DB
          email: log.userEmail,
          sippyAccountId: log.sippyAccountId || 0,
          balance: currentBalance || 0,
          currency: currentCurrency || 'EUR'
        };

        // Generate fresh email template based on notification type
        let emailContent: { subject: string; html: string; text: string };
        
        if (['low_balance', 'zero_balance', 'negative_balance'].includes(log.notificationType)) {
          // Balance notifications - use NotificationService
        const notificationService = NotificationService.getInstance();
          emailContent = await notificationService.createEmailContent(
          userAccount, 
          log.notificationType, 
            log.thresholdAmount || 0 // Provide default value
          );
        } else if (['payment_success_gateway', 'payment_success_admin'].includes(log.notificationType)) {
          // Payment notifications - use payment template
          const brandingSettings = await getBrandingSettings();

          // Try to get payment data from the original log, or create mock data
          const paymentData = {
            account: {
              name: log.userName,
              email: log.userEmail,
              sippyAccountId: log.sippyAccountId || 0,
              balance: currentBalance || 0,
              currency: currentCurrency || 'EUR'
            },
            payment: {
              amount: 100.00, // Default amount for resend
              currency: currentCurrency || 'EUR',
              paymentMethod: log.notificationType === 'payment_success_gateway' ? 'Credit Card' : 'Admin Credit',
              transactionId: `RESEND_${Date.now()}`,
              fees: log.notificationType === 'payment_success_gateway' ? {
                processingFee: 2.50,
                fixedFee: 0.30
              } : undefined
            },
            paymentType: log.notificationType === 'payment_success_gateway' ? 'gateway_payment' as const : 'admin_credit' as const,
            processedBy: log.notificationType === 'payment_success_admin' ? 'Admin (Resend)' : undefined,
            branding: brandingSettings
          };

          emailContent = generatePaymentSuccessTemplate(paymentData);
        } else if (['backorder_approved', 'backorder_rejected'].includes(log.notificationType)) {
          // Backorder notifications
          const brandingSettings = await getBrandingSettings();

          const backorderData = {
            phoneNumber: {
              number: '+1234567890', // Default for resend
              country: 'United States',
              numberType: 'Local',
              monthlyRate: 3.50,
              setupFee: 1.00,
              currency: currentCurrency || 'EUR',
              capabilities: ['Voice', 'SMS']
            },
            user: {
              name: user.name || log.userName, // Use real user name
              email: log.userEmail,
              company: companyName // Use real company name from onboarding
            },
            request: {
              requestNumber: `BO${Date.now()}`,
              status: log.notificationType === 'backorder_approved' ? 'approved' as const : 'rejected' as const,
              reviewNotes: log.notificationType === 'backorder_approved' 
                ? 'Request approved and number assigned successfully (Resend).'
                : 'Number not available for assignment at this time (Resend).',
              submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              reviewedAt: new Date().toISOString(),
              reviewedBy: 'Admin (Resend)'
            },
            branding: brandingSettings
          };

          emailContent = generateBackorderNotificationTemplate(backorderData);
        } else if (['cancellation_approved', 'cancellation_rejected'].includes(log.notificationType)) {
          // Cancellation notifications
          const brandingSettings = await getBrandingSettings();

          const cancellationData = {
            phoneNumber: {
              number: '+1234567890', // Default for resend
              country: 'United States',
              numberType: 'Local',
              monthlyRate: 3.50,
              currency: currentCurrency || 'EUR',
              capabilities: ['Voice', 'SMS']
            },
            user: {
              name: user.name || log.userName, // Use real user name
              email: log.userEmail,
              company: companyName // Use real company name from onboarding
            },
            request: {
              requestId: `CR${Date.now()}`,
              status: log.notificationType === 'cancellation_approved' ? 'approved' as const : 'rejected' as const,
              adminNotes: log.notificationType === 'cancellation_approved' 
                ? 'Cancellation processed and number removed from account (Resend).'
                : 'Cancellation request denied. Number is required for active services (Resend).',
              submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              reviewedAt: new Date().toISOString(),
              reviewedBy: 'Admin (Resend)'
            },
            branding: brandingSettings
          };

          emailContent = generateCancellationNotificationTemplate(cancellationData);
        } else if (['number_purchase_single', 'number_purchase_bulk'].includes(log.notificationType)) {
          // Number purchase notifications
          const brandingSettings = await getBrandingSettings();

          const purchaseType = log.notificationType === 'number_purchase_bulk' ? 'bulk' as const : 'direct' as const;
          const numbersCount = purchaseType === 'bulk' ? 5 : undefined;
          
          const purchaseData = {
            phoneNumber: {
              number: '+1234567890', // Default for resend
              country: 'United States',
              numberType: 'Local',
              monthlyRate: 3.50,
              setupFee: 1.00,
              currency: currentCurrency || 'EUR',
              capabilities: ['Voice', 'SMS']
            },
            user: {
              name: user.name || log.userName, // Use real user name
              email: log.userEmail,
              company: companyName // Use real company name from onboarding
            },
            purchase: {
              purchaseId: `PU${Date.now()}`,
              purchaseDate: new Date().toISOString(),
              totalAmount: purchaseType === 'bulk' ? 22.50 : 4.50,
              billingStartDate: new Date().toISOString(),
              nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            },
            purchaseType,
            numbersCount,
            branding: brandingSettings
          };

          emailContent = generateNumberPurchaseNotificationTemplate(purchaseData);
        } else if (log.notificationType === 'number_assignment') {
          // Number assignment notifications
          const brandingSettings = await getBrandingSettings();

          const assignmentData = {
            phoneNumber: {
              number: '+1234567890', // Default for resend
              country: 'United States',
              numberType: 'Local',
              monthlyRate: 3.50,
              setupFee: 1.00,
              currency: currentCurrency || 'EUR',
              capabilities: ['Voice', 'SMS']
            },
            user: {
              name: user.name || log.userName, // Use real user name
              email: log.userEmail,
              company: companyName // Use real company name from onboarding
            },
            assignment: {
              assignmentId: `AS${Date.now()}`,
              assignedAt: new Date().toISOString(),
              assignedBy: 'Admin (Resend)',
              notes: 'Number assigned via resend functionality.',
              billingStartDate: new Date().toISOString(),
              nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            },
            branding: brandingSettings
          };

          emailContent = generateNumberAssignmentNotificationTemplate(assignmentData);
        } else if (log.notificationType === 'email_verification') {
          // Email verification notifications
          const brandingSettings = await getBrandingSettings();
          
          const verificationData = {
            name: user.name || log.userName, // Use real user name
            email: log.userEmail,
            verificationToken: `resend_token_${Date.now()}`,
            verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=resend_token_${Date.now()}`,
            otpCode: Math.floor(100000 + Math.random() * 900000).toString(), // Generate 6-digit OTP
            branding: brandingSettings
          };

          emailContent = generateEmailVerificationTemplate(verificationData);
        } else if (log.notificationType === 'account_activation') {
          // Account activation notifications
          const brandingSettings = await getBrandingSettings();
          
          const activationData = {
            name: user.name || log.userName, // Use real user name
            email: log.userEmail,
            sippyAccountId: log.sippyAccountId || 0,
            activationToken: `resend_activation_${Date.now()}`,
            activationUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/activate?token=resend_activation_${Date.now()}`,
            branding: brandingSettings
          };

          emailContent = generateAccountActivationTemplate(activationData);
        } else if (log.notificationType === 'password_reset') {
          // Password reset notifications
          const brandingSettings = await getBrandingSettings();
          
          const resetData = {
            name: user.name || log.userName, // Use real user name
            email: log.userEmail,
            resetToken: `resend_reset_${Date.now()}`,
            resetUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=resend_reset_${Date.now()}`,
            branding: {
              ...brandingSettings,
              supportEmail: 'support@ovoky.com',
              websiteUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            }
          };

          emailContent = generatePasswordResetEmail(resetData);
        } else if (log.notificationType === 'high_cost_alert') {
          // High cost alert notifications
          const alertData = {
            costOfDay: 125.75,
            threshold: 100.00,
            currency: currentCurrency || 'EUR',
            totalCalls: 1543,
            avgCostPerCall: 0.0815,
            date: new Date().toLocaleDateString(),
            userName: user.name || log.userName, // Use real user name
            userEmail: log.userEmail,
            branding: {
              companyName: 'OVOKY',
              companySlogan: 'Your trusted communications partner',
              primaryColor: '#667eea',
              fontFamily: 'Arial, sans-serif'
            }
          };

          emailContent = generateHighCostAlertEmail(alertData);
        } else if (log.notificationType === 'low_asr_alert') {
          // Low ASR alert notifications
          const alertData = {
            asr: 45.2,
            threshold: 60.0,
            totalCalls: 2341,
            successfulCalls: 1057, // Add required field
            failedCalls: 1284,
            date: new Date().toLocaleDateString(),
            userName: user.name || log.userName, // Use real user name
            userEmail: log.userEmail,
            branding: {
              companyName: 'OVOKY',
              companySlogan: 'Your trusted communications partner',
              primaryColor: '#667eea',
              fontFamily: 'Arial, sans-serif'
            }
          };

          emailContent = generateLowAsrAlertEmail(alertData);
        } else if (log.notificationType === 'extreme_usage_alert') {
          // Extreme usage alert notifications
          const alertData = {
            dailyUsage: 1547.89,
            threshold: 1000.00,
            currency: currentCurrency || 'EUR',
            totalCalls: 1234, // Add required field
            totalMinutes: 18954,
            avgCostPerMinute: 0.0817,
            avgMinutesPerCall: 15.37, // Add required field
            date: new Date().toLocaleDateString(),
            userName: user.name || log.userName, // Use real user name
            userEmail: log.userEmail,
            branding: {
              companyName: 'OVOKY',
              companySlogan: 'Your trusted communications partner',
              primaryColor: '#667eea',
              fontFamily: 'Arial, sans-serif'
            }
          };

          emailContent = generateExtremeUsageAlertEmail(alertData);
        } else if (log.notificationType.startsWith('ticket_')) {
          // Ticket notifications - fallback for now
          emailContent = {
            subject: `Ticket Notification - ${log.notificationType.replace('_', ' ').toUpperCase()}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Ticket Notification (Resend)</h2>
                <p>Hello ${user.name || log.userName},</p>
                <p>This is a resent ticket notification of type: ${log.notificationType}</p>
                <p>For ticket notifications, please use the original ticket system for detailed resends.</p>
                <p>Best regards,<br>OVOKY Team</p>
              </div>
            `,
            text: `Ticket Notification (Resend)\n\nHello ${user.name || log.userName},\n\nThis is a resent ticket notification of type: ${log.notificationType}\n\nFor ticket notifications, please use the original ticket system for detailed resends.\n\nBest regards,\nOVOKY Team`
          };
        } else if (log.notificationType.startsWith('admin_')) {
          // Admin notifications (sent TO admins about user activities)
          const brandingSettings = await getBrandingSettings();
          
          if (log.notificationType === 'admin_user_registration') {
            // Import admin registration template
            const { generateAdminUserRegistrationTemplate } = await import('@/lib/emailTemplates/adminNotifications');
            
            const adminData = {
              user: {
                name: user.name || log.userName, // Use real user name
                email: log.userEmail,
                registrationDate: new Date().toISOString(),
                ipAddress: '127.0.0.1' // Default for resend
              },
              branding: brandingSettings,
              adminEmail: log.userEmail
            };
            
            emailContent = generateAdminUserRegistrationTemplate(adminData);
          } else if (['admin_user_purchase_single', 'admin_user_purchase_bulk'].includes(log.notificationType)) {
            // Import admin purchase template
            const { generateAdminUserPurchaseNotificationTemplate } = await import('@/lib/emailTemplates/adminNotifications');
            
            const adminData = {
              phoneNumber: {
                number: '+1234567890',
                country: 'United States',
                numberType: 'Local',
                monthlyRate: 3.50,
                setupFee: 1.00,
                currency: currentCurrency || 'EUR',
                capabilities: ['Voice', 'SMS']
              },
              user: {
                name: user.name || log.userName, // Use real user name
                email: log.userEmail,
                company: companyName // Use real company name from onboarding
              },
              purchase: {
                purchaseId: `PU${Date.now()}`,
                purchaseDate: new Date().toISOString(),
                totalAmount: log.notificationType === 'admin_user_purchase_bulk' ? 22.50 : 4.50,
                billingStartDate: new Date().toISOString(),
                nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
              },
              purchaseType: log.notificationType === 'admin_user_purchase_bulk' ? 'bulk' as const : 'direct' as const,
              numbersCount: log.notificationType === 'admin_user_purchase_bulk' ? 5 : undefined,
              branding: brandingSettings,
              adminEmail: log.userEmail
            };
            
            emailContent = generateAdminUserPurchaseNotificationTemplate(adminData);
          } else if (log.notificationType === 'admin_backorder_request') {
            // Import admin backorder template
            const { generateAdminBackorderRequestNotificationTemplate } = await import('@/lib/emailTemplates/adminNotifications');
            
            const adminData = {
              phoneNumber: {
                number: '+1234567890',
                country: 'United States',
                numberType: 'Local',
                monthlyRate: 3.50,
                setupFee: 1.00,
                currency: currentCurrency || 'EUR',
                capabilities: ['Voice', 'SMS']
              },
              user: {
                name: user.name || log.userName, // Use real user name
                email: log.userEmail,
                company: companyName // Use real company name from onboarding
              },
              request: {
                requestNumber: `BO${Date.now()}`,
                submittedAt: new Date().toISOString(),
                reason: 'Number needed for business operations (Resend)',
                businessJustification: 'Required for customer service operations (Resend)'
              },
              branding: brandingSettings,
              adminEmail: log.userEmail
            };
            
            emailContent = generateAdminBackorderRequestNotificationTemplate(adminData);
          } else if (log.notificationType === 'admin_cancellation_request') {
            // Import admin cancellation template
            const { generateAdminCancellationRequestNotificationTemplate } = await import('@/lib/emailTemplates/adminNotifications');
            
            const adminData = {
              phoneNumber: {
                number: '+1234567890',
                country: 'United States',
                numberType: 'Local',
                monthlyRate: 3.50,
                setupFee: 1.00,
                currency: currentCurrency || 'EUR',
                capabilities: ['Voice', 'SMS']
              },
              user: {
                name: user.name || log.userName, // Use real user name
                email: log.userEmail,
                company: companyName // Use real company name from onboarding
              },
              request: {
                requestId: `CR${Date.now()}`,
                submittedAt: new Date().toISOString(),
                reason: 'Number no longer needed (Resend)',
                businessJustification: 'Reducing operational costs (Resend)'
              },
              branding: brandingSettings,
              adminEmail: log.userEmail
            };
            
            emailContent = generateAdminCancellationRequestNotificationTemplate(adminData);
          } else {
            // Fallback for unknown admin notification types
            emailContent = {
              subject: `Admin Notification - ${log.notificationType.replace('admin_', '').replace('_', ' ').toUpperCase()}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2>Admin Notification (Resend)</h2>
                  <p>Hello ${log.userName},</p>
                  <p>This is a resent admin notification of type: ${log.notificationType}</p>
                  <p>This notification type is not fully supported for resend functionality yet.</p>
                  <p>Best regards,<br>OVOKY Team</p>
                </div>
              `,
              text: `Admin Notification (Resend)\n\nHello ${log.userName},\n\nThis is a resent admin notification of type: ${log.notificationType}\n\nThis notification type is not fully supported for resend functionality yet.\n\nBest regards,\nOVOKY Team`
            };
          }
        } else {
          throw new Error(`Unknown notification type: ${log.notificationType}`);
        }

        // Apply [RESEND] modifications to the email content
        const resendSubject = `🔄 [RESEND] ${emailContent.subject}`;
        
        // More robust body modification that works with different template structures
        let resendBody = emailContent.html || '';
        
        // Create resend banner
        const resendBanner = `
          <div style="background-color: #e0f2fe; border: 2px solid #0891b2; border-radius: 8px; padding: 16px; margin: 20px auto; text-align: center; max-width: 560px; font-family: Arial, sans-serif;">
            <h4 style="color: #0e7490; margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">🔄 This is a resent notification</h4>
            <p style="color: #155e75; margin: 0; font-size: 14px;">This email contains updated information as of ${new Date().toLocaleString()}</p>
          </div>`;
        
        // Try multiple insertion strategies for the resend banner
        if (resendBody.includes('<body')) {
          // Strategy 1: Insert after opening body tag
          resendBody = resendBody.replace(/(<body[^>]*>)/, `$1${resendBanner}`);
        } else if (resendBody.includes('<table role="presentation"')) {
          // Strategy 2: Insert before first presentation table (for table-based templates)
          resendBody = resendBody.replace(/(<table role="presentation")/, `${resendBanner}$1`);
        } else if (resendBody.includes('<div')) {
          // Strategy 3: Insert before first div
          resendBody = resendBody.replace(/(<div)/, `${resendBanner}$1`);
        } else {
          // Strategy 4: Fallback - prepend to the content
          resendBody = resendBanner + resendBody;
        }
        
        // Add [RESEND] to main titles in the email
        resendBody = resendBody
          .replace(/(<h1[^>]*>)(?!.*\[RESEND\])/gi, '$1🔄 [RESEND] ')
          .replace(/(<h2[^>]*>)(?!.*\[RESEND\])([^<]*?)(<\/h2>)/gi, '$1🔄 [RESEND] $2$3');

        // Create a new notification log entry for the resend
        const newLog = await NotificationLog.create({
          userId: log.userId,
          userEmail: log.userEmail,
          userName: log.userName,
          sippyAccountId: log.sippyAccountId,
          notificationType: log.notificationType,
          balanceAmount: currentBalance, // Use current balance
          thresholdAmount: log.thresholdAmount,
          currency: currentCurrency,
          status: 'pending',
          emailSubject: resendSubject,
          emailBody: resendBody
        });

        // Send the email using the appropriate SMTP service based on notification type
        const smtpService = SmtpService.getInstance();
        
        let emailResult;
        
        // Determine which SMTP category to use based on notification type
        if (['low_balance', 'zero_balance', 'negative_balance', 'payment_success_gateway', 'payment_success_admin'].includes(log.notificationType)) {
          // Billing notifications
          emailResult = await smtpService.sendBillingEmail({
            to: log.userEmail,
            subject: resendSubject,
            html: resendBody,
            text: emailContent.text || ''
          });
        } else if (['email_verification', 'account_activation', 'password_reset'].includes(log.notificationType)) {
          // Authentication notifications
          emailResult = await smtpService.sendAuthenticationEmail({
            to: log.userEmail,
            subject: resendSubject,
            html: resendBody,
            text: emailContent.text || ''
          });
        } else {
          // Support notifications (phone numbers, alerts, tickets)
          emailResult = await smtpService.sendSupportEmail({
            to: log.userEmail,
            subject: resendSubject,
            html: resendBody,
            text: emailContent.text || ''
          });
        }

        if (emailResult.success) {
          // Update the log status to sent
          await NotificationLog.findByIdAndUpdate(newLog._id, {
            status: 'sent',
            sentAt: new Date(),
            fromEmail: emailResult.accountUsed?.fromEmail
          });
        
        results.success++;
          console.log(`Successfully resent ${log.notificationType} notification to ${log.userEmail} using ${emailResult.accountUsed?.name} (${emailResult.accountUsed?.category})`);
        } else {
          // Update the log status to failed
          await NotificationLog.findByIdAndUpdate(newLog._id, {
            status: 'failed',
            errorMessage: emailResult.error
          });
          
          throw new Error(`Failed to send email: ${emailResult.error}`);
        }
        
      } catch (error) {
        results.failed++;
        const errorMsg = `Failed to resend to ${log.userEmail}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Resend completed: ${results.success} successful, ${results.failed} failed`,
      results
    });

  } catch (error) {
    console.error('Error in resend endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 