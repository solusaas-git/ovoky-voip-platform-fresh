import juice from 'juice';

export interface EmailVerificationData {
  name: string;
  otpCode: string;
  branding: {
    companyName: string;
    companySlogan?: string;
    primaryColor: string;
    fontFamily: string;
  };
}

export function generateEmailVerificationTemplate(data: EmailVerificationData): { subject: string; html: string; text: string } {
  const { name, otpCode, branding } = data;
  
  const subject = `Verify Your Email - ${branding.companyName}`;
  
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
  <title>Email Verification - ${branding.companyName}</title>
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
      .mobile-font-sm {
        font-size: 14px !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:${branding.fontFamily},Arial,sans-serif;width:100%;min-width:100%;">
  
  <!-- Hidden preheader -->
  <div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    Verify your email address to complete your ${branding.companyName} registration
  </div>
  
  <!-- Email wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0;padding:0;background-color:#f1f5f9;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        
        <!-- Main email container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="mobile-full-width" style="max-width:600px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);overflow:hidden;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding:24px 20px 16px;" class="mobile-padding">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e293b;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">${branding.companyName}</h1>
              ${branding.companySlogan ? `<p style="margin:6px 0 0;color:#64748b;font-size:14px;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">${branding.companySlogan}</p>` : ''}
            </td>
          </tr>

          <!-- Verification banner -->
          <tr>
            <td style="padding:0 20px 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${branding.primaryColor};border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" style="padding:20px 16px;">
                    <h2 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">📧 Email Verification</h2>
                    <p style="margin:6px 0 0;color:#ffffff;opacity:0.9;font-size:14px;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Secure your account access</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding:0 20px 24px;" class="mobile-padding">
              
              <!-- Greeting -->
              <h3 style="margin:0 0 16px 0;font-size:18px;color:#1e293b;font-weight:600;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Hello ${name},</h3>
              
              <!-- Message -->
              <p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#475569;font-family:${branding.fontFamily},Arial,sans-serif;">Welcome to ${branding.companyName}! To complete your registration and secure your account, please verify your email address using the verification code below.</p>

              <!-- OTP Code -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:3px solid ${branding.primaryColor};border-radius:12px;margin:24px 0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" style="padding:24px 16px;">
                    <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">VERIFICATION CODE</p>
                    <p style="margin:0;font-size:36px;font-weight:800;color:${branding.primaryColor};letter-spacing:4px;font-family:Consolas,Monaco,monospace,${branding.fontFamily};line-height:1;">${otpCode}</p>
                  </td>
                </tr>
              </table>

              <!-- Instructions -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:20px 0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;">
                    <h4 style="margin:0 0 12px 0;font-size:14px;font-weight:700;color:#1e293b;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Next Steps:</h4>
                    <ol style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:1.6;font-family:${branding.fontFamily},Arial,sans-serif;">
                      <li style="margin-bottom:4px;">Return to the ${branding.companyName} registration page</li>
                      <li style="margin-bottom:4px;">Enter the verification code above</li>
                      <li style="margin-bottom:4px;">Complete your account setup</li>
                      <li>Start managing your communications!</li>
                    </ol>
                  </td>
                </tr>
              </table>

              <!-- Security note -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#fef3c7;border:2px solid #fbbf24;border-radius:12px;margin:20px 0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;font-size:13px;color:#92400e;line-height:1.4;font-family:${branding.fontFamily},Arial,sans-serif;">
                      <strong style="font-weight:700;">🔒 Security Note:</strong> This code expires in 10 minutes. If you didn't request this verification, please ignore this email.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Help text -->
              <p style="margin:20px 0 0;font-size:13px;line-height:1.4;text-align:center;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">
                Need help? <a href="#" style="color:${branding.primaryColor};text-decoration:none;font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">Contact support</a>
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
                      <a href="#" style="color:${branding.primaryColor};text-decoration:none;margin:0 8px;font-family:${branding.fontFamily},Arial,sans-serif;">Privacy</a> •
                      <a href="#" style="color:${branding.primaryColor};text-decoration:none;margin:0 8px;font-family:${branding.fontFamily},Arial,sans-serif;">Terms</a>
                    </p>
                    
                    <!-- Copyright -->
                    <p style="margin:0 0 6px;font-size:11px;color:#94a3b8;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">© 2024 ${branding.companyName}. All rights reserved.</p>
                    <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">This is an automated verification email.</p>
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
EMAIL VERIFICATION - ${branding.companyName}

Hello ${name},

Welcome to ${branding.companyName}! To complete your registration and secure your account, please verify your email address using the verification code below.

VERIFICATION CODE: ${otpCode}

Next Steps:
1. Return to the ${branding.companyName} registration page
2. Enter the verification code above
3. Complete your account setup
4. Start managing your communications!

🔒 Security Note: This code expires in 10 minutes. If you didn't request this verification, please ignore this email.

Need help? Contact support

© 2024 ${branding.companyName}. All rights reserved.
This is an automated verification email.
  `;

  return { subject, html, text };
} 