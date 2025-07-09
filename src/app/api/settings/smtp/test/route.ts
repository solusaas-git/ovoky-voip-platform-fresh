import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import connectToDatabase from '@/lib/db';
import SmtpSettings from '@/models/SmtpSettings';
import { SmtpTestResult } from '@/types/smtp';
import nodemailer from 'nodemailer';
import juice from 'juice';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    let { accountId, testEmail, host, port, secure, username, password, fromEmail, fromName } = body;

    await connectToDatabase();

    let smtpAccount = null;

    // If accountId is provided, use that specific account
    if (accountId) {
      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        return NextResponse.json({
          success: false,
          message: 'SMTP test failed',
          error: 'Invalid account ID'
        });
      }

      smtpAccount = await SmtpSettings.findById(accountId).select('+password');
      if (!smtpAccount) {
        return NextResponse.json({
          success: false,
          message: 'SMTP test failed',
          error: 'SMTP account not found'
        });
      }

      // Use account settings
      host = smtpAccount.host;
      port = smtpAccount.port;
      secure = smtpAccount.secure;
      username = smtpAccount.username;
      password = smtpAccount.password;
      fromEmail = smtpAccount.fromEmail;
      fromName = smtpAccount.fromName;
    } else {
      // Legacy mode: if no accountId provided, try to get stored settings for backward compatibility
      if (!password && host) {
        try {
          const existingSettings = await SmtpSettings.findOne({ host }).select('+password');
          if (existingSettings) {
            password = existingSettings.password;
            username = username || existingSettings.username;
            fromEmail = fromEmail || existingSettings.fromEmail;
            fromName = fromName || existingSettings.fromName;
            port = port || existingSettings.port;
            secure = secure !== undefined ? secure : existingSettings.secure;
          }
        } catch (dbError) {
          console.error('Error fetching stored SMTP settings:', dbError);
        }
      }
    }

    // Validate required fields
    if (!host || !port || !fromEmail || !testEmail) {
      const missingFields = [];
      if (!host) missingFields.push('host');
      if (!port) missingFields.push('port');
      if (!fromEmail) missingFields.push('fromEmail');
      if (!testEmail) missingFields.push('testEmail');
      
      return NextResponse.json({
        success: false,
        message: 'SMTP test failed',
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fromEmail)) {
      return NextResponse.json({
        success: false,
        message: 'SMTP test failed',
        error: `From email format is invalid: ${fromEmail}`
      });
    }

    if (!emailRegex.test(testEmail)) {
      return NextResponse.json({
        success: false,
        message: 'SMTP test failed',
        error: `Test email format is invalid: ${testEmail}`
      });
    }

    // Validate port range
    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return NextResponse.json({
        success: false,
        message: 'SMTP test failed',
        error: `Port must be a number between 1 and 65535. Received: ${port}`
      });
    }

    // Validate known providers that require authentication
    const knownProviders: Record<string, { defaultPort: number; requiresAuth: boolean }> = {
      'smtp.gmail.com': { defaultPort: 587, requiresAuth: true },
      'smtp-mail.outlook.com': { defaultPort: 587, requiresAuth: true },
      'smtp.office365.com': { defaultPort: 587, requiresAuth: true },
      'smtp.yahoo.com': { defaultPort: 587, requiresAuth: true },
      'smtp.mail.yahoo.com': { defaultPort: 587, requiresAuth: true },
      'smtp.sendgrid.net': { defaultPort: 587, requiresAuth: true },
      'smtp.mailgun.org': { defaultPort: 587, requiresAuth: true }
    };

    const provider = knownProviders[host.toLowerCase()];
    if (provider && provider.requiresAuth && (!username || !password)) {
      return NextResponse.json({
        success: false,
        message: 'SMTP test failed',
        error: `${host} requires authentication. Please provide username and password.`
      });
    }

    try {
      // Test actual SMTP connection and send email
      await sendTestEmail(host, portNum, secure, username, password, fromEmail, fromName, testEmail, smtpAccount?.name);
      
      const result: SmtpTestResult = {
        success: true,
        message: `✅ SMTP test successful! Test email sent from ${fromEmail} to ${testEmail}${smtpAccount ? ` using ${smtpAccount.name} (${smtpAccount.category})` : ''}`
      };
      return NextResponse.json(result);
      
    } catch (connectionError) {
      console.error('SMTP connection test failed:', connectionError);
      const result: SmtpTestResult = {
        success: false,
        message: 'SMTP connection test failed',
        error: connectionError instanceof Error ? connectionError.message : 'Connection failed'
      };
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Error testing SMTP:', error);
    return NextResponse.json({ 
      success: false,
      message: 'SMTP test failed',
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

// Send actual test email using nodemailer
async function sendTestEmail(
  host: string, 
  port: number, 
  secure: boolean, 
  username?: string, 
  password?: string,
  fromEmail?: string,
  fromName?: string,
  testEmail?: string,
  accountName?: string
): Promise<{ messageId: string }> {
  
  // Create nodemailer transporter
  const transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: secure,
    auth: username && password ? {
      user: username,
      pass: password,
    } : undefined,
    connectionTimeout: 10000,
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: false
    }
  });

  // Verify connection
  await transporter.verify();

  // Send test email
  const mailOptions = {
    from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
    to: testEmail,
    subject: `SMTP Configuration Test - ${accountName || 'Sippy Dashboard'}`,
    html: createTestEmailTemplate(host, port, secure, fromEmail || '', testEmail || ''),
    text: `
SMTP Test Successful!

This is a test email from your Sippy Dashboard SMTP configuration.

Configuration Details:
- Account: ${accountName || 'Default SMTP'}
- SMTP Host: ${host}
- Port: ${port}  
- Security: ${secure ? 'SSL/TLS Enabled' : 'No SSL/TLS'}
- From: ${fromEmail}
- Test sent to: ${testEmail}
- Timestamp: ${new Date().toISOString()}

If you received this email, your SMTP configuration is working correctly!
    `
  };

  const info = await transporter.sendMail(mailOptions);
  return { messageId: info.messageId };
}

