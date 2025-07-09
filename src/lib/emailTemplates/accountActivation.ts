import juice from 'juice';

export interface AccountActivationData {
  name: string;
  sippyAccountId: number;
  branding: {
    companyName: string;
    companySlogan?: string;
    primaryColor: string;
    fontFamily: string;
  };
}

export function generateAccountActivationTemplate(data: AccountActivationData): { subject: string; html: string; text: string } {
  const { name, sippyAccountId, branding } = data;
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const subject = `🎉 Your ${branding.companyName} Account is Now Active!`;
  
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
  <title>Account Activated - ${branding.companyName}</title>
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
    Your ${branding.companyName} account has been activated and is ready for use
  </div>
  
  <!-- Email wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0;padding:0;background-color:#f1f5f9;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        
        <!-- Main email container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="mobile-full-width" style="max-width:600px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);overflow:hidden;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
          
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
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#059669;border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" style="padding:20px 16px;">
                    <h2 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">🎉 Account Activated!</h2>
                    <p style="margin:6px 0 0;color:#ffffff;opacity:0.9;font-size:14px;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Your ${branding.companyName} account is now ready for calls</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding:0 20px 24px;">
              
              <!-- Greeting -->
              <h3 style="margin:0 0 16px 0;font-size:18px;color:#1e293b;font-weight:600;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Great news, ${name}!</h3>
              
              <!-- Message -->
              <p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#475569;font-family:${branding.fontFamily},Arial,sans-serif;">
                Your account verification is complete! Our team has reviewed and approved your registration. 
                You can now access all ${branding.companyName} features and start making calls.
              </p>

              <!-- Account Details Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:3px solid #0ea5e9;border-radius:12px;margin:24px 0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:20px;">
                    <h4 style="margin:0 0 16px 0;font-size:16px;font-weight:600;color:#0c4a6e;text-align:center;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">📋 Your Account Details</h4>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td style="padding:8px 0;font-size:14px;border-bottom:1px solid #bae6fd;font-family:${branding.fontFamily},Arial,sans-serif;">
                          <strong style="color:#0c4a6e;font-weight:700;">Account Name:</strong> 
                          <span style="color:#075985;float:right;font-family:${branding.fontFamily},Arial,sans-serif;">${name}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:14px;font-family:${branding.fontFamily},Arial,sans-serif;">
                          <strong style="color:#0c4a6e;font-weight:700;">Status:</strong> 
                          <span style="color:#059669;float:right;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">✅ Active</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Account ID -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:3px solid #0891b2;border-radius:12px;margin:20px 0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td style="font-size:14px;font-family:${branding.fontFamily},Arial,sans-serif;">
                          <strong style="color:#0c4a6e;font-weight:700;">Account ID:</strong>
                        </td>
                        <td align="right" style="font-size:14px;font-family:${branding.fontFamily},Arial,sans-serif;">
                          <span style="color:#075985;font-family:Consolas,Monaco,monospace,${branding.fontFamily};font-weight:600;">#${sippyAccountId}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- What's Next Section -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:3px solid #bbf7d0;border-radius:12px;margin:20px 0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;">
                    <h4 style="margin:0 0 12px 0;font-size:15px;font-weight:600;color:#166534;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">🚀 What's Next?</h4>
                    <ul style="margin:0;padding-left:20px;color:#15803d;font-size:14px;line-height:1.6;font-family:${branding.fontFamily},Arial,sans-serif;">
                      <li style="margin-bottom:4px;">Access your dashboard to view account balance and call history</li>
                      <li style="margin-bottom:4px;">Configure your calling preferences and settings</li>
                      <li style="margin-bottom:4px;">Set up low balance notifications to avoid service interruption</li>
                      <li style="margin-bottom:4px;">Start making calls through your ${branding.companyName} account</li>
                      <li>Monitor your usage and billing in real-time</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- CTA Buttons -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:24px auto;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:0 8px;" class="mobile-stack">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td align="center" style="border-radius:12px;background-color:${branding.primaryColor};box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                          <a href="${baseUrl}/dashboard" style="display:inline-block;padding:16px 32px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;text-align:center;min-width:160px;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">
                            <font color="#ffffff">Access Dashboard</font>
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding:0 8px;" class="mobile-stack">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td align="center" style="border:2px solid ${branding.primaryColor};border-radius:12px;background-color:#ffffff;">
                          <a href="#" style="display:inline-block;padding:14px 30px;font-size:16px;font-weight:700;color:${branding.primaryColor};text-decoration:none;border-radius:10px;text-align:center;min-width:160px;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">View Guide</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Support Section -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:20px 0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;text-align:center;">
                    <h4 style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#374151;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Need Help Getting Started?</h4>
                    <p style="margin:0 0 12px 0;font-size:13px;color:#6b7280;line-height:1.4;font-family:${branding.fontFamily},Arial,sans-serif;">
                      Our support team is here to help you make the most of your ${branding.companyName} account.
                    </p>
                    <a href="#" style="color:${branding.primaryColor};text-decoration:none;font-weight:600;font-size:13px;font-family:${branding.fontFamily},Arial,sans-serif;">Contact Support →</a>
                  </td>
                </tr>
              </table>
              
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
                      <a href="${baseUrl}/dashboard" style="color:${branding.primaryColor};text-decoration:none;margin:0 8px;font-family:${branding.fontFamily},Arial,sans-serif;">Dashboard</a> •
                      <a href="#" style="color:${branding.primaryColor};text-decoration:none;margin:0 8px;font-family:${branding.fontFamily},Arial,sans-serif;">Support</a> •
                      <a href="#" style="color:${branding.primaryColor};text-decoration:none;margin:0 8px;font-family:${branding.fontFamily},Arial,sans-serif;">Documentation</a>
                    </p>
                    
                    <!-- Copyright -->
                    <p style="margin:0 0 6px;font-size:11px;color:#94a3b8;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">© 2024 ${branding.companyName}. All rights reserved.</p>
                    <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">This is an automated account activation notification.</p>
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
ACCOUNT ACTIVATED - ${branding.companyName}

Great news, ${name}!

Your account verification is complete! Our team has reviewed and approved your registration. You can now access all ${branding.companyName} features and start making calls.

YOUR ACCOUNT DETAILS:
- Account Name: ${name}
- Account ID: #${sippyAccountId}
- Status: ✅ Active

WHAT'S NEXT?
- Access your dashboard to view account balance and call history
- Configure your calling preferences and settings
- Set up low balance notifications to avoid service interruption
- Start making calls through your ${branding.companyName} account
- Monitor your usage and billing in real-time

Access Dashboard: ${baseUrl}/dashboard

Need Help Getting Started?
Our support team is here to help you make the most of your ${branding.companyName} account.
Contact Support

© 2024 ${branding.companyName}. All rights reserved.
This is an automated account activation notification.
  `;

  return { subject, html, text };
} 