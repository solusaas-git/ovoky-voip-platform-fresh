import juice from 'juice';

export interface BalanceNotificationData {
  account: {
    name: string;
    email: string;
    sippyAccountId: number;
    balance: number;
    currency: string;
  };
  threshold: number;
  notificationType: 'low_balance' | 'zero_balance' | 'negative_balance';
  branding: {
    companyName: string;
    companySlogan?: string;
    primaryColor: string;
    fontFamily: string;
  };
}

export function generateBalanceNotificationTemplate(data: BalanceNotificationData): { subject: string; html: string; text: string } {
  const { account, threshold, notificationType, branding } = data;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const formatBalance = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: account.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  // Configure alert data based on notification type
  let alertData: {
    headerColor: string;
    title: string;
    emoji: string;
    message: string;
    urgencyMessage?: string;
    buttonText: string;
  };

  switch (notificationType) {
    case 'low_balance':
      alertData = {
        headerColor: '#f59e0b',
        title: 'Low Balance Alert',
        emoji: '⚠️',
        message: `Your account balance has dropped to ${formatBalance(account.balance)}, which is below your configured threshold of ${formatBalance(threshold)}. Consider topping up to avoid service interruption.`,
        buttonText: 'Top Up Account'
      };
      break;
    case 'zero_balance':
      alertData = {
        headerColor: '#dc2626',
        title: 'Zero Balance Alert',
        emoji: '🚨',
        message: `Your account balance has reached ${formatBalance(account.balance)}. Your service may be interrupted until you add funds to your account.`,
        urgencyMessage: 'Immediate action required to maintain service',
        buttonText: 'Add Funds Now'
      };
      break;
    case 'negative_balance':
      alertData = {
        headerColor: '#991b1b',
        title: 'Negative Balance Alert',
        emoji: '🔴',
        message: `Your account balance is now ${formatBalance(account.balance)}. Your service has been suspended. Please add funds immediately to restore service.`,
        urgencyMessage: 'Service suspended - immediate payment required',
        buttonText: 'Top up account now'
      };
      break;
    default:
      throw new Error(`Unknown notification type: ${notificationType}`);
  }

  const subject = `${alertData.emoji} ${alertData.title} - ${branding.companyName}`;

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
  <title>${branding.companyName} Account Alert</title>
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
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:${branding.fontFamily},Arial,sans-serif;width:100%;min-width:100%;">
  
  <!-- Hidden preheader -->
  <div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${alertData.title} for your ${branding.companyName} account - Balance: ${formatBalance(account.balance)}
  </div>
  
  <!-- Email wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0;padding:0;background-color:#f1f5f9;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        
        <!-- Main email container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);overflow:hidden;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding:24px 20px 16px;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e293b;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">${branding.companyName}</h1>
              ${branding.companySlogan ? `<p style="margin:6px 0 0;color:#64748b;font-size:14px;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">${branding.companySlogan}</p>` : ''}
            </td>
          </tr>
          
          <!-- Alert banner -->
          <tr>
            <td style="padding:0 20px 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${alertData.headerColor};border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" style="padding:20px 16px;">
                    <h2 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">${alertData.emoji} ${alertData.title}</h2>
                    <p style="margin:6px 0 0;color:#ffffff;opacity:0.9;font-size:14px;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Account requires immediate attention</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main content -->
          <tr>
            <td style="padding:0 20px 24px;">
              
              <!-- Greeting -->
              <h3 style="margin:0 0 16px 0;font-size:18px;color:#1e293b;font-weight:600;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Hello ${account.name},</h3>
              
              <!-- Message -->
              <p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#475569;font-family:${branding.fontFamily},Arial,sans-serif;">${alertData.message}</p>
              
              <!-- Balance cards container -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <!-- Current Balance Card -->
                  <td width="48%" style="padding-right:8px;vertical-align:top;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:3px solid ${alertData.headerColor};border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td align="center" style="padding:16px 12px;">
                          <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">CURRENT BALANCE</p>
                          <p style="margin:0;font-size:22px;font-weight:800;color:${alertData.headerColor};line-height:1;font-family:${branding.fontFamily},Arial,sans-serif;">${formatBalance(account.balance)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  
                  <!-- Threshold Card -->
                  <td width="48%" style="padding-left:8px;vertical-align:top;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td align="center" style="padding:16px 12px;">
                          <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">ALERT THRESHOLD</p>
                          <p style="margin:0;font-size:22px;font-weight:800;color:#475569;line-height:1;font-family:${branding.fontFamily},Arial,sans-serif;">${formatBalance(threshold)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Account Details -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;">
                    <h4 style="margin:0 0 12px 0;font-size:14px;font-weight:700;color:#1e293b;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Account Information</h4>
                    
                    <!-- Account details rows -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td width="50%" style="padding:4px 8px 4px 0;font-size:13px;vertical-align:top;">
                          <strong style="color:#1e293b;display:block;margin-bottom:2px;font-family:${branding.fontFamily},Arial,sans-serif;">Account Name:</strong>
                          <span style="color:#475569;font-family:${branding.fontFamily},Arial,sans-serif;">${account.name}</span>
                        </td>
                        <td width="50%" style="padding:4px 0 4px 8px;font-size:13px;vertical-align:top;">
                          <strong style="color:#1e293b;display:block;margin-bottom:2px;font-family:${branding.fontFamily},Arial,sans-serif;">Account ID:</strong>
                          <span style="color:#475569;font-family:${branding.fontFamily},Arial,sans-serif;">#${account.sippyAccountId}</span>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding:4px 8px 4px 0;font-size:13px;vertical-align:top;">
                          <strong style="color:#1e293b;display:block;margin-bottom:2px;font-family:${branding.fontFamily},Arial,sans-serif;">Currency:</strong>
                          <span style="color:#475569;font-family:${branding.fontFamily},Arial,sans-serif;">${account.currency}</span>
                        </td>
                        <td width="50%" style="padding:4px 0 4px 8px;font-size:13px;vertical-align:top;">
                          <strong style="color:#1e293b;display:block;margin-bottom:2px;font-family:${branding.fontFamily},Arial,sans-serif;">Email:</strong>
                          <span style="color:#475569;word-break:break-word;font-family:${branding.fontFamily},Arial,sans-serif;">${account.email}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Urgency message -->
              ${alertData.urgencyMessage ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#fef2f2;border:2px solid #fecaca;border-radius:12px;margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" style="padding:16px;">
                    <p style="margin:0;font-size:14px;font-weight:700;color:#dc2626;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">⚠️ ${alertData.urgencyMessage}</p>
                  </td>
                </tr>
              </table>` : ''}
              
              <!-- Call to Action Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" style="border-radius:12px;background-color:${alertData.headerColor};box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                    <a href="${baseUrl}/payments" style="display:inline-block;padding:18px 32px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;text-align:center;min-width:200px;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">
                      <font color="#ffffff">${alertData.buttonText}</font>
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Help text -->
              <p style="margin:0;font-size:13px;line-height:1.4;text-align:center;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">
                Need assistance? <a href="#" style="color:${alertData.headerColor};text-decoration:none;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">Contact our support team</a>
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:20px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center">
                    <!-- Footer links -->
                    <p style="margin:0 0 12px;font-size:12px;line-height:1.4;font-family:${branding.fontFamily},Arial,sans-serif;">
                      <a href="#" style="color:${branding.primaryColor};text-decoration:none;margin:0 8px;font-family:${branding.fontFamily},Arial,sans-serif;">Support</a> •
                      <a href="${baseUrl}/dashboard" style="color:${branding.primaryColor};text-decoration:none;margin:0 8px;font-family:${branding.fontFamily},Arial,sans-serif;">Dashboard</a> •
                      <a href="${baseUrl}/payments" style="color:${branding.primaryColor};text-decoration:none;margin:0 8px;font-family:${branding.fontFamily},Arial,sans-serif;">Payments</a>
                    </p>
                    
                    <!-- Copyright -->
                    <p style="margin:0 0 6px;font-size:11px;color:#94a3b8;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">© 2024 ${branding.companyName}. All rights reserved.</p>
                    <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">This is an automated balance alert notification.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Use juice to inline CSS while preserving media queries
  const html = juice(rawHtml, {
    removeStyleTags: false,   // keeps the <style> block for the media query
    applyStyleTags: true,     // applies styles from <style> tags to elements
    preserveMediaQueries: true, // keeps @media rules intact
    webResources: {
      relativeTo: process.cwd()
    }
  });

  // Generate plain text version
  const text = `
${alertData.title.toUpperCase()} - ${branding.companyName}

Hello ${account.name},

${alertData.message}

ACCOUNT DETAILS:
- Current Balance: ${formatBalance(account.balance)}
- Threshold: ${formatBalance(threshold)}
- Account: ${account.name}
- ID: #${account.sippyAccountId}
- Currency: ${account.currency}
- Email: ${account.email}

${alertData.urgencyMessage ? `⚠️ ${alertData.urgencyMessage}` : ''}

${alertData.buttonText}: ${baseUrl}/payments

Need help? Contact support

© 2024 ${branding.companyName}. All rights reserved.
This is an automated balance alert notification.
  `;

  return { subject, html, text };
}