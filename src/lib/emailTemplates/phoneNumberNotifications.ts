import juice from 'juice';

// Base interface for common phone number data
interface BasePhoneNumberData {
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
  branding: {
    companyName: string;
    companySlogan?: string;
    primaryColor: string;
    fontFamily: string;
  };
}

// Backorder request approval/rejection
export interface BackorderNotificationData extends BasePhoneNumberData {
  request: {
    requestNumber: string;
    status: 'approved' | 'rejected';
    reason?: string;
    reviewNotes?: string;
    submittedAt: string;
    reviewedAt: string;
    reviewedBy: string;
  };
  requestType?: 'single' | 'bulk'; // Type of backorder request
  numbersCount?: number; // For bulk backorder requests
  requestedNumbers?: Array<{
    number: string;
    country: string;
    numberType: string;
    monthlyRate: number;
    setupFee?: number;
    capabilities: string[];
    status?: 'approved' | 'rejected' | 'partial'; // Individual number status
  }>; // List of requested numbers for bulk backorders
}

// Cancellation request approval/rejection
export interface CancellationNotificationData extends BasePhoneNumberData {
  request: {
    requestId: string;
    status: 'approved' | 'rejected';
    reason?: string;
    adminNotes?: string;
    submittedAt: string;
    reviewedAt: string;
    reviewedBy: string;
  };
}

// Number purchase confirmation
export interface NumberPurchaseNotificationData extends BasePhoneNumberData {
  purchase: {
    purchaseId: string;
    purchaseDate: string;
    totalAmount: number;
    billingStartDate: string;
    nextBillingDate: string;
  };
  purchaseType: 'direct' | 'bulk';
  numbersCount?: number; // For bulk purchases
  purchasedNumbers?: Array<{
    number: string;
    country: string;
    numberType: string;
    monthlyRate: number;
    setupFee?: number;
    capabilities: string[];
  }>; // List of purchased numbers for bulk purchases
}

// Admin assignment notification
export interface NumberAssignmentNotificationData extends BasePhoneNumberData {
  assignment: {
    assignmentId: string;
    assignedAt: string;
    assignedBy: string;
    notes?: string;
    billingStartDate: string;
    nextBillingDate: string;
  };
}

// Admin unassignment notification
export interface NumberUnassignmentNotificationData extends BasePhoneNumberData {
  unassignment: {
    unassignedAt: string;
    unassignedBy: string;
    reason?: string;
    notes?: string;
  };
}

// Admin notification interfaces for user actions
export interface AdminUserPurchaseNotificationData extends BasePhoneNumberData {
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
  adminEmail: string; // Who to notify
}

export interface AdminBackorderRequestNotificationData extends BasePhoneNumberData {
  request: {
    requestNumber: string;
    submittedAt: string;
    reason?: string;
    businessJustification?: string;
  };
  requestType?: 'single' | 'bulk';
  numbersCount?: number;
  adminEmail: string; // Who to notify
}

export interface AdminCancellationRequestNotificationData extends BasePhoneNumberData {
  request: {
    requestId: string;
    submittedAt: string;
    reason?: string;
    businessJustification?: string;
  };
  adminEmail: string; // Who to notify
}