// Professional SMTP test email template with CSS inlining using juice
function createTestEmailTemplate(
  host: string,
  port: number,
  secure: boolean,
  fromEmail: string,
  testEmail: string
): string {
  const rawHtml = `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <title>SMTP Test - Sippy Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    /* ---------- Mobile tweaks ---------- */
    @media (max-width:600px) {
      .stack-column,
      .stack-column td {
        display: block !important;
        width: 100% !important;
      }
      .px-sm-0 {
        padding-left: 0 !important;
        padding-right: 0 !important;
      }
    }
  </style>
</head>

<body
  style="margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;background:#f8f9fa;font-family:Arial,Helvetica,sans-serif">
  <!-- Hidden pre-header -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    SMTP configuration test successful for Sippy Dashboard
  </div>

  <!-- Outer wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
    style="border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
    <tr>
      <td align="center" style="padding:16px 8px;">
        <!-- Card -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="600"
          style="width:100%;max-width:600px;border-collapse:collapse;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding:16px 12px;">
              <span style="font-size:20px;font-weight:700;color:#2d3748;">Sippy Communications</span>
            </td>
          </tr>

          <!-- Success banner -->
          <tr>
            <td align="center" style="padding:0 12px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                style="border-collapse:collapse;background:#10b981;border-radius:8px;">
                <tr>
                  <td align="center" style="padding:16px;">
                    <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;line-height:1.3;">🎉 SMTP Test Successful!</h1>
                    <p style="margin:4px 0 0;color:#ffffff;opacity:.9;font-size:13px;">Your email configuration is working correctly</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:16px 12px;">
              <h2 style="margin:0 0 12px 0;font-size:16px;color:#2d3748;">Congratulations!</h2>
              <p style="margin:0 0 16px 0;font-size:14px;line-height:1.4;color:#4a5568;">This test email confirms that your SMTP configuration is working correctly. Your Sippy Dashboard can now send email notifications successfully.</p>

              <!-- Configuration details -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                style="border-collapse:collapse;background:#f7fafc;border-radius:6px;margin-bottom:16px;">
                <tr>
                  <td style="padding:12px;">
                    <h3 style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:#2d3748;">Configuration Details:</h3>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                      style="border-collapse:collapse;">
                      <tr>
                        <td width="50%" style="padding:4px 0;font-size:13px;">
                          <strong style="color:#2d3748;">SMTP Host:</strong> <span style="color:#4a5568;">${host}</span>
                        </td>
                        <td width="50%" style="padding:4px 0;font-size:13px;">
                          <strong style="color:#2d3748;">Port:</strong> <span style="color:#4a5568;">${port}</span>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding:4px 0;font-size:13px;">
                          <strong style="color:#2d3748;">Security:</strong> <span style="color:#4a5568;">${secure ? 'SSL/TLS Enabled' : 'No SSL/TLS'}</span>
                        </td>
                        <td width="50%" style="padding:4px 0;font-size:13px;">
                          <strong style="color:#2d3748;">From:</strong> <span style="color:#4a5568;">${fromEmail}</span>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding:4px 0;font-size:13px;">
                          <strong style="color:#2d3748;">Test sent to:</strong> <span style="color:#4a5568;">${testEmail}</span>
                        </td>
                        <td width="50%" style="padding:4px 0;font-size:13px;">
                          <strong style="color:#2d3748;">Timestamp:</strong> <span style="color:#4a5568;">${new Date().toLocaleString()}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Next steps -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                style="border-collapse:collapse;background:#ecfdf5;border:1px solid #bbf7d0;border-radius:6px;margin-bottom:16px;">
                <tr>
                  <td style="padding:12px;">
                    <h4 style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#065f46;">✅ What's next?</h4>
                    <ul style="margin:0;padding-left:20px;color:#047857;font-size:13px;line-height:1.4;">
                      <li>Your SMTP configuration has been saved</li>
                      <li>Low balance notifications will now be sent automatically</li>
                      <li>You can configure notification thresholds in the dashboard</li>
                      <li>Test notifications can be sent anytime from the admin panel</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="border-collapse:collapse;">
                <tr>
                  <td align="center" bgcolor="#10b981" style="border-radius:20px;mso-padding-alt:0;">
                    <a href="#" style="display:block;padding:12px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:20px;">Access Dashboard</a>
                  </td>
                </tr>
              </table>

              <!-- Help -->
              <p style="margin:16px 0 0;font-size:12px;line-height:1.3;text-align:center;color:#4a5568;">Need help? <a href="#" style="color:#10b981;text-decoration:none;">Contact Support</a> or visit our <a href="#" style="color:#10b981;text-decoration:none;">Documentation</a></p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:16px 12px;font-size:11px;color:#a0aec0;">
              <p style="margin:0 0 8px;">
                <a href="#" style="color:#4299e1;text-decoration:none;margin:0 6px;">Support</a> •
                <a href="#" style="color:#4299e1;text-decoration:none;margin:0 6px;">Dashboard</a> •
                <a href="#" style="color:#4299e1;text-decoration:none;margin:0 6px;">Documentation</a>
              </p>
              <p style="margin:2px 0;">© 2024 Sippy&nbsp;Communications. All rights reserved.</p>
              <p style="margin:2px 0;">This is an automated SMTP configuration test email.</p>
            </td>
          </tr>
        </table>
        <!-- /Card -->
      </td>
    </tr>
  </table>
</body>

</html>`;

  // Use juice to inline CSS while preserving media queries
  const inlinedHtml = juice(rawHtml, {
    removeStyleTags: false,   // keeps the <style> block for the media query
    applyStyleTags: true,     // applies styles from <style> tags to elements
    preserveMediaQueries: true, // preserves @media queries in style tag
    webResources: {
      relativeTo: process.cwd()
    }
  });

  return inlinedHtml;
} 