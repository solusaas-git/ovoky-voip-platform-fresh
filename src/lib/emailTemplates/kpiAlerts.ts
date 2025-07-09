import { IKpiSettings } from '@/models/KpiSettings';
import juice from 'juice';

interface KpiData {
  costOfDay: number;
  asr: number;
  totalMinutes: number;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  currency: string;
}

interface HighCostAlertData {
  costOfDay: number;
  threshold: number;
  currency: string;
  totalCalls: number;
  avgCostPerCall: number;
  date: string;
  userName: string;
  userEmail: string;
  branding: {
    companyName: string;
    companySlogan?: string;
    primaryColor: string;
    fontFamily: string;
  };
}

interface LowAsrAlertData {
  asr: number;
  threshold: number;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  date: string;
  userName: string;
  userEmail: string;
  branding: {
    companyName: string;
    companySlogan?: string;
    primaryColor: string;
    fontFamily: string;
  };
}

interface ExtremeUsageAlertData {
  totalMinutes: number;
  threshold: number;
  totalCalls: number;
  avgMinutesPerCall: number;
  date: string;
  userName: string;
  userEmail: string;
  branding: {
    companyName: string;
    companySlogan?: string;
    primaryColor: string;
    fontFamily: string;
  };
}

export interface KpiAlertData {
  account: {
    name: string;
    email: string;
    sippyAccountId: number;
  };
  alertType: 'high_cost' | 'low_asr' | 'extreme_usage';
  threshold: number;
  currentValue: number;
  timeframe: string;
  branding: {
    companyName: string;
    companySlogan?: string;
    primaryColor: string;
    fontFamily: string;
  };
}