export function generateBackorderNotificationTemplate(data: BackorderNotificationData): { subject: string; html: string; text: string } {
  const { phoneNumber, user, request, requestType = 'single', numbersCount, requestedNumbers, branding } = data;
  const isApproved = request.status === 'approved';
  
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const headerColor = isApproved ? '#10b981' : '#ef4444';
  const icon = isApproved ? '✅' : '❌';
  const title = isApproved ? 'Backorder Request Approved!' : 'Backorder Request Rejected';
  
  const subject = `${icon} ${title} - Request #${request.requestNumber} - ${branding.companyName}`;

  const rawHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="format-detection" content="telephone=no">
  <meta name="x-apple-disable-message-reformatting">
  <title>${branding.companyName} Backorder Request Update</title>
  <style>
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

    /* Responsive design */
    @media only screen and (max-width: 600px) {
      .mobile-padding {
        padding-left: 16px !important;
        padding-right: 16px !important;
      }
      
      .mobile-center {
        text-align: center !important;
      }
      
      .mobile-stack {
        display: block !important;
        width: 100% !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
      }
      
      .mobile-text-sm {
        font-size: 14px !important;
        line-height: 1.4 !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:${branding.fontFamily},Arial,sans-serif;width:100%;min-width:100%;">
  
  <div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${title} for ${phoneNumber.number} - Request #${request.requestNumber}
  </div>
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0;padding:0;background-color:#f1f5f9;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);overflow:hidden;border-collapse:collapse;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding:24px 20px 16px;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e293b;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">${branding.companyName}</h1>
              ${branding.companySlogan ? `<p style="margin:6px 0 0;color:#64748b;font-size:14px;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">${branding.companySlogan}</p>` : ''}
            </td>
          </tr>
          
          <!-- Status banner -->
          <tr>
            <td style="padding:0 20px 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${headerColor};border-radius:12px;border-collapse:collapse;">
                <tr>
                  <td align="center" style="padding:20px 16px;">
                    <h2 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">${icon} ${title}</h2>
                    <p style="margin:6px 0 0;color:#ffffff;opacity:0.9;font-size:14px;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Request #${request.requestNumber}</p>
                    ${requestType === 'bulk' 
                      ? `<p style="margin:8px 0 0;color:#ffffff;font-size:18px;font-weight:600;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">📞 ${numbersCount} Numbers Requested</p>`
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
              <h3 style="margin:0 0 16px 0;font-size:18px;color:#1e293b;font-weight:600;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Hello ${user.name},</h3>
              
              <p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#475569;font-family:${branding.fontFamily},Arial,sans-serif;">
                ${isApproved 
                  ? `Your backorder request ${requestType === 'bulk' ? `for ${numbersCount} phone numbers` : `for ${phoneNumber.number}`} has been ${requestType === 'bulk' ? 'processed' : 'approved and the number has been assigned to your account'}.`
                  : `We regret to inform you that your backorder request ${requestType === 'bulk' ? `for ${numbersCount} phone numbers` : `for ${phoneNumber.number}`} has been rejected.`
                }
              </p>
              
              ${requestType === 'bulk' ? `
                <!-- Bulk backorder requested numbers -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:2px solid ${headerColor};border-radius:12px;margin-bottom:20px;border-collapse:collapse;">
                  <tr>
                    <td style="padding:20px;">
                      <h4 style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#1e293b;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">📞 Requested Phone Numbers</h4>
                      
                      <div style="background-color:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px;">
                        <p style="margin:0 0 12px 0;font-size:14px;color:#475569;line-height:1.5;font-family:${branding.fontFamily},Arial,sans-serif;">
                          ${isApproved ? '✅' : '❌'} <strong>${numbersCount} phone numbers</strong> were ${isApproved ? 'processed in your backorder request' : 'included in your rejected backorder request'}:
                        </p>
                        
                        ${requestedNumbers && requestedNumbers.length > 0 ? `
                          <div style="max-height:250px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:6px;padding:12px;background-color:#f8fafc;">
                            ${requestedNumbers.map((number, index) => {
                              const numberStatus = number.status || request.status;
                              const statusColor = numberStatus === 'approved' ? '#10b981' : numberStatus === 'rejected' ? '#ef4444' : '#f59e0b';
                              const statusIcon = numberStatus === 'approved' ? '✅' : numberStatus === 'rejected' ? '❌' : '⏳';
                              const statusText = numberStatus === 'approved' ? 'Approved' : numberStatus === 'rejected' ? 'Rejected' : 'Pending';
                              
                              return `
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;padding:8px 0;border-bottom:${index < requestedNumbers.length - 1 ? '1px solid #e2e8f0' : 'none'};">
                                  <tr>
                                    <td style="font-family:${branding.fontFamily},Arial,sans-serif;padding:0;">
                                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                                        <tr>
                                          <td style="font-weight:600;color:${headerColor};font-size:14px;font-family:${branding.fontFamily},Arial,sans-serif;">📞 ${number.number}</td>
                                          <td align="right" style="font-size:12px;color:${statusColor};font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${statusIcon} ${statusText}</td>
                                        </tr>
                                        <tr>
                                          <td style="font-size:12px;color:#64748b;margin-top:2px;padding-top:2px;font-family:${branding.fontFamily},Arial,sans-serif;">${number.country}</td>
                                          <td align="right" style="font-size:12px;color:#64748b;margin-top:2px;padding-top:2px;font-family:${branding.fontFamily},Arial,sans-serif;">${number.numberType}</td>
                                        </tr>
                                        ${isApproved && numberStatus === 'approved' ? `
                                          <tr>
                                            <td colspan="2" style="font-size:12px;color:#64748b;margin-top:2px;padding-top:2px;font-family:${branding.fontFamily},Arial,sans-serif;">
                                              ${formatCurrency(number.monthlyRate, phoneNumber.currency)}/month${number.setupFee ? ` • Setup: ${formatCurrency(number.setupFee, phoneNumber.currency)}` : ''}
                                            </td>
                                          </tr>
                                        ` : ''}
                                      </table>
                                    </td>
                                  </tr>
                                </table>
                              `;
                            }).join('')}
                          </div>
                        ` : `
                          <p style="margin:8px 0 0;font-size:13px;color:#64748b;line-height:1.4;font-family:${branding.fontFamily},Arial,sans-serif;">
                            You can view the complete list of your requested phone numbers in your account dashboard.
                          </p>
                        `}
                      </div>
                    </td>
                  </tr>
                </table>
              ` : `
                <!-- Single phone number details -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:2px solid ${headerColor};border-radius:12px;margin-bottom:20px;border-collapse:collapse;">
                  <tr>
                    <td style="padding:20px;">
                      <h4 style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#1e293b;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">📞 Phone Number Details</h4>
                      
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">
                        <tr>
                          <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">
                              <tr>
                                <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Number:</td>
                                <td style="font-size:16px;color:${headerColor};font-weight:700;font-family:${branding.fontFamily},Arial,sans-serif;">${phoneNumber.number}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">
                              <tr>
                                <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Country:</td>
                                <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${phoneNumber.country}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">
                              <tr>
                                <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Type:</td>
                                <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${phoneNumber.numberType}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        ${isApproved ? `
                          <tr>
                            <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">
                                <tr>
                                  <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Monthly Rate:</td>
                                  <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${formatCurrency(phoneNumber.monthlyRate, phoneNumber.currency)}</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          ${phoneNumber.setupFee ? `
                            <tr>
                              <td style="padding:6px 0;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">
                                  <tr>
                                    <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Setup Fee:</td>
                                    <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${formatCurrency(phoneNumber.setupFee, phoneNumber.currency)}</td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          ` : ''}
                        ` : ''}
                      </table>
                    </td>
                  </tr>
                </table>
              `}
              
              <!-- Request details -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:20px;border-collapse:collapse;">
                <tr>
                  <td style="padding:16px;">
                    <h4 style="margin:0 0 12px 0;font-size:14px;font-weight:700;color:#1e293b;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Request Information</h4>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">
                      <tr>
                        <td style="padding:4px 0;font-size:13px;vertical-align:top;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">
                            <tr>
                              <td width="30%" style="color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Request #:</td>
                              <td style="color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${request.requestNumber}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-size:13px;vertical-align:top;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">
                            <tr>
                              <td width="30%" style="color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Submitted:</td>
                              <td style="color:#1e293b;font-family:${branding.fontFamily},Arial,sans-serif;">${new Date(request.submittedAt).toLocaleDateString()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-size:13px;vertical-align:top;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">
                            <tr>
                              <td width="30%" style="color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Reviewed:</td>
                              <td style="color:#1e293b;font-family:${branding.fontFamily},Arial,sans-serif;">${new Date(request.reviewedAt).toLocaleDateString()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-size:13px;vertical-align:top;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">
                            <tr>
                              <td width="30%" style="color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Reviewed by:</td>
                              <td style="color:#1e293b;font-family:${branding.fontFamily},Arial,sans-serif;">${request.reviewedBy}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${request.reviewNotes ? `
                        <tr>
                          <td style="padding:8px 0 4px 0;font-size:13px;vertical-align:top;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">
                              <tr>
                                <td style="color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;border-top:1px solid #e2e8f0;padding-top:8px;">Notes:</td>
                              </tr>
                              <tr>
                                <td style="color:#1e293b;font-family:${branding.fontFamily},Arial,sans-serif;padding-top:4px;">${request.reviewNotes}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              ${isApproved ? `
                <p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#475569;font-family:${branding.fontFamily},Arial,sans-serif;">
                  Your phone number is now active and ready to use. Billing will begin according to your account settings.
                </p>
              ` : `
                <p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#475569;font-family:${branding.fontFamily},Arial,sans-serif;">
                  ${request.reviewNotes ? 'Please review the notes above for more information.' : 'You may submit a new request or contact support for assistance.'}
                </p>
              `}
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;border-collapse:collapse;">
                <tr>
                  <td align="center">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/phone-numbers${isApproved ? '' : '/catalog'}" 
                       style="display:inline-block;padding:12px 24px;background-color:${branding.primaryColor};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;font-family:${branding.fontFamily},Arial,sans-serif;">
                      ${isApproved ? 'View My Numbers' : 'Browse Phone Numbers'}
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin:20px 0 0 0;font-size:14px;line-height:1.4;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">
                If you have any questions, please contact our support team.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Inline CSS with juice for email client compatibility
  const html = juice(rawHtml, {
    removeStyleTags: false,
    applyStyleTags: true,
    preserveMediaQueries: true,
    webResources: {
      relativeTo: process.cwd()
    }
  });
  
  const textContent = `
${title}
Request #${request.requestNumber}

${requestType === 'bulk' 
  ? `📞 REQUESTED: ${numbersCount} phone numbers`
  : `📞 PHONE NUMBER: ${phoneNumber.number}`
}

Hello ${user.name},

${isApproved 
  ? `Your backorder request ${requestType === 'bulk' ? `for ${numbersCount} phone numbers` : `for ${phoneNumber.number}`} has been ${requestType === 'bulk' ? 'processed' : 'approved and the number has been assigned to your account'}.`
  : `We regret to inform you that your backorder request ${requestType === 'bulk' ? `for ${numbersCount} phone numbers` : `for ${phoneNumber.number}`} has been rejected.`
}

${requestType === 'bulk' ? `
📞 Requested Phone Numbers:
${requestedNumbers && requestedNumbers.length > 0 
  ? requestedNumbers.map((number, index) => {
      const numberStatus = number.status || request.status;
      const statusIcon = numberStatus === 'approved' ? '✅' : numberStatus === 'rejected' ? '❌' : '⏳';
      const statusText = numberStatus === 'approved' ? 'Approved' : numberStatus === 'rejected' ? 'Rejected' : 'Pending';
      
      return `${index + 1}. ${number.number} (${number.country}) - ${number.numberType} - ${statusIcon} ${statusText}${isApproved && numberStatus === 'approved' ? ` - ${formatCurrency(number.monthlyRate, phoneNumber.currency)}/month${number.setupFee ? ` + ${formatCurrency(number.setupFee, phoneNumber.currency)} setup` : ''}` : ''}`;
    }).join('\n')
  : `- Total numbers requested: ${numbersCount}\n- View complete list in your account dashboard`
}
` : `
📞 Phone Number Details:
- Number: ${phoneNumber.number}
- Country: ${phoneNumber.country}
- Type: ${phoneNumber.numberType}
${isApproved ? `- Monthly Rate: ${formatCurrency(phoneNumber.monthlyRate, phoneNumber.currency)}` : ''}
${isApproved && phoneNumber.setupFee ? `- Setup Fee: ${formatCurrency(phoneNumber.setupFee, phoneNumber.currency)}` : ''}
`}

Request Information:
- Request #: ${request.requestNumber}
- Submitted: ${new Date(request.submittedAt).toLocaleDateString()}
- Reviewed: ${new Date(request.reviewedAt).toLocaleDateString()}
- Reviewed by: ${request.reviewedBy}
${request.reviewNotes ? `- Notes: ${request.reviewNotes}` : ''}

${isApproved 
  ? 'Your phone number is now active and ready to use. Billing will begin according to your account settings.'
  : request.reviewNotes ? 'Please review the notes above for more information.' : 'You may submit a new request or contact support for assistance.'
}

${isApproved ? 'View My Numbers' : 'Browse Phone Numbers'}: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/phone-numbers${isApproved ? '' : '/catalog'}

If you have any questions, please contact our support team.

---
${branding.companyName}
${branding.companySlogan || ''}
`;

  return {
    subject,
    html,
    text: textContent.trim()
  };
}

// Similar functions for other notification types...
export function generateCancellationNotificationTemplate(data: CancellationNotificationData): { subject: string; html: string; text: string } {
  const { phoneNumber, user, request, branding } = data;
  const isApproved = request.status === 'approved';
  
  const headerColor = isApproved ? '#10b981' : '#ef4444';
  const icon = isApproved ? '✅' : '❌';
  const title = isApproved ? 'Cancellation Request Approved' : 'Cancellation Request Rejected';
  
  const subject = `${icon} ${title} - ${phoneNumber.number} - ${branding.companyName}`;

  const rawHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="format-detection" content="telephone=no">
  <meta name="x-apple-disable-message-reformatting">
  <title>${branding.companyName} Cancellation Request Update</title>
  <style>
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

    /* Responsive design */
    @media only screen and (max-width: 600px) {
      .mobile-padding {
        padding-left: 16px !important;
        padding-right: 16px !important;
      }
      
      .mobile-center {
        text-align: center !important;
      }
      
      .mobile-stack {
        display: block !important;
        width: 100% !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
      }
      
      .mobile-text-sm {
        font-size: 14px !important;
        line-height: 1.4 !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:${branding.fontFamily},Arial,sans-serif;width:100%;min-width:100%;">
  
  <div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${title} for ${phoneNumber.number} - Request #${request.requestId}
  </div>
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0;padding:0;background-color:#f1f5f9;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);overflow:hidden;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding:24px 20px 16px;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e293b;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">${branding.companyName}</h1>
              ${branding.companySlogan ? `<p style="margin:6px 0 0;color:#64748b;font-size:14px;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">${branding.companySlogan}</p>` : ''}
            </td>
          </tr>
          
          <!-- Status banner -->
          <tr>
            <td style="padding:0 20px 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${headerColor};border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" style="padding:20px 16px;">
                    <h2 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">${icon} ${title}</h2>
                    <p style="margin:6px 0 0;color:#ffffff;opacity:0.9;font-size:14px;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Request #${request.requestId}</p>
                    <p style="margin:8px 0 0;color:#ffffff;font-size:18px;font-weight:600;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">📞 ${phoneNumber.number}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main content -->
          <tr>
            <td style="padding:0 20px 24px;">
              <h3 style="margin:0 0 16px 0;font-size:18px;color:#1e293b;font-weight:600;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Hello ${user.name},</h3>
              
              <p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#475569;font-family:${branding.fontFamily},Arial,sans-serif;">
                ${isApproved 
                  ? `Your cancellation request for ${phoneNumber.number} has been approved. The number has been removed from your account.`
                  : `Your cancellation request for ${phoneNumber.number} has been rejected.`
                }
              </p>
              
              <!-- Request details -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:2px solid ${headerColor};border-radius:12px;margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:20px;">
                    <h4 style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#1e293b;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Request Details</h4>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Phone Number:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${phoneNumber.number}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Request ID:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${request.requestId}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Submitted:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${new Date(request.submittedAt).toLocaleDateString()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Reviewed:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${new Date(request.reviewedAt).toLocaleDateString()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;${request.adminNotes ? 'border-bottom:1px solid #e2e8f0;' : ''}">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Reviewed by:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${request.reviewedBy}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${request.adminNotes ? `
                        <tr>
                          <td style="padding:6px 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                              <tr>
                                <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;vertical-align:top;">Admin Notes:</td>
                                <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${request.adminNotes}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.5;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">
                ${isApproved 
                  ? 'The phone number has been successfully removed from your account and billing has stopped.'
                  : request.adminNotes ? 'Please review the notes above for more information.' : 'You may contact support for assistance or clarification.'
                }
              </p>
              
              <!-- Call to action -->
              <div style="text-align:center;margin-bottom:20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                  <tr>
                    <td style="border-radius:8px;background-color:${branding.primaryColor};padding:14px 28px;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/phone-numbers" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;font-family:${branding.fontFamily},Arial,sans-serif;">View My Numbers</a>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Footer -->
              <div style="text-align:center;padding-top:20px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.4;font-family:${branding.fontFamily},Arial,sans-serif;">
                  If you have any questions, please contact our support team.
                  <br>
                  Thank you for choosing ${branding.companyName}
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

  // Inline CSS with juice for email client compatibility
  const html = juice(rawHtml, {
    removeStyleTags: false,
    applyStyleTags: true,
    preserveMediaQueries: true,
    webResources: {
      relativeTo: process.cwd()
    }
  });

  const textContent = `
${title}
Request #${request.requestId}

📞 PHONE NUMBER: ${phoneNumber.number}

Hello ${user.name},

${isApproved 
  ? `Your cancellation request for ${phoneNumber.number} has been approved. The number has been removed from your account.`
  : `Your cancellation request for ${phoneNumber.number} has been rejected.`
}

Request Details:
- Phone Number: ${phoneNumber.number}
- Request ID: ${request.requestId}
- Submitted: ${new Date(request.submittedAt).toLocaleDateString()}
- Reviewed: ${new Date(request.reviewedAt).toLocaleDateString()}
- Reviewed by: ${request.reviewedBy}
${request.adminNotes ? `- Admin Notes: ${request.adminNotes}` : ''}

${isApproved 
  ? 'The phone number has been successfully removed from your account and billing has stopped.'
  : request.adminNotes ? 'Please review the notes above for more information.' : 'You may contact support for assistance or clarification.'
}

View My Numbers: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/phone-numbers

If you have any questions, please contact our support team.

---
${branding.companyName}
${branding.companySlogan || ''}
`;

  return {
    subject,
    html,
    text: textContent.trim()
  };
}

export function generateNumberPurchaseNotificationTemplate(data: NumberPurchaseNotificationData): { subject: string; html: string; text: string } {
  const { phoneNumber, user, purchase, purchaseType, numbersCount, purchasedNumbers, branding } = data;
  
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const icon = '🎉';
  const title = purchaseType === 'bulk' 
    ? `Phone Numbers Purchased Successfully!`
    : 'Phone Number Purchased Successfully!';
  
  const subject = `${icon} ${title} - ${branding.companyName}`;

  const rawHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="format-detection" content="telephone=no">
  <meta name="x-apple-disable-message-reformatting">
  <title>${branding.companyName} Purchase Confirmation</title>
  <style>
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

    /* Responsive design */
    @media only screen and (max-width: 600px) {
      .mobile-padding {
        padding-left: 16px !important;
        padding-right: 16px !important;
      }
      
      .mobile-center {
        text-align: center !important;
      }
      
      .mobile-stack {
        display: block !important;
        width: 100% !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
      }
      
      .mobile-text-sm {
        font-size: 14px !important;
        line-height: 1.4 !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:${branding.fontFamily},Arial,sans-serif;width:100%;min-width:100%;">
  
  <div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${title} - Purchase ID: ${purchase.purchaseId}
  </div>
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0;padding:0;background-color:#f1f5f9;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);overflow:hidden;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding:24px 20px 16px;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e293b;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">${branding.companyName}</h1>
              ${branding.companySlogan ? `<p style="margin:6px 0 0;color:#64748b;font-size:14px;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">${branding.companySlogan}</p>` : ''}
            </td>
          </tr>
          
          <!-- Success banner -->
          <tr>
            <td style="padding:0 20px 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#10b981;border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" style="padding:20px 16px;">
                    <h2 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">${icon} ${title}</h2>
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
              <h3 style="margin:0 0 16px 0;font-size:18px;color:#1e293b;font-weight:600;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Hello ${user.name},</h3>
              
              <p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#475569;font-family:${branding.fontFamily},Arial,sans-serif;">
                ${purchaseType === 'bulk' 
                  ? `You have successfully purchased ${numbersCount} phone numbers. Thank you for your purchase!`
                  : `You have successfully purchased the phone number ${phoneNumber.number}. Thank you for your purchase!`
                }
              </p>
              
              ${purchaseType !== 'bulk' ? `
                <!-- Single phone number details -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:2px solid #10b981;border-radius:12px;margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                  <tr>
                    <td style="padding:20px;">
                      <h4 style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#1e293b;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">📞 Your New Phone Number</h4>
                      
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                        <tr>
                          <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                              <tr>
                                <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Number:</td>
                                <td style="font-size:16px;color:#10b981;font-weight:700;font-family:${branding.fontFamily},Arial,sans-serif;">${phoneNumber.number}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                              <tr>
                                <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Country:</td>
                                <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${phoneNumber.country}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                              <tr>
                                <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Type:</td>
                                <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${phoneNumber.numberType}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                              <tr>
                                <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Monthly Rate:</td>
                                <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${formatCurrency(phoneNumber.monthlyRate, phoneNumber.currency)}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        ${phoneNumber.setupFee ? `
                          <tr>
                            <td style="padding:6px 0;">
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                                <tr>
                                  <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Setup Fee:</td>
                                  <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${formatCurrency(phoneNumber.setupFee, phoneNumber.currency)}</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        ` : ''}
                      </table>
                    </td>
                  </tr>
                </table>
              ` : `
                <!-- Bulk purchase phone numbers -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:2px solid #10b981;border-radius:12px;margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                  <tr>
                    <td style="padding:20px;">
                      <h4 style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#1e293b;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">📞 Your Purchased Phone Numbers</h4>
                      
                      <div style="background-color:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px;">
                        <p style="margin:0 0 12px 0;font-size:14px;color:#475569;line-height:1.5;font-family:${branding.fontFamily},Arial,sans-serif;">
                          🎉 <strong>${numbersCount} phone numbers</strong> have been successfully purchased and added to your account:
                        </p>
                        
                        ${purchasedNumbers && purchasedNumbers.length > 0 ? `
                          <div style="max-height:200px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:6px;padding:12px;background-color:#f8fafc;">
                            ${purchasedNumbers.map((number, index) => `
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;padding:8px 0;border-bottom:${index < purchasedNumbers.length - 1 ? '1px solid #e2e8f0' : 'none'};">
                                <tr>
                                  <td style="font-family:${branding.fontFamily},Arial,sans-serif;padding:0;">
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                                      <tr>
                                        <td style="font-weight:600;color:#10b981;font-size:14px;font-family:${branding.fontFamily},Arial,sans-serif;">📞 ${number.number}</td>
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
                            You can view the complete list of your new phone numbers in your account dashboard.
                          </p>
                        `}
                      </div>
                    </td>
                  </tr>
                </table>
              `}
              
              <!-- Purchase details -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:20px;">
                    <h4 style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#1e293b;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Purchase Details</h4>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Purchase ID:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${purchase.purchaseId}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Total Amount:</td>
                              <td style="font-size:14px;color:#10b981;font-weight:700;font-family:${branding.fontFamily},Arial,sans-serif;">${formatCurrency(purchase.totalAmount, phoneNumber.currency)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Purchase Date:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${new Date(purchase.purchaseDate).toLocaleDateString()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Billing Start:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${new Date(purchase.billingStartDate).toLocaleDateString()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
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
              
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.5;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">
                Your phone number${purchaseType === 'bulk' ? 's are' : ' is'} now active and ready to use. Billing will begin according to your account settings.
              </p>
              
              <!-- Call to action -->
              <div style="text-align:center;margin-bottom:20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                  <tr>
                    <td style="border-radius:8px;background-color:${branding.primaryColor};padding:14px 28px;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/phone-numbers" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;font-family:${branding.fontFamily},Arial,sans-serif;">View My Numbers</a>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Footer -->
              <div style="text-align:center;padding-top:20px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.4;font-family:${branding.fontFamily},Arial,sans-serif;">
                  Thank you for choosing ${branding.companyName}
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

  // Inline CSS with juice for email client compatibility
  const html = juice(rawHtml, {
    removeStyleTags: false,
    applyStyleTags: true,
    preserveMediaQueries: true,
    webResources: {
      relativeTo: process.cwd()
    }
  });

  const textContent = `
${title}

${purchaseType === 'bulk' 
  ? `📞 PURCHASED: ${numbersCount} phone numbers`
  : `📞 PHONE NUMBER: ${phoneNumber.number}`
}

Hello ${user.name},

${purchaseType === 'bulk' 
  ? `You have successfully purchased ${numbersCount} phone numbers. Thank you for your purchase!`
  : `You have successfully purchased the phone number ${phoneNumber.number}. Thank you for your purchase!`
}

${purchaseType !== 'bulk' ? `
📞 Phone Number Details:
- Number: ${phoneNumber.number}
- Country: ${phoneNumber.country}
- Type: ${phoneNumber.numberType}
- Monthly Rate: ${formatCurrency(phoneNumber.monthlyRate, phoneNumber.currency)}
${phoneNumber.setupFee ? `- Setup Fee: ${formatCurrency(phoneNumber.setupFee, phoneNumber.currency)}` : ''}
` : `
📞 Purchased Phone Numbers:
${purchasedNumbers && purchasedNumbers.length > 0 
  ? purchasedNumbers.map((number, index) => 
      `${index + 1}. ${number.number} (${number.country}) - ${number.numberType} - ${formatCurrency(number.monthlyRate, phoneNumber.currency)}/month${number.setupFee ? ` + ${formatCurrency(number.setupFee, phoneNumber.currency)} setup` : ''}`
    ).join('\n')
  : `- Total numbers purchased: ${numbersCount}\n- View complete list in your account dashboard`
}
`}

Purchase Details:
- Purchase ID: ${purchase.purchaseId}
- Total Amount: ${formatCurrency(purchase.totalAmount, phoneNumber.currency)}
- Purchase Date: ${new Date(purchase.purchaseDate).toLocaleDateString()}
- Billing Start: ${new Date(purchase.billingStartDate).toLocaleDateString()}
- Next Billing: ${new Date(purchase.nextBillingDate).toLocaleDateString()}

Your phone number${purchaseType === 'bulk' ? 's are' : ' is'} now active and ready to use. Billing will begin according to your account settings.

View My Numbers: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/phone-numbers

Thank you for choosing ${branding.companyName}

This is an automated email. Please do not reply to this message.
`;

  return {
    subject,
    html,
    text: textContent.trim()
  };
}

export function generateNumberAssignmentNotificationTemplate(data: NumberAssignmentNotificationData): { subject: string; html: string; text: string } {
  const { phoneNumber, user, assignment, branding } = data;
  
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const icon = '📞';
  const title = 'Phone Number Assigned to Your Account';
  
  const subject = `${icon} ${title} - ${phoneNumber.number} - ${branding.companyName}`;

  const rawHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="format-detection" content="telephone=no">
  <meta name="x-apple-disable-message-reformatting">
  <title>${branding.companyName} Phone Number Assignment</title>
  <style>
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

    /* Responsive design */
    @media only screen and (max-width: 600px) {
      .mobile-padding {
        padding-left: 16px !important;
        padding-right: 16px !important;
      }
      
      .mobile-center {
        text-align: center !important;
      }
      
      .mobile-stack {
        display: block !important;
        width: 100% !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
      }
      
      .mobile-text-sm {
        font-size: 14px !important;
        line-height: 1.4 !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:${branding.fontFamily},Arial,sans-serif;width:100%;min-width:100%;">
  
  <div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${title} - ${phoneNumber.number} assigned by ${assignment.assignedBy}
  </div>
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0;padding:0;background-color:#f1f5f9;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);overflow:hidden;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding:24px 20px 16px;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e293b;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">${branding.companyName}</h1>
              ${branding.companySlogan ? `<p style="margin:6px 0 0;color:#64748b;font-size:14px;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">${branding.companySlogan}</p>` : ''}
            </td>
          </tr>
          
          <!-- Assignment banner -->
          <tr>
            <td style="padding:0 20px 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#3b82f6;border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" style="padding:20px 16px;">
                    <h2 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">${icon} ${title}</h2>
                    <p style="margin:6px 0 0;color:#ffffff;opacity:0.9;font-size:14px;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Assigned by ${assignment.assignedBy}</p>
                    <p style="margin:8px 0 0;color:#ffffff;font-size:18px;font-weight:600;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">📞 ${phoneNumber.number}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main content -->
          <tr>
            <td style="padding:0 20px 24px;">
              <h3 style="margin:0 0 16px 0;font-size:18px;color:#1e293b;font-weight:600;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Hello ${user.name},</h3>
              
              <p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#475569;font-family:${branding.fontFamily},Arial,sans-serif;">
                A phone number has been assigned to your account by an administrator. The number is now active and ready to use.
              </p>
              
              <!-- Phone number details -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:2px solid #3b82f6;border-radius:12px;margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:20px;">
                    <h4 style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#1e293b;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">📞 Your New Phone Number</h4>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Number:</td>
                              <td style="font-size:16px;color:#3b82f6;font-weight:700;font-family:${branding.fontFamily},Arial,sans-serif;">${phoneNumber.number}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Country:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${phoneNumber.country}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Type:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${phoneNumber.numberType}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Monthly Rate:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${formatCurrency(phoneNumber.monthlyRate, phoneNumber.currency)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${phoneNumber.setupFee ? `
                        <tr>
                          <td style="padding:6px 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                              <tr>
                                <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Setup Fee:</td>
                                <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${formatCurrency(phoneNumber.setupFee, phoneNumber.currency)}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Assignment details -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:20px;">
                    <h4 style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#1e293b;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Assignment Details</h4>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Assigned by:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${assignment.assignedBy}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Assigned on:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${new Date(assignment.assignedAt).toLocaleDateString()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Billing Start:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${new Date(assignment.billingStartDate).toLocaleDateString()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;${assignment.notes ? 'border-bottom:1px solid #e2e8f0;' : ''}">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Next Billing:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${new Date(assignment.nextBillingDate).toLocaleDateString()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${assignment.notes ? `
                        <tr>
                          <td style="padding:6px 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                              <tr>
                                <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;vertical-align:top;">Notes:</td>
                                <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${assignment.notes}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.5;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">
                Your phone number is now active and ready to use. Billing will begin according to your account settings.
              </p>
              
              <!-- Call to action -->
              <div style="text-align:center;margin-bottom:20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                  <tr>
                    <td style="border-radius:8px;background-color:${branding.primaryColor};padding:14px 28px;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/phone-numbers" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;font-family:${branding.fontFamily},Arial,sans-serif;">View My Numbers</a>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Footer -->
              <div style="text-align:center;padding-top:20px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.4;font-family:${branding.fontFamily},Arial,sans-serif;">
                  Thank you for choosing ${branding.companyName}
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

  // Inline CSS with juice for email client compatibility
  const html = juice(rawHtml, {
    removeStyleTags: false,
    applyStyleTags: true,
    preserveMediaQueries: true,
    webResources: {
      relativeTo: process.cwd()
    }
  });

  const textContent = `
${title}

📞 PHONE NUMBER: ${phoneNumber.number}

Hello ${user.name},

A phone number has been assigned to your account by an administrator. The number is now active and ready to use.

📞 Phone Number Details:
- Number: ${phoneNumber.number}
- Country: ${phoneNumber.country}
- Type: ${phoneNumber.numberType}
- Monthly Rate: ${formatCurrency(phoneNumber.monthlyRate, phoneNumber.currency)}
${phoneNumber.setupFee ? `- Setup Fee: ${formatCurrency(phoneNumber.setupFee, phoneNumber.currency)}` : ''}

Assignment Details:
- Assigned by: ${assignment.assignedBy}
- Assigned on: ${new Date(assignment.assignedAt).toLocaleDateString()}
- Billing Start: ${new Date(assignment.billingStartDate).toLocaleDateString()}
- Next Billing: ${new Date(assignment.nextBillingDate).toLocaleDateString()}
${assignment.notes ? `- Notes: ${assignment.notes}` : ''}

Your phone number is now active and ready to use. Billing will begin according to your account settings.

View My Numbers: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/phone-numbers

Thank you for choosing ${branding.companyName}

This is an automated email. Please do not reply to this message.
`;

  return {
    subject,
    html,
    text: textContent.trim()
  };
} 

// Admin notification templates for user actions

export function generateAdminUserPurchaseNotificationTemplate(data: AdminUserPurchaseNotificationData): { subject: string; html: string; text: string } {
  const { phoneNumber, user, purchase, purchaseType, numbersCount, purchasedNumbers, branding } = data;
  
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const isPurchaseTypeDisplay = purchaseType === 'bulk' ? 'Bulk Purchase' : 'Single Purchase';
  const numbersDisplay = purchaseType === 'bulk' ? `${numbersCount} Numbers` : phoneNumber.number;
  
  const subject = `🔔 Admin Alert: User Phone Number ${isPurchaseTypeDisplay} - ${user.name} - ${branding.companyName}`;

  const rawHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${branding.companyName} Admin Alert - User Purchase</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:${branding.fontFamily},Arial,sans-serif;">
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0;padding:0;background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding:24px 20px 16px;border-bottom:2px solid #f59e0b;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e293b;">${branding.companyName}</h1>
              <p style="margin:6px 0 0;color:#64748b;font-size:14px;">Admin Notification System</p>
            </td>
          </tr>
          
          <!-- Alert banner -->
          <tr>
            <td style="padding:16px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f59e0b;border-radius:12px;">
                <tr>
                  <td align="center" style="padding:20px;">
                    <h2 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">🔔 User Phone Number ${isPurchaseTypeDisplay}</h2>
                    <p style="margin:6px 0 0;color:#ffffff;opacity:0.9;font-size:16px;font-weight:600;">${numbersDisplay}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- User Information -->
          <tr>
            <td style="padding:16px 20px;">
              <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:700;color:#1e293b;">Customer Information</h3>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border-radius:8px;">
                <tr>
                  <td style="padding:16px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td width="30%" style="font-size:14px;color:#64748b;padding:4px 0;">Name:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${user.name}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;">Email:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${user.email}</td>
                      </tr>
                      ${user.company ? `
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;">Company:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${user.company}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Purchase Details -->
          <tr>
            <td style="padding:16px 20px;">
              <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:700;color:#1e293b;">Purchase Details</h3>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border-radius:8px;">
                <tr>
                  <td style="padding:16px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td width="30%" style="font-size:14px;color:#64748b;padding:4px 0;">Purchase ID:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${purchase.purchaseId}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;">Purchase Date:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${new Date(purchase.purchaseDate).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;">Total Amount:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${formatCurrency(purchase.totalAmount, phoneNumber.currency)}</td>
                      </tr>
                      ${purchaseType === 'bulk' ? `
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;">Numbers Count:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${numbersCount} numbers</td>
                      </tr>
                      ` : `
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;">Phone Number:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${phoneNumber.number}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;">Country:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${phoneNumber.country}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;">Number Type:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${phoneNumber.numberType}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;">Monthly Rate:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${formatCurrency(phoneNumber.monthlyRate, phoneNumber.currency)}/month</td>
                      </tr>
                      `}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Quick Actions -->
          <tr>
            <td style="padding:16px 20px;">
              <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:700;color:#1e293b;">Quick Actions</h3>
              <p style="margin:0 0 12px 0;font-size:14px;color:#64748b;">Access the admin panel to manage this purchase:</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:8px 16px;background-color:${branding.primaryColor};border-radius:6px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/phone-numbers" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">View Phone Numbers</a>
                  </td>
                  <td style="width:12px;"></td>
                  <td style="padding:8px 16px;background-color:#64748b;border-radius:6px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/users" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Manage Users</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:20px;background-color:#f8fafc;text-align:center;">
              <p style="margin:0;font-size:12px;color:#64748b;">This is an automated admin notification from ${branding.companyName}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Admin Alert: User Phone Number ${isPurchaseTypeDisplay}

Customer: ${user.name} (${user.email})
${user.company ? `Company: ${user.company}` : ''}

Purchase Details:
- Purchase ID: ${purchase.purchaseId}
- Date: ${new Date(purchase.purchaseDate).toLocaleString()}
- Total Amount: ${formatCurrency(purchase.totalAmount, phoneNumber.currency)}
${purchaseType === 'bulk' ? `- Numbers Count: ${numbersCount} numbers` : `
- Phone Number: ${phoneNumber.number}
- Country: ${phoneNumber.country}
- Number Type: ${phoneNumber.numberType}
- Monthly Rate: ${formatCurrency(phoneNumber.monthlyRate, phoneNumber.currency)}/month`}

Access the admin panel to manage this purchase:
${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/phone-numbers

---
This is an automated admin notification from ${branding.companyName}`;

  return { subject, html: rawHtml, text };
}

export function generateAdminBackorderRequestNotificationTemplate(data: AdminBackorderRequestNotificationData): { subject: string; html: string; text: string } {
  const { phoneNumber, user, request, requestType, numbersCount, branding } = data;
  
  const isPurchaseTypeDisplay = requestType === 'bulk' ? 'Bulk Backorder' : 'Backorder';
  const numbersDisplay = requestType === 'bulk' ? `${numbersCount} Numbers` : phoneNumber.number;
  
  const subject = `🔔 Admin Alert: New ${isPurchaseTypeDisplay} Request - ${user.name} - ${branding.companyName}`;

  const rawHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${branding.companyName} Admin Alert - Backorder Request</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:${branding.fontFamily},Arial,sans-serif;">
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0;padding:0;background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding:24px 20px 16px;border-bottom:2px solid #8b5cf6;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e293b;">${branding.companyName}</h1>
              <p style="margin:6px 0 0;color:#64748b;font-size:14px;">Admin Notification System</p>
            </td>
          </tr>
          
          <!-- Alert banner -->
          <tr>
            <td style="padding:16px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#8b5cf6;border-radius:12px;">
                <tr>
                  <td align="center" style="padding:20px;">
                    <h2 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">🔔 New ${isPurchaseTypeDisplay} Request</h2>
                    <p style="margin:6px 0 0;color:#ffffff;opacity:0.9;font-size:16px;font-weight:600;">${numbersDisplay}</p>
                    <p style="margin:8px 0 0;color:#ffffff;font-size:14px;">Request #${request.requestNumber}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Customer Information -->
          <tr>
            <td style="padding:16px 20px;">
              <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:700;color:#1e293b;">Customer Information</h3>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border-radius:8px;">
                <tr>
                  <td style="padding:16px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td width="30%" style="font-size:14px;color:#64748b;padding:4px 0;">Name:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${user.name}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;">Email:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${user.email}</td>
                      </tr>
                      ${user.company ? `
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;">Company:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${user.company}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Request Details -->
          <tr>
            <td style="padding:16px 20px;">
              <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:700;color:#1e293b;">Request Details</h3>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border-radius:8px;">
                <tr>
                  <td style="padding:16px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td width="30%" style="font-size:14px;color:#64748b;padding:4px 0;">Request Number:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${request.requestNumber}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;">Submitted:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${new Date(request.submittedAt).toLocaleString()}</td>
                      </tr>
                      ${requestType === 'bulk' ? `
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;">Numbers Count:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${numbersCount} numbers</td>
                      </tr>
                      ` : `
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;">Phone Number:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${phoneNumber.number}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;">Country:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${phoneNumber.country}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;">Number Type:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${phoneNumber.numberType}</td>
                      </tr>
                      `}
                      ${request.reason ? `
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;vertical-align:top;">Reason:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${request.reason}</td>
                      </tr>
                      ` : ''}
                      ${request.businessJustification ? `
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;vertical-align:top;">Justification:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${request.businessJustification}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Action Required -->
          <tr>
            <td style="padding:16px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#fef3c7;border:1px solid #f59e0b;border-radius:8px;">
                <tr>
                  <td style="padding:16px;">
                    <h3 style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#92400e;">⚠️ Action Required</h3>
                    <p style="margin:0 0 12px 0;font-size:14px;color:#92400e;">This backorder request requires admin review and approval.</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:8px 16px;background-color:${branding.primaryColor};border-radius:6px;">
                          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/backorder-requests" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Review Request</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:20px;background-color:#f8fafc;text-align:center;">
              <p style="margin:0;font-size:12px;color:#64748b;">This is an automated admin notification from ${branding.companyName}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Admin Alert: New ${isPurchaseTypeDisplay} Request

Customer: ${user.name} (${user.email})
${user.company ? `Company: ${user.company}` : ''}

Request Details:
- Request Number: ${request.requestNumber}
- Submitted: ${new Date(request.submittedAt).toLocaleString()}
${requestType === 'bulk' ? `- Numbers Count: ${numbersCount} numbers` : `
- Phone Number: ${phoneNumber.number}
- Country: ${phoneNumber.country}
- Number Type: ${phoneNumber.numberType}`}
${request.reason ? `- Reason: ${request.reason}` : ''}
${request.businessJustification ? `- Justification: ${request.businessJustification}` : ''}

ACTION REQUIRED: This backorder request requires admin review and approval.
Review at: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/backorder-requests

---
This is an automated admin notification from ${branding.companyName}`;

  return { subject, html: rawHtml, text };
}

export function generateAdminCancellationRequestNotificationTemplate(data: AdminCancellationRequestNotificationData): { subject: string; html: string; text: string } {
  const { phoneNumber, user, request, branding } = data;
  
  const subject = `🔔 Admin Alert: New Cancellation Request - ${phoneNumber.number} - ${user.name} - ${branding.companyName}`;

  const rawHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${branding.companyName} Admin Alert - Cancellation Request</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:${branding.fontFamily},Arial,sans-serif;">
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0;padding:0;background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding:24px 20px 16px;border-bottom:2px solid #ef4444;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e293b;">${branding.companyName}</h1>
              <p style="margin:6px 0 0;color:#64748b;font-size:14px;">Admin Notification System</p>
            </td>
          </tr>
          
          <!-- Alert banner -->
          <tr>
            <td style="padding:16px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ef4444;border-radius:12px;">
                <tr>
                  <td align="center" style="padding:20px;">
                    <h2 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">🔔 New Cancellation Request</h2>
                    <p style="margin:6px 0 0;color:#ffffff;opacity:0.9;font-size:16px;font-weight:600;">${phoneNumber.number}</p>
                    <p style="margin:8px 0 0;color:#ffffff;font-size:14px;">Request #${request.requestId}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Customer Information -->
          <tr>
            <td style="padding:16px 20px;">
              <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:700;color:#1e293b;">Customer Information</h3>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border-radius:8px;">
                <tr>
                  <td style="padding:16px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td width="30%" style="font-size:14px;color:#64748b;padding:4px 0;">Name:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${user.name}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;">Email:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${user.email}</td>
                      </tr>
                      ${user.company ? `
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;">Company:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${user.company}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Phone Number Details -->
          <tr>
            <td style="padding:16px 20px;">
              <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:700;color:#1e293b;">Phone Number Details</h3>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border-radius:8px;">
                <tr>
                  <td style="padding:16px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td width="30%" style="font-size:14px;color:#64748b;padding:4px 0;">Phone Number:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${phoneNumber.number}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;">Country:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${phoneNumber.country}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;">Number Type:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${phoneNumber.numberType}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;">Monthly Rate:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${new Intl.NumberFormat('en-US', { style: 'currency', currency: phoneNumber.currency }).format(phoneNumber.monthlyRate)}/month</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Request Details -->
          <tr>
            <td style="padding:16px 20px;">
              <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:700;color:#1e293b;">Cancellation Request</h3>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border-radius:8px;">
                <tr>
                  <td style="padding:16px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td width="30%" style="font-size:14px;color:#64748b;padding:4px 0;">Request ID:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${request.requestId}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;">Submitted:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${new Date(request.submittedAt).toLocaleString()}</td>
                      </tr>
                      ${request.reason ? `
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;vertical-align:top;">Reason:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${request.reason}</td>
                      </tr>
                      ` : ''}
                      ${request.businessJustification ? `
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding:4px 0;vertical-align:top;">Justification:</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;padding:4px 0;">${request.businessJustification}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Action Required -->
          <tr>
            <td style="padding:16px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#fef3c7;border:1px solid #f59e0b;border-radius:8px;">
                <tr>
                  <td style="padding:16px;">
                    <h3 style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#92400e;">⚠️ Action Required</h3>
                    <p style="margin:0 0 12px 0;font-size:14px;color:#92400e;">This cancellation request requires admin review and approval.</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:8px 16px;background-color:${branding.primaryColor};border-radius:6px;">
                          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/phone-numbers/requests" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Review Request</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:20px;background-color:#f8fafc;text-align:center;">
              <p style="margin:0;font-size:12px;color:#64748b;">This is an automated admin notification from ${branding.companyName}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Admin Alert: New Cancellation Request

Customer: ${user.name} (${user.email})
${user.company ? `Company: ${user.company}` : ''}

Phone Number Details:
- Phone Number: ${phoneNumber.number}
- Country: ${phoneNumber.country}
- Number Type: ${phoneNumber.numberType}
- Monthly Rate: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: phoneNumber.currency }).format(phoneNumber.monthlyRate)}/month

Cancellation Request:
- Request ID: ${request.requestId}
- Submitted: ${new Date(request.submittedAt).toLocaleString()}
${request.reason ? `- Reason: ${request.reason}` : ''}
${request.businessJustification ? `- Justification: ${request.businessJustification}` : ''}

ACTION REQUIRED: This cancellation request requires admin review and approval.
Review at: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/phone-numbers/requests

---
This is an automated admin notification from ${branding.companyName}`;

  return { subject, html: rawHtml, text };
}

export function generateNumberUnassignmentNotificationTemplate(data: NumberUnassignmentNotificationData): { subject: string; html: string; text: string } {
  const { phoneNumber, user, unassignment, branding } = data;
  
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const icon = '📞';
  const title = 'Phone Number Unassigned from Your Account';
  
  const subject = `${icon} ${title} - ${phoneNumber.number} - ${branding.companyName}`;

  const rawHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="format-detection" content="telephone=no">
  <meta name="x-apple-disable-message-reformatting">
  <title>${branding.companyName}</title>
  <style>
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

    /* Responsive design */
    @media only screen and (max-width: 600px) {
      .mobile-padding {
        padding-left: 16px !important;
        padding-right: 16px !important;
      }
      
      .mobile-center {
        text-align: center !important;
      }
      
      .mobile-stack {
        display: block !important;
        width: 100% !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
      }
      
      .mobile-text-sm {
        font-size: 14px !important;
        line-height: 1.4 !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:${branding.fontFamily},Arial,sans-serif;width:100%;min-width:100%;">
  
  <div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${title} - ${phoneNumber.number} unassigned by ${unassignment.unassignedBy}
  </div>
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0;padding:0;background-color:#f1f5f9;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);overflow:hidden;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding:24px 20px 16px;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e293b;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">${branding.companyName}</h1>
              ${branding.companySlogan ? `<p style="margin:6px 0 0;color:#64748b;font-size:14px;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">${branding.companySlogan}</p>` : ''}
            </td>
          </tr>
          
          <!-- Unassignment banner -->
          <tr>
            <td style="padding:0 20px 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f59e0b;border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" style="padding:20px 16px;">
                    <h2 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">${icon} ${title}</h2>
                    <p style="margin:6px 0 0;color:#ffffff;opacity:0.9;font-size:14px;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Unassigned by ${unassignment.unassignedBy}</p>
                    <p style="margin:8px 0 0;color:#ffffff;font-size:18px;font-weight:600;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">📞 ${phoneNumber.number}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main content -->
          <tr>
            <td style="padding:0 20px 24px;">
              <h3 style="margin:0 0 16px 0;font-size:18px;color:#1e293b;font-weight:600;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Hello ${user.name},</h3>
              
              <p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#475569;font-family:${branding.fontFamily},Arial,sans-serif;">
                A phone number has been unassigned from your account by an administrator. The number is no longer available to you and billing has been stopped.
              </p>
              
              <!-- Phone number details -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#fef3cd;border:2px solid #f59e0b;border-radius:12px;margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:20px;">
                    <h4 style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#92400e;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">📞 Unassigned Phone Number</h4>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #fbbf24;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#92400e;font-family:${branding.fontFamily},Arial,sans-serif;">Number:</td>
                              <td style="font-size:16px;color:#f59e0b;font-weight:700;font-family:${branding.fontFamily},Arial,sans-serif;">${phoneNumber.number}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #fbbf24;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#92400e;font-family:${branding.fontFamily},Arial,sans-serif;">Country:</td>
                              <td style="font-size:14px;color:#92400e;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${phoneNumber.country}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #fbbf24;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#92400e;font-family:${branding.fontFamily},Arial,sans-serif;">Type:</td>
                              <td style="font-size:14px;color:#92400e;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${phoneNumber.numberType}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#92400e;font-family:${branding.fontFamily},Arial,sans-serif;">Was:</td>
                              <td style="font-size:14px;color:#92400e;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${formatCurrency(phoneNumber.monthlyRate, phoneNumber.currency)}/month</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Unassignment details -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:20px;">
                    <h4 style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#1e293b;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Unassignment Details</h4>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Unassigned by:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${unassignment.unassignedBy}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;${unassignment.reason ? 'border-bottom:1px solid #e2e8f0;' : ''}">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Unassigned on:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${new Date(unassignment.unassignedAt).toLocaleDateString()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${unassignment.reason ? `
                        <tr>
                          <td style="padding:6px 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                              <tr>
                                <td width="40%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;vertical-align:top;">Reason:</td>
                                <td style="font-size:14px;color:#1e293b;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${unassignment.reason}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.5;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">
                This phone number is no longer available to you and billing has been stopped. If you have any questions about this change, please contact support.
              </p>
              
              <!-- Call to action -->
              <div style="text-align:center;margin-bottom:20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                  <tr>
                    <td style="border-radius:8px;background-color:${branding.primaryColor};padding:14px 28px;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/phone-numbers" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;font-family:${branding.fontFamily},Arial,sans-serif;">View My Numbers</a>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Footer -->
              <div style="text-align:center;padding-top:20px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.4;font-family:${branding.fontFamily},Arial,sans-serif;">
                  Thank you for choosing ${branding.companyName}
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

  // Inline CSS with juice for email client compatibility
  const html = juice(rawHtml, {
    removeStyleTags: false,
    applyStyleTags: true,
    preserveMediaQueries: true,
    webResources: {
      relativeTo: process.cwd()
    }
  });

  const textContent = `
${title}

📞 PHONE NUMBER: ${phoneNumber.number}

Hello ${user.name},

A phone number has been unassigned from your account by an administrator. The number is no longer available to you and billing has been stopped.

📞 Phone Number Details:
- Number: ${phoneNumber.number}
- Country: ${phoneNumber.country}
- Type: ${phoneNumber.numberType}
- Monthly Rate: ${formatCurrency(phoneNumber.monthlyRate, phoneNumber.currency)}

Unassignment Details:
- Unassigned by: ${unassignment.unassignedBy}
- Unassigned on: ${new Date(unassignment.unassignedAt).toLocaleDateString()}
${unassignment.reason ? `- Reason: ${unassignment.reason}` : ''}

This phone number is no longer available to you and billing has been stopped. If you have any questions about this change, please contact support.

View My Numbers: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/phone-numbers

Thank you for choosing ${branding.companyName}

This is an automated email. Please do not reply to this message.
`;

  return {
    subject,
    html,
    text: textContent.trim()
  };
}