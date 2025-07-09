import { getEmailBrandingStyles } from '@/lib/brandingUtils';

export interface AdminUserRegistrationData {
  user: {
    name: string;
    email: string;
    registrationDate: string;
    ipAddress?: string;
  };
  branding: {
    companyName: string;
    companySlogan: string;
    primaryColor: string;
    fontFamily: string;
  };
  adminEmail: string;
}

export function generateAdminUserRegistrationTemplate(data: AdminUserRegistrationData): { subject: string; html: string; text: string } {
  const { user, branding, adminEmail } = data;
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const subject = `🆕 New User Registration - ${user.name} (${user.email})`;
  
  const rawHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="format-detection" content="telephone=no">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if !mso]><!-->
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--<![endif]-->
  <title>New User Registration - ${branding.companyName}</title>
  <style>
    /* Minimal reset for email clients */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }

    /* Mobile responsive styles */
    @media (max-width: 600px) {
      .mobile-full-width {
        width: 100% !important;
        max-width: 100% !important;
      }
      .mobile-padding {
        padding: 12px !important;
      }
      .mobile-stack {
        display: block !important;
        width: 100% !important;
        padding: 0 !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:${branding.fontFamily},Arial,sans-serif;width:100%;min-width:100%;">
  
  <!-- Hidden preheader -->
  <div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    New user registration: ${user.name} has joined ${branding.companyName}
  </div>
  
  <!-- Main container -->
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f1f5f9;min-height:100vh;">
    <tr>
      <td align="center" valign="top" style="padding:20px;">
        
        <!-- Email wrapper -->
        <table cellpadding="0" cellspacing="0" border="0" width="600" class="mobile-full-width" style="background-color:#ffffff;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.1);overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, ${branding.primaryColor} 0%, #4f46e5 100%);padding:40px 30px;text-align:center;">
              <h1 style="color:#ffffff;font-size:28px;font-weight:bold;margin:0;text-shadow:0 2px 4px rgba(0,0,0,0.1);">
                🆕 New User Registration
              </h1>
              <p style="color:#e2e8f0;font-size:16px;margin:8px 0 0 0;opacity:0.9;">
                ${branding.companyName} Admin Notification
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding:40px 30px;">
              
              <!-- Alert Box -->
              <div style="background-color:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:8px;padding:20px;margin-bottom:30px;">
                <h2 style="color:#0369a1;font-size:18px;font-weight:600;margin:0 0 8px 0;">
                  📋 Registration Details
                </h2>
                <p style="color:#0c4a6e;font-size:14px;margin:0;line-height:1.5;">
                  A new user has successfully registered on your platform.
                </p>
              </div>
              
              <!-- User Information -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fafc;border-radius:8px;overflow:hidden;margin-bottom:30px;">
                <tr>
                  <td style="padding:20px;">
                    <h3 style="color:#1e293b;font-size:16px;font-weight:600;margin:0 0 16px 0;">
                      👤 User Information
                    </h3>
                    
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                          <strong style="color:#475569;font-size:14px;">Name:</strong>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;">
                          <span style="color:#1e293b;font-size:14px;font-weight:500;">${user.name}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                          <strong style="color:#475569;font-size:14px;">Email:</strong>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;">
                          <a href="mailto:${user.email}" style="color:${branding.primaryColor};text-decoration:none;font-size:14px;font-weight:500;">${user.email}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                          <strong style="color:#475569;font-size:14px;">Registration Date:</strong>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;">
                          <span style="color:#1e293b;font-size:14px;font-weight:500;">${user.registrationDate}</span>
                        </td>
                      </tr>
                      ${user.ipAddress ? `
                      <tr>
                        <td style="padding:8px 0;">
                          <strong style="color:#475569;font-size:14px;">IP Address:</strong>
                        </td>
                        <td style="padding:8px 0;text-align:right;">
                          <span style="color:#1e293b;font-size:14px;font-weight:500;">${user.ipAddress}</span>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Action Buttons -->
              <div style="text-align:center;margin:30px 0;">
                <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                  <tr>
                    <td style="padding:0 8px;">
                      <a href="${baseUrl}/admin/users" style="display:inline-block;background-color:${branding.primaryColor};color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:16px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:all 0.3s ease;">
                        👥 View All Users
                      </a>
                    </td>
                    <td style="padding:0 8px;">
                      <a href="${baseUrl}/admin/users?search=${encodeURIComponent(user.email)}" style="display:inline-block;background-color:#64748b;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:16px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                        🔍 View User
                      </a>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Next Steps -->
              <div style="background-color:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:20px;margin-top:30px;">
                <h3 style="color:#92400e;font-size:16px;font-weight:600;margin:0 0 12px 0;">
                  📝 Next Steps
                </h3>
                <ul style="color:#a16207;font-size:14px;margin:0;padding-left:20px;line-height:1.6;">
                  <li>User will need to verify their email address before accessing the platform</li>
                  <li>Review and approve the user account if required by your policies</li>
                  <li>Assign appropriate Sippy account ID when ready</li>
                  <li>Configure user permissions and settings as needed</li>
                </ul>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#f1f5f9;padding:30px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#64748b;font-size:14px;margin:0 0 8px 0;">
                This notification was sent to <strong>${adminEmail}</strong>
              </p>
              <p style="color:#94a3b8;font-size:12px;margin:0;">
                Manage your notification preferences in the admin panel
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Generate plain text version
  const textVersion = `
New User Registration - ${branding.companyName}

A new user has registered on your platform:

User Information:
- Name: ${user.name}
- Email: ${user.email}
- Registration Date: ${user.registrationDate}
${user.ipAddress ? `- IP Address: ${user.ipAddress}` : ''}

Next Steps:
- User will need to verify their email address before accessing the platform
- Review and approve the user account if required by your policies
- Assign appropriate Sippy account ID when ready
- Configure user permissions and settings as needed

View all users: ${baseUrl}/admin/users
View this user: ${baseUrl}/admin/users?search=${encodeURIComponent(user.email)}

This notification was sent to ${adminEmail}.
Manage your notification preferences in the admin panel.
`;

  return {
    subject,
    html: rawHtml,
    text: textVersion.trim()
  };
}

// Additional Admin Notification Templates

export interface AdminUserPurchaseNotificationData {
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
  branding: {
    companyName: string;
    companySlogan: string;
    primaryColor: string;
    fontFamily: string;
  };
  adminEmail: string;
}

export function generateAdminUserPurchaseNotificationTemplate(data: AdminUserPurchaseNotificationData): { subject: string; html: string; text: string } {
  const { phoneNumber, user, purchase, purchaseType, numbersCount, purchasedNumbers, branding, adminEmail } = data;
  
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const subject = `🔔 Admin Alert: ${purchaseType === 'bulk' ? 'Bulk ' : ''}Phone Number Purchase - ${user.name}`;
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="format-detection" content="telephone=no">
  <meta name="x-apple-disable-message-reformatting">
  <title>Admin Alert - Phone Number Purchase - ${branding.companyName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:${branding.fontFamily},Arial,sans-serif;">
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0;padding:0;background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding:24px 20px 16px;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e293b;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">${branding.companyName}</h1>
              <p style="margin:6px 0 0;color:#64748b;font-size:14px;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Admin Notification System</p>
            </td>
          </tr>
          
          <!-- Alert banner -->
          <tr>
            <td style="padding:0 20px 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f59e0b;border-radius:12px;">
                <tr>
                  <td align="center" style="padding:20px 16px;">
                    <h2 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">🔔 User ${purchaseType === 'bulk' ? 'Bulk ' : ''}Purchase Alert</h2>
                    <p style="margin:6px 0 0;color:#ffffff;opacity:0.9;font-size:14px;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Purchase ID: ${purchase.purchaseId}</p>
                    ${purchaseType === 'bulk' 
                      ? `<p style="margin:8px 0 0;color:#ffffff;font-size:18px;font-weight:600;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">📞 ${numbersCount} Numbers Purchased</p>`
                      : `<p style="margin:8px 0 0;color:#ffffff;font-size:18px;font-weight:600;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">📞 ${phoneNumber.number}</p>`
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main content -->
          <tr>
            <td style="padding:0 20px 24px;">
              <h3 style="margin:0 0 16px 0;font-size:18px;color:#1e293b;font-weight:600;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Customer Purchase Summary</h3>
              
              <p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#475569;font-family:${branding.fontFamily},Arial,sans-serif;">
                <strong>${user.name}</strong> has successfully purchased ${purchaseType === 'bulk' ? `${numbersCount} phone numbers` : `the phone number ${phoneNumber.number}`}.
              </p>
              
              <!-- Customer Information -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:20px;">
                <tr>
                  <td style="padding:20px;">
                    <h4 style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#1e293b;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">👤 Customer Information</h4>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Name:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${user.name}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Email:</td>
                              <td style="font-size:14px;color:#f59e0b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;"><a href="mailto:${user.email}" style="color:#f59e0b;text-decoration:none;">${user.email}</a></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${user.company ? `
                      <tr>
                        <td style="padding:6px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Company:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${user.company}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              ${purchaseType !== 'bulk' ? `
              <!-- Single phone number details -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:2px solid #f59e0b;border-radius:12px;margin-bottom:20px;">
                <tr>
                  <td style="padding:20px;">
                    <h4 style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#1e293b;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">📞 Purchased Phone Number</h4>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Number:</td>
                              <td style="font-size:16px;color:#f59e0b;font-weight:700;font-family:${branding.fontFamily},Arial,sans-serif;">${phoneNumber.number}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Country:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${phoneNumber.country}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Type:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${phoneNumber.numberType}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Monthly Rate:</td>
                              <td style="font-size:14px;color:#f59e0b;font-weight:700;font-family:${branding.fontFamily},Arial,sans-serif;">${formatCurrency(phoneNumber.monthlyRate, phoneNumber.currency)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${phoneNumber.setupFee ? `
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Setup Fee:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${formatCurrency(phoneNumber.setupFee, phoneNumber.currency)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding:6px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Capabilities:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${phoneNumber.capabilities.join(', ')}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ` : `
              <!-- Bulk purchase phone numbers -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:2px solid #f59e0b;border-radius:12px;margin-bottom:20px;">
                <tr>
                  <td style="padding:20px;">
                    <h4 style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#1e293b;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">📞 Purchased Phone Numbers</h4>
                    
                    <div style="background-color:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px;">
                      <p style="margin:0 0 12px 0;font-size:14px;color:#475569;line-height:1.5;font-family:${branding.fontFamily},Arial,sans-serif;">
                        🎉 <strong>${numbersCount} phone numbers</strong> have been purchased by this customer:
                      </p>
                      
                      ${purchasedNumbers && purchasedNumbers.length > 0 ? `
                        <div style="max-height:200px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:6px;padding:12px;background-color:#f8fafc;">
                          ${purchasedNumbers.map((number, index) => `
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding:8px 0;border-bottom:${index < purchasedNumbers.length - 1 ? '1px solid #e2e8f0' : 'none'};">
                              <tr>
                                <td style="font-family:${branding.fontFamily},Arial,sans-serif;padding:0;">
                                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                      <td style="font-weight:600;color:#f59e0b;font-size:14px;font-family:${branding.fontFamily},Arial,sans-serif;">📞 ${number.number}</td>
                                      <td align="right" style="font-size:12px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">${number.country}</td>
                                    </tr>
                                    <tr>
                                      <td colspan="2" style="font-size:12px;color:#64748b;margin-top:2px;padding-top:2px;font-family:${branding.fontFamily},Arial,sans-serif;">
                                        ${number.numberType} • ${formatCurrency(number.monthlyRate, phoneNumber.currency)}/month${number.setupFee ? ` • Setup: ${formatCurrency(number.setupFee, phoneNumber.currency)}` : ''}
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          `).join('')}
                        </div>
                      ` : `
                        <p style="margin:8px 0 0;font-size:13px;color:#64748b;line-height:1.4;font-family:${branding.fontFamily},Arial,sans-serif;">
                          View the complete list of purchased phone numbers in the admin panel.
                        </p>
                      `}
                    </div>
                  </td>
                </tr>
              </table>
              `}
              
              <!-- Purchase details -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:20px;">
                <tr>
                  <td style="padding:20px;">
                    <h4 style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#1e293b;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Purchase Details</h4>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Purchase ID:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${purchase.purchaseId}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Total Amount:</td>
                              <td style="font-size:14px;color:#f59e0b;font-weight:700;font-family:${branding.fontFamily},Arial,sans-serif;">${formatCurrency(purchase.totalAmount, phoneNumber.currency)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Purchase Date:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${new Date(purchase.purchaseDate).toLocaleDateString()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Billing Start:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${new Date(purchase.billingStartDate).toLocaleDateString()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Next Billing:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${new Date(purchase.nextBillingDate).toLocaleDateString()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Call to action -->
              <div style="text-align:center;margin-bottom:20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
                  <tr>
                    <td style="border-radius:8px;background-color:${branding.primaryColor};padding:14px 28px;">
                      <a href="${baseUrl}/admin/users?search=${encodeURIComponent(user.email)}" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;font-family:${branding.fontFamily},Arial,sans-serif;">View Customer Account</a>
                    </td>
                    <td style="width:12px;"></td>
                    <td style="border-radius:8px;background-color:#f59e0b;padding:14px 28px;">
                      <a href="${baseUrl}/admin/phone-numbers" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;font-family:${branding.fontFamily},Arial,sans-serif;">Manage Phone Numbers</a>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Footer -->
              <div style="text-align:center;padding-top:20px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.4;font-family:${branding.fontFamily},Arial,sans-serif;">
                  Admin notification from ${branding.companyName}
                  <br>
                  This is an automated email. Please do not reply to this message.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `
🔔 Admin Alert: ${purchaseType === 'bulk' ? 'Bulk ' : ''}Phone Number Purchase

${purchaseType === 'bulk' 
  ? `📞 PURCHASED: ${numbersCount} phone numbers`
  : `📞 PHONE NUMBER: ${phoneNumber.number}`
}

Customer Purchase Summary:
${user.name} has successfully purchased ${purchaseType === 'bulk' ? `${numbersCount} phone numbers` : `the phone number ${phoneNumber.number}`}.

Customer Information:
- Name: ${user.name}
- Email: ${user.email}
${user.company ? `- Company: ${user.company}` : ''}

${purchaseType !== 'bulk' ? `
📞 Purchased Phone Number:
- Number: ${phoneNumber.number}
- Country: ${phoneNumber.country}
- Type: ${phoneNumber.numberType}
- Monthly Rate: ${formatCurrency(phoneNumber.monthlyRate, phoneNumber.currency)}
${phoneNumber.setupFee ? `- Setup Fee: ${formatCurrency(phoneNumber.setupFee, phoneNumber.currency)}` : ''}
- Capabilities: ${phoneNumber.capabilities.join(', ')}
` : `
📞 Purchased Phone Numbers:
${purchasedNumbers && purchasedNumbers.length > 0 
  ? purchasedNumbers.map((number, index) => 
      `${index + 1}. ${number.number} (${number.country}) - ${number.numberType} - ${formatCurrency(number.monthlyRate, phoneNumber.currency)}/month${number.setupFee ? ` + ${formatCurrency(number.setupFee, phoneNumber.currency)} setup` : ''}`
    ).join('\n')
  : `- Total numbers purchased: ${numbersCount}\n- View complete list in the admin panel`
}
`}

Purchase Details:
- Purchase ID: ${purchase.purchaseId}
- Total Amount: ${formatCurrency(purchase.totalAmount, phoneNumber.currency)}
- Purchase Date: ${new Date(purchase.purchaseDate).toLocaleDateString()}
- Billing Start: ${new Date(purchase.billingStartDate).toLocaleDateString()}
- Next Billing: ${new Date(purchase.nextBillingDate).toLocaleDateString()}

Quick Actions:
- View Customer Account: ${baseUrl}/admin/users?search=${encodeURIComponent(user.email)}
- Manage Phone Numbers: ${baseUrl}/admin/phone-numbers

---
Admin notification from ${branding.companyName}
This is an automated email. Please do not reply to this message.
`;

  return { subject, html, text: text.trim() };
}

export interface AdminBackorderRequestNotificationData {
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
  branding: {
    companyName: string;
    companySlogan: string;
    primaryColor: string;
    fontFamily: string;
  };
  adminEmail: string;
}

export function generateAdminBackorderRequestNotificationTemplate(data: AdminBackorderRequestNotificationData): { subject: string; html: string; text: string } {
  const { phoneNumber, user, request, branding, adminEmail } = data;
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const subject = `📋 New Backorder Request - ${phoneNumber.number}`;
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Backorder Request - ${branding.companyName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:${branding.fontFamily},Arial,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color:#ffffff;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg, ${branding.primaryColor} 0%, #4f46e5 100%);padding:40px 30px;text-align:center;">
              <h1 style="color:#ffffff;font-size:28px;font-weight:bold;margin:0;">
                📋 New Backorder Request
              </h1>
              <p style="color:#e2e8f0;font-size:16px;margin:8px 0 0 0;">
                ${branding.companyName} Admin Notification
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 30px;">
              <div style="background-color:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:20px;margin-bottom:30px;">
                <h2 style="color:#92400e;font-size:18px;font-weight:600;margin:0 0 8px 0;">
                  ⏳ Action Required
                </h2>
                <p style="color:#a16207;font-size:14px;margin:0;">
                  A user has submitted a backorder request that requires your review.
                </p>
              </div>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fafc;border-radius:8px;margin-bottom:30px;">
                <tr>
                  <td style="padding:20px;">
                    <h3 style="color:#1e293b;font-size:16px;font-weight:600;margin:0 0 16px 0;">
                      📱 Requested Number
                    </h3>
                    <p style="margin:8px 0;"><strong>Number:</strong> ${phoneNumber.number}</p>
                    <p style="margin:8px 0;"><strong>Country:</strong> ${phoneNumber.country}</p>
                    <p style="margin:8px 0;"><strong>Type:</strong> ${phoneNumber.numberType}</p>
                    <p style="margin:8px 0;"><strong>Monthly Rate:</strong> ${phoneNumber.monthlyRate} ${phoneNumber.currency}</p>
                    <p style="margin:8px 0;"><strong>Capabilities:</strong> ${phoneNumber.capabilities.join(', ')}</p>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fafc;border-radius:8px;margin-bottom:30px;">
                <tr>
                  <td style="padding:20px;">
                    <h3 style="color:#1e293b;font-size:16px;font-weight:600;margin:0 0 16px 0;">
                      👤 Customer Information
                    </h3>
                    <p style="margin:8px 0;"><strong>Name:</strong> ${user.name}</p>
                    <p style="margin:8px 0;"><strong>Email:</strong> <a href="mailto:${user.email}" style="color:${branding.primaryColor};">${user.email}</a></p>
                    ${user.company ? `<p style="margin:8px 0;"><strong>Company:</strong> ${user.company}</p>` : ''}
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fafc;border-radius:8px;margin-bottom:30px;">
                <tr>
                  <td style="padding:20px;">
                    <h3 style="color:#1e293b;font-size:16px;font-weight:600;margin:0 0 16px 0;">
                      📋 Request Details
                    </h3>
                    <p style="margin:8px 0;"><strong>Request #:</strong> ${request.requestNumber}</p>
                    <p style="margin:8px 0;"><strong>Submitted:</strong> ${request.submittedAt}</p>
                    ${request.reason ? `<p style="margin:8px 0;"><strong>Reason:</strong> ${request.reason}</p>` : ''}
                    ${request.businessJustification ? `<p style="margin:8px 0;"><strong>Business Justification:</strong> ${request.businessJustification}</p>` : ''}
                  </td>
                </tr>
              </table>

              <div style="text-align:center;margin:30px 0;">
                <a href="${baseUrl}/admin/phone-number-requests" style="display:inline-block;background-color:${branding.primaryColor};color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">
                  📋 Review Request
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f1f5f9;padding:30px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#64748b;font-size:14px;margin:0;">
                This notification was sent to <strong>${adminEmail}</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `
New Backorder Request - ${branding.companyName}

Requested Number: ${phoneNumber.number}
Country: ${phoneNumber.country}
Type: ${phoneNumber.numberType}
Monthly Rate: ${phoneNumber.monthlyRate} ${phoneNumber.currency}

Customer: ${user.name} (${user.email})
${user.company ? `Company: ${user.company}` : ''}

Request Details:
- Request #: ${request.requestNumber}
- Submitted: ${request.submittedAt}
${request.reason ? `- Reason: ${request.reason}` : ''}
${request.businessJustification ? `- Business Justification: ${request.businessJustification}` : ''}

Review Request: ${baseUrl}/admin/phone-number-requests
`;

  return { subject, html, text: text.trim() };
}

export interface AdminCancellationRequestNotificationData {
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
  branding: {
    companyName: string;
    companySlogan: string;
    primaryColor: string;
    fontFamily: string;
  };
  adminEmail: string;
}

export function generateAdminCancellationRequestNotificationTemplate(data: AdminCancellationRequestNotificationData): { subject: string; html: string; text: string } {
  const { phoneNumber, user, request, branding, adminEmail } = data;
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const subject = `❌ Cancellation Request - ${phoneNumber.number}`;
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cancellation Request - ${branding.companyName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:${branding.fontFamily},Arial,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color:#ffffff;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg, ${branding.primaryColor} 0%, #4f46e5 100%);padding:40px 30px;text-align:center;">
              <h1 style="color:#ffffff;font-size:28px;font-weight:bold;margin:0;">
                ❌ Cancellation Request
              </h1>
              <p style="color:#e2e8f0;font-size:16px;margin:8px 0 0 0;">
                ${branding.companyName} Admin Notification
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 30px;">
              <div style="background-color:#fee2e2;border-left:4px solid #ef4444;border-radius:8px;padding:20px;margin-bottom:30px;">
                <h2 style="color:#dc2626;font-size:18px;font-weight:600;margin:0 0 8px 0;">
                  ⚠️ Cancellation Request
                </h2>
                <p style="color:#b91c1c;font-size:14px;margin:0;">
                  A user has requested to cancel their phone number.
                </p>
              </div>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fafc;border-radius:8px;margin-bottom:30px;">
                <tr>
                  <td style="padding:20px;">
                    <h3 style="color:#1e293b;font-size:16px;font-weight:600;margin:0 0 16px 0;">
                      📱 Phone Number to Cancel
                    </h3>
                    <p style="margin:8px 0;"><strong>Number:</strong> ${phoneNumber.number}</p>
                    <p style="margin:8px 0;"><strong>Country:</strong> ${phoneNumber.country}</p>
                    <p style="margin:8px 0;"><strong>Type:</strong> ${phoneNumber.numberType}</p>
                    <p style="margin:8px 0;"><strong>Monthly Rate:</strong> ${phoneNumber.monthlyRate} ${phoneNumber.currency}</p>
                    <p style="margin:8px 0;"><strong>Capabilities:</strong> ${phoneNumber.capabilities.join(', ')}</p>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fafc;border-radius:8px;margin-bottom:30px;">
                <tr>
                  <td style="padding:20px;">
                    <h3 style="color:#1e293b;font-size:16px;font-weight:600;margin:0 0 16px 0;">
                      👤 Customer Information
                    </h3>
                    <p style="margin:8px 0;"><strong>Name:</strong> ${user.name}</p>
                    <p style="margin:8px 0;"><strong>Email:</strong> <a href="mailto:${user.email}" style="color:${branding.primaryColor};">${user.email}</a></p>
                    ${user.company ? `<p style="margin:8px 0;"><strong>Company:</strong> ${user.company}</p>` : ''}
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fafc;border-radius:8px;margin-bottom:30px;">
                <tr>
                  <td style="padding:20px;">
                    <h3 style="color:#1e293b;font-size:16px;font-weight:600;margin:0 0 16px 0;">
                      📋 Request Details
                    </h3>
                    <p style="margin:8px 0;"><strong>Request ID:</strong> ${request.requestId}</p>
                    <p style="margin:8px 0;"><strong>Submitted:</strong> ${request.submittedAt}</p>
                    ${request.reason ? `<p style="margin:8px 0;"><strong>Reason:</strong> ${request.reason}</p>` : ''}
                    ${request.businessJustification ? `<p style="margin:8px 0;"><strong>Business Justification:</strong> ${request.businessJustification}</p>` : ''}
                  </td>
                </tr>
              </table>

              <div style="text-align:center;margin:30px 0;">
                <a href="${baseUrl}/admin/phone-numbers" style="display:inline-block;background-color:${branding.primaryColor};color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">
                  📋 Review Request
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f1f5f9;padding:30px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#64748b;font-size:14px;margin:0;">
                This notification was sent to <strong>${adminEmail}</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `
Cancellation Request - ${branding.companyName}

Phone Number to Cancel: ${phoneNumber.number}
Country: ${phoneNumber.country}
Type: ${phoneNumber.numberType}
Monthly Rate: ${phoneNumber.monthlyRate} ${phoneNumber.currency}

Customer: ${user.name} (${user.email})
${user.company ? `Company: ${user.company}` : ''}

Request Details:
- Request ID: ${request.requestId}
- Submitted: ${request.submittedAt}
${request.reason ? `- Reason: ${request.reason}` : ''}
${request.businessJustification ? `- Business Justification: ${request.businessJustification}` : ''}

Review Request: ${baseUrl}/admin/phone-numbers
`;

  return { subject, html, text: text.trim() };
}