export function generateHighCostAlertEmail(data: HighCostAlertData): { subject: string; html: string; text: string } {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const subject = `🚨 High Cost Alert - Daily spending exceeded threshold`;

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
  <title>High Cost Alert</title>
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
        float: none !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,sans-serif;width:100%;min-width:100%;">
  
  <!-- Hidden preheader -->
  <div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    High cost alert: Daily spending exceeded threshold - ${formatCurrency(data.costOfDay, data.currency)}
  </div>
  
  <!-- Email wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0;padding:0;background-color:#f1f5f9;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        
        <!-- Main email container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="mobile-full-width" style="max-width:600px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);overflow:hidden;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
          
          <!-- Header -->
          <tr>
            <td style="padding:0 20px 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#dc2626;border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" style="padding:24px 16px;">
                    <div style="font-size:48px;margin-bottom:10px;line-height:1;">🚨</div>
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.2;font-family:Arial,sans-serif;">High Cost Alert</h1>
                    <p style="margin:6px 0 0;color:#ffffff;opacity:0.9;font-size:14px;line-height:1.3;font-family:Arial,sans-serif;">Daily spending threshold exceeded</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding:0 20px 24px;">
              
              <!-- Greeting -->
              <h2 style="margin:0 0 16px 0;font-size:18px;color:#1e293b;font-weight:600;line-height:1.3;font-family:Arial,sans-serif;">Hello ${data.userName},</h2>
              
              <!-- Message -->
              <p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#475569;font-family:Arial,sans-serif;">Your daily call costs have exceeded the configured high-cost threshold. Immediate attention may be required to review your usage patterns.</p>
              
              <!-- Cost Alert Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;border:3px solid #dc2626;border-radius:12px;margin:24px 0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" style="padding:24px 16px;">
                    <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;line-height:1.2;font-family:Arial,sans-serif;">TOTAL COST TODAY (${data.date})</p>
                    <p style="margin:0;font-size:32px;font-weight:800;color:#dc2626;line-height:1;font-family:Arial,sans-serif;">${formatCurrency(data.costOfDay, data.currency)}</p>
                  </td>
                </tr>
              </table>
              
              <!-- Threshold Warning -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;border:3px solid #fbbf24;border-radius:12px;margin:20px 0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;font-size:14px;font-weight:700;color:#92400e;line-height:1.4;font-family:Arial,sans-serif;">
                      <strong style="font-weight:700;">⚠️ Threshold Exceeded:</strong> Your daily cost of ${formatCurrency(data.costOfDay, data.currency)} has surpassed the high-cost threshold of ${formatCurrency(data.threshold, data.currency)}.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Statistics -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:20px 0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <!-- Total Calls -->
                  <td width="48%" style="padding-right:8px;vertical-align:top;" class="mobile-stack">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;border:3px solid #e2e8f0;border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td align="center" style="padding:16px 12px;">
                          <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;line-height:1.2;font-family:Arial,sans-serif;">TOTAL CALLS</p>
                          <p style="margin:0;font-size:20px;font-weight:700;color:#374151;line-height:1;font-family:Arial,sans-serif;">${data.totalCalls.toLocaleString()}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  
                  <!-- Avg Cost per Call -->
                  <td width="48%" style="padding-left:8px;vertical-align:top;" class="mobile-stack">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;border:3px solid #e2e8f0;border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td align="center" style="padding:16px 12px;">
                          <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;line-height:1.2;font-family:Arial,sans-serif;">AVG COST/CALL</p>
                          <p style="margin:0;font-size:20px;font-weight:700;color:#374151;line-height:1;font-family:Arial,sans-serif;">${formatCurrency(data.avgCostPerCall, data.currency)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Recommendations -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;border:3px solid #e2e8f0;border-radius:12px;margin:20px 0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;">
                    <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:700;color:#1e293b;line-height:1.3;font-family:Arial,sans-serif;">Recommended Actions:</h3>
                    <ul style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:1.6;font-family:Arial,sans-serif;">
                      <li style="margin-bottom:4px;">Review your call patterns and destinations</li>
                      <li style="margin-bottom:4px;">Check for any unusual or unexpected call activity</li>
                      <li style="margin-bottom:4px;">Consider adjusting your calling strategy if needed</li>
                      <li>Monitor costs throughout the day to prevent further overages</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <!-- Call to Action Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:20px auto;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" style="border-radius:12px;background-color:#f59e0b;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                    <a href="${baseUrl}/dashboard" style="display:inline-block;padding:16px 32px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;text-align:center;min-width:160px;line-height:1.2;font-family:Arial,sans-serif;">
                      <font color="#ffffff">View Dashboard</font>
                    </a>
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
                    <p style="margin:0 0 6px;font-size:11px;color:#94a3b8;line-height:1.3;font-family:Arial,sans-serif;">This is an automated alert from your system.</p>
                    <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.3;font-family:Arial,sans-serif;">You can adjust notification settings in your admin panel.</p>
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

  const text = `
HIGH COST ALERT - Daily spending exceeded threshold

Hello ${data.userName},

Your daily call costs have exceeded the configured high-cost threshold.

COST DETAILS:
- Total Cost Today (${data.date}): ${formatCurrency(data.costOfDay, data.currency)}
- Threshold: ${formatCurrency(data.threshold, data.currency)}
- Total Calls: ${data.totalCalls.toLocaleString()}
- Average Cost per Call: ${formatCurrency(data.avgCostPerCall, data.currency)}

RECOMMENDED ACTIONS:
- Review your call patterns and destinations
- Check for any unusual or unexpected call activity
- Consider adjusting your calling strategy if needed
- Monitor costs throughout the day to prevent further overages

View your dashboard: ${baseUrl}/dashboard

This is an automated alert from your system.
You can adjust notification settings in your admin panel.
  `;

  return { subject, html, text };
}

export function generateLowAsrAlertEmail(data: LowAsrAlertData): { subject: string; html: string; text: string } {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const subject = `⚠️ Low Success Rate Alert - Call quality needs attention`;

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

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
  <title>Low ASR Alert</title>
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
        float: none !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,sans-serif;width:100%;min-width:100%;">
  
  <!-- Hidden preheader -->
  <div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    Low ASR alert: Call success rate below threshold - ${data.asr.toFixed(1)}%
  </div>
  
  <!-- Email wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0;padding:0;background-color:#f1f5f9;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        
        <!-- Main email container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="mobile-full-width" style="max-width:600px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);overflow:hidden;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
          
          <!-- Header -->
          <tr>
            <td style="padding:0 20px 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f59e0b;border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" style="padding:24px 16px;">
                    <div style="font-size:48px;margin-bottom:10px;line-height:1;">⚠️</div>
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.2;font-family:Arial,sans-serif;">Low Success Rate Alert</h1>
                    <p style="margin:6px 0 0;color:#ffffff;opacity:0.9;font-size:14px;line-height:1.3;font-family:Arial,sans-serif;">Call quality needs attention</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding:0 20px 24px;">
              
              <!-- Greeting -->
              <h2 style="margin:0 0 16px 0;font-size:18px;color:#1e293b;font-weight:600;line-height:1.3;font-family:Arial,sans-serif;">Hello ${data.userName},</h2>
              
              <!-- Message -->
              <p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#475569;font-family:Arial,sans-serif;">Your call success rate (ASR) has fallen below the configured threshold. This may indicate connectivity issues or routing problems that need immediate attention.</p>
              
              <!-- ASR Alert Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;border:3px solid #f59e0b;border-radius:12px;margin:24px 0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" style="padding:24px 16px;">
                    <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;line-height:1.2;font-family:Arial,sans-serif;">ANSWER SEIZURE RATIO (${data.date})</p>
                    <p style="margin:0;font-size:32px;font-weight:800;color:#f59e0b;line-height:1;font-family:Arial,sans-serif;">${data.asr.toFixed(1)}%</p>
                  </td>
                </tr>
              </table>
              
              <!-- Threshold Warning -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;border:3px solid #fbbf24;border-radius:12px;margin:20px 0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;font-size:14px;font-weight:700;color:#92400e;line-height:1.4;font-family:Arial,sans-serif;">
                      <strong style="font-weight:700;">⚠️ Performance Issue:</strong> Your ASR of ${data.asr.toFixed(1)}% is below the threshold of ${data.threshold}%. This indicates ${data.failedCalls.toLocaleString()} failed calls out of ${data.totalCalls.toLocaleString()} total attempts.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Statistics -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:20px 0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <!-- Total Calls -->
                  <td width="32%" style="padding-right:8px;vertical-align:top;" class="mobile-stack">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;border:3px solid #e2e8f0;border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td align="center" style="padding:16px 12px;">
                          <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;line-height:1.2;font-family:Arial,sans-serif;">TOTAL CALLS</p>
                          <p style="margin:0;font-size:20px;font-weight:700;color:#374151;line-height:1;font-family:Arial,sans-serif;">${data.totalCalls.toLocaleString()}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  
                  <!-- Successful Calls -->
                  <td width="32%" style="padding:0 4px;vertical-align:top;" class="mobile-stack">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;border:3px solid #bbf7d0;border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td align="center" style="padding:16px 12px;">
                          <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;line-height:1.2;font-family:Arial,sans-serif;">SUCCESSFUL</p>
                          <p style="margin:0;font-size:20px;font-weight:700;color:#10b981;line-height:1;font-family:Arial,sans-serif;">${data.successfulCalls.toLocaleString()}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  
                  <!-- Failed Calls -->
                  <td width="32%" style="padding-left:8px;vertical-align:top;" class="mobile-stack">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;border:3px solid #fecaca;border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td align="center" style="padding:16px 12px;">
                          <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;line-height:1.2;font-family:Arial,sans-serif;">FAILED</p>
                          <p style="margin:0;font-size:20px;font-weight:700;color:#ef4444;line-height:1;font-family:Arial,sans-serif;">${data.failedCalls.toLocaleString()}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Recommendations -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;border:3px solid #e2e8f0;border-radius:12px;margin:20px 0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;">
                    <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:700;color:#1e293b;line-height:1.3;font-family:Arial,sans-serif;">Recommended Actions:</h3>
                    <ul style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:1.6;font-family:Arial,sans-serif;">
                      <li style="margin-bottom:4px;">Check your SIP trunk configuration and connectivity</li>
                      <li style="margin-bottom:4px;">Review routing rules and destination numbers</li>
                      <li style="margin-bottom:4px;">Verify account balance and credit limits</li>
                      <li style="margin-bottom:4px;">Contact your provider if issues persist</li>
                      <li>Monitor call patterns for unusual activity</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <!-- Call to Action Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:20px auto;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" style="border-radius:12px;background-color:#f59e0b;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                    <a href="${baseUrl}/cdrs" style="display:inline-block;padding:16px 32px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;text-align:center;min-width:160px;line-height:1.2;font-family:Arial,sans-serif;">
                      <font color="#ffffff">View Call Reports</font>
                    </a>
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
                    <p style="margin:0 0 6px;font-size:11px;color:#94a3b8;line-height:1.3;font-family:Arial,sans-serif;">This is an automated alert from your ${data.branding.companyName} system.</p>
                    <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.3;font-family:Arial,sans-serif;">You can adjust notification settings in your admin panel.</p>
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

  const text = `
LOW SUCCESS RATE ALERT - Call quality needs attention

Hello ${data.userName},

Your call success rate (ASR) has fallen below the configured threshold.

ASR DETAILS:
- Current ASR (${data.date}): ${data.asr.toFixed(1)}%
- Threshold: ${data.threshold}%
- Total Calls: ${data.totalCalls.toLocaleString()}
- Successful Calls: ${data.successfulCalls.toLocaleString()}
- Failed Calls: ${data.failedCalls.toLocaleString()}

RECOMMENDED ACTIONS:
- Check your SIP trunk configuration and connectivity
- Review routing rules and destination numbers
- Verify account balance and credit limits
- Contact your provider if issues persist
- Monitor call patterns for unusual activity

View call reports: ${baseUrl}/cdrs

This is an automated alert from your ${data.branding.companyName} system.
You can adjust notification settings in your admin panel.
  `;

  return { subject, html, text };
}

export function generateExtremeUsageAlertEmail(data: ExtremeUsageAlertData): { subject: string; html: string; text: string } {
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const subject = `📊 Extreme Usage Alert - Daily minutes threshold exceeded`;

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
  <title>Extreme Usage Alert</title>
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
        float: none !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,sans-serif;width:100%;min-width:100%;">
  
  <!-- Hidden preheader -->
  <div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    Extreme usage alert: Daily minutes threshold exceeded - ${formatMinutes(data.totalMinutes)}
  </div>
  
  <!-- Email wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0;padding:0;background-color:#f1f5f9;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        
        <!-- Main email container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="mobile-full-width" style="max-width:600px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);overflow:hidden;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
          
          <!-- Header -->
          <tr>
            <td style="padding:0 20px 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#7c3aed;border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" style="padding:24px 16px;">
                    <div style="font-size:48px;margin-bottom:10px;line-height:1;">📊</div>
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.2;font-family:Arial,sans-serif;">Extreme Usage Alert</h1>
                    <p style="margin:6px 0 0;color:#ffffff;opacity:0.9;font-size:14px;line-height:1.3;font-family:Arial,sans-serif;">Daily minutes threshold exceeded</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding:0 20px 24px;">
              
              <!-- Greeting -->
              <h2 style="margin:0 0 16px 0;font-size:18px;color:#1e293b;font-weight:600;line-height:1.3;font-family:Arial,sans-serif;">Hello ${data.userName},</h2>
              
              <!-- Message -->
              <p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#475569;font-family:Arial,sans-serif;">Your daily call usage has reached extreme levels, exceeding the configured very heavy usage threshold. This may indicate unusual activity or potential cost implications.</p>
              
              <!-- Usage Alert Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;border:3px solid #7c3aed;border-radius:12px;margin:24px 0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" style="padding:24px 16px;">
                    <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;line-height:1.2;font-family:Arial,sans-serif;">TOTAL MINUTES USED TODAY (${data.date})</p>
                    <p style="margin:0;font-size:32px;font-weight:800;color:#7c3aed;line-height:1;font-family:Arial,sans-serif;">${formatMinutes(data.totalMinutes)}</p>
                  </td>
                </tr>
              </table>
              
              <!-- Threshold Warning -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;border:3px solid #c4b5fd;border-radius:12px;margin:20px 0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;font-size:14px;font-weight:700;color:#7c3aed;line-height:1.4;font-family:Arial,sans-serif;">
                      <strong style="font-weight:700;">📊 Usage Alert:</strong> Your daily usage of ${formatMinutes(data.totalMinutes)} has exceeded the very heavy usage threshold of ${formatMinutes(data.threshold)}. This represents extremely high call volume.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Statistics -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:20px 0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <!-- Total Calls -->
                  <td width="48%" style="padding-right:8px;vertical-align:top;" class="mobile-stack">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;border:3px solid #e2e8f0;border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td align="center" style="padding:16px 12px;">
                          <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;line-height:1.2;font-family:Arial,sans-serif;">TOTAL CALLS</p>
                          <p style="margin:0;font-size:20px;font-weight:700;color:#374151;line-height:1;font-family:Arial,sans-serif;">${data.totalCalls.toLocaleString()}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  
                  <!-- Avg Minutes per Call -->
                  <td width="48%" style="padding-left:8px;vertical-align:top;" class="mobile-stack">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;border:3px solid #e2e8f0;border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td align="center" style="padding:16px 12px;">
                          <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;line-height:1.2;font-family:Arial,sans-serif;">AVG MINUTES/CALL</p>
                          <p style="margin:0;font-size:20px;font-weight:700;color:#374151;line-height:1;font-family:Arial,sans-serif;">${formatMinutes(data.avgMinutesPerCall)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Recommendations -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;border:3px solid #e2e8f0;border-radius:12px;margin:20px 0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;">
                    <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:700;color:#1e293b;line-height:1.3;font-family:Arial,sans-serif;">Recommended Actions:</h3>
                    <ul style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:1.6;font-family:Arial,sans-serif;">
                      <li style="margin-bottom:4px;">Review your call logs for any unusual patterns</li>
                      <li style="margin-bottom:4px;">Check for any automated systems or bulk calling</li>
                      <li style="margin-bottom:4px;">Verify that all calls are legitimate and authorized</li>
                      <li style="margin-bottom:4px;">Consider implementing usage controls if needed</li>
                      <li>Monitor costs associated with this high usage</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <!-- Call to Action Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:20px auto;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" style="border-radius:12px;background-color:#7c3aed;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                    <a href="${baseUrl}/cdrs" style="display:inline-block;padding:16px 32px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;text-align:center;min-width:160px;line-height:1.2;font-family:Arial,sans-serif;">
                      <font color="#ffffff">View Usage Reports</font>
                    </a>
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
                    <p style="margin:0 0 6px;font-size:11px;color:#94a3b8;line-height:1.3;font-family:Arial,sans-serif;">This is an automated alert from your ${data.branding.companyName} system.</p>
                    <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.3;font-family:Arial,sans-serif;">You can adjust notification settings in your admin panel.</p>
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

  const text = `
EXTREME USAGE ALERT - Daily minutes threshold exceeded

Hello ${data.userName},

Your daily call usage has reached extreme levels, exceeding the configured threshold.

USAGE DETAILS:
- Total Minutes Today (${data.date}): ${formatMinutes(data.totalMinutes)}
- Threshold: ${formatMinutes(data.threshold)}
- Total Calls: ${data.totalCalls.toLocaleString()}
- Average Minutes per Call: ${formatMinutes(data.avgMinutesPerCall)}

RECOMMENDED ACTIONS:
- Review your call logs for any unusual patterns
- Check for any automated systems or bulk calling
- Verify that all calls are legitimate and authorized
- Consider implementing usage controls if needed
- Monitor costs associated with this high usage

View usage reports: ${baseUrl}/cdrs

This is an automated alert from your ${data.branding.companyName} system.
You can adjust notification settings in your admin panel.
  `;

  return { subject, html, text };
}