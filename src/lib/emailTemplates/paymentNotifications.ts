import juice from 'juice';

export interface PaymentSuccessData {
  account: {
    name: string;
    email: string;
    sippyAccountId: number;
    balance?: number; // Current balance after payment (if available)
    currency: string;
  };
  payment: {
    amount: number;
    currency: string;
    paymentMethod?: string; // e.g., 'Credit Card', 'Admin Credit', 'Stripe'
    transactionId?: string; // Payment reference/transaction ID
    fees?: {
      processingFee?: number;
      fixedFee?: number;
    };
    gateway?: string; // Payment gateway name
    notes?: string; // Additional notes
  };
  paymentType: 'gateway_payment' | 'admin_credit' | 'admin_debit'; // Added admin_debit type
  processedBy?: string; // Admin name for admin credits
  branding: {
    companyName: string;
    companySlogan?: string;
    primaryColor: string;
    fontFamily: string;
  };
}

export function generatePaymentSuccessTemplate(data: PaymentSuccessData): { subject: string; html: string; text: string } {
  const { account, payment, paymentType, processedBy, branding } = data;

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  // Configure payment-specific data
  const isGatewayPayment = paymentType === 'gateway_payment';
  const isDebitOperation = paymentType === 'admin_debit';
  const title = isGatewayPayment ? 'Payment Successful!' : isDebitOperation ? 'Balance Adjusted' : 'Balance Added Successfully!';
  const icon = isGatewayPayment ? '💳' : isDebitOperation ? '⚖️' : '✅';
  const headerColor = isDebitOperation ? '#f59e0b' : '#10b981'; // Orange for debit, Green for credit/payment
  
  const subject = `${icon} ${title} - ${branding.companyName}`;
  
  // Calculate total if fees are provided
  const totalAmount = payment.amount + (payment.fees?.processingFee || 0) + (payment.fees?.fixedFee || 0);

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
  <title>${branding.companyName} Payment Confirmation</title>
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
  
  <!-- Hidden preheader -->
  <div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${title} - ${formatAmount(payment.amount, payment.currency)} added to your ${branding.companyName} account
  </div>
  
  <!-- Email wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0;padding:0;background-color:#f1f5f9;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
    <tr>
      <td align="center" style="padding:20px 10px;" class="mobile-padding">
        
        <!-- Main email container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);overflow:hidden;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding:24px 20px 16px;" class="mobile-padding">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e293b;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">${branding.companyName}</h1>
              ${branding.companySlogan ? `<p style="margin:6px 0 0;color:#64748b;font-size:14px;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">${branding.companySlogan}</p>` : ''}
            </td>
          </tr>
          
          <!-- Success banner -->
          <tr>
            <td style="padding:0 20px 16px;" class="mobile-padding">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${headerColor};border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" style="padding:20px 16px;">
                    <h2 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">${icon} ${title}</h2>
                    <p style="margin:6px 0 0;color:#ffffff;opacity:0.9;font-size:14px;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Your payment has been processed successfully</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main content -->
          <tr>
            <td style="padding:0 20px 24px;" class="mobile-padding">
              
              <!-- Greeting -->
              <h3 style="margin:0 0 16px 0;font-size:18px;color:#1e293b;font-weight:600;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Hello ${account.name},</h3>
              
              <!-- Message -->
              <p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;color:#475569;font-family:${branding.fontFamily},Arial,sans-serif;">
                ${isGatewayPayment 
                  ? `Your payment of ${formatAmount(Math.abs(payment.amount), payment.currency)} has been successfully processed and added to your account balance.`
                  : isDebitOperation
                  ? `An administrator has debited ${formatAmount(Math.abs(payment.amount), payment.currency)} from your account balance.`
                  : `An administrator has successfully added ${formatAmount(Math.abs(payment.amount), payment.currency)} to your account balance.`
                }
              </p>
              
              <!-- Payment details card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:2px solid ${headerColor};border-radius:12px;margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:20px;">
                    <h4 style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#1e293b;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Payment Details</h4>
                    
                    <!-- Payment details rows -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="50%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Amount Added:</td>
                              <td style="font-size:14px;color:#1e293b;font-weight:600;text-align:right;font-family:${branding.fontFamily},Arial,sans-serif;">${formatAmount(payment.amount, payment.currency)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      ${payment.fees && (payment.fees.processingFee || payment.fees.fixedFee) ? `
                        ${payment.fees.processingFee ? `
                          <tr>
                            <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                                <tr>
                                  <td width="50%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Processing Fee:</td>
                                  <td style="font-size:14px;color:#64748b;text-align:right;font-family:${branding.fontFamily},Arial,sans-serif;">${formatAmount(payment.fees.processingFee, payment.currency)}</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        ` : ''}
                        
                        ${payment.fees.fixedFee ? `
                          <tr>
                            <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                                <tr>
                                  <td width="50%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Fixed Fee:</td>
                                  <td style="font-size:14px;color:#64748b;text-align:right;font-family:${branding.fontFamily},Arial,sans-serif;">${formatAmount(payment.fees.fixedFee, payment.currency)}</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          
                          <tr>
                            <td style="padding:6px 0;border-bottom:2px solid ${headerColor};">
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                                <tr>
                                  <td width="50%" style="font-size:14px;color:#1e293b;font-weight:700;font-family:${branding.fontFamily},Arial,sans-serif;">Total Charged:</td>
                                  <td style="font-size:14px;color:#1e293b;font-weight:700;text-align:right;font-family:${branding.fontFamily},Arial,sans-serif;">${formatAmount(totalAmount, payment.currency)}</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        ` : ''}
                      ` : ''}
                      
                      ${payment.paymentMethod ? `
                        <tr>
                          <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                              <tr>
                                <td width="50%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Payment Method:</td>
                                <td style="font-size:14px;color:#1e293b;text-align:right;font-family:${branding.fontFamily},Arial,sans-serif;">${payment.paymentMethod}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      ` : ''}
                      
                      ${payment.transactionId ? `
                        <tr>
                          <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                              <tr>
                                <td width="50%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Transaction ID:</td>
                                <td style="font-size:12px;color:#1e293b;text-align:right;font-family:monospace,${branding.fontFamily},Arial,sans-serif;">${payment.transactionId}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      ` : ''}
                      
                      ${paymentType === 'admin_credit' && processedBy ? `
                        <tr>
                          <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                              <tr>
                                <td width="50%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Processed By:</td>
                                <td style="font-size:14px;color:#1e293b;text-align:right;font-family:${branding.fontFamily},Arial,sans-serif;">${processedBy}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      ` : ''}
                      
                      <tr>
                        <td style="padding:6px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                            <tr>
                              <td width="50%" style="font-size:14px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Date & Time:</td>
                              <td style="font-size:14px;color:#1e293b;text-align:right;font-family:${branding.fontFamily},Arial,sans-serif;">${new Date().toLocaleString()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Account Information -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;">
                    <h4 style="margin:0 0 12px 0;font-size:14px;font-weight:700;color:#1e293b;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Account Information</h4>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td style="padding:4px 8px 4px 0;font-size:13px;vertical-align:top;">
                          <strong style="color:#1e293b;display:block;margin-bottom:2px;font-family:${branding.fontFamily},Arial,sans-serif;">Account Name:</strong>
                          <span style="color:#475569;font-family:${branding.fontFamily},Arial,sans-serif;">${account.name}</span>
                        </td>
                        <td style="padding:4px 0;font-size:13px;text-align:right;vertical-align:top;">
                          <strong style="color:#1e293b;display:block;margin-bottom:2px;font-family:${branding.fontFamily},Arial,sans-serif;">Account ID:</strong>
                          <span style="color:#475569;font-family:${branding.fontFamily},Arial,sans-serif;">${account.sippyAccountId}</span>
                        </td>
                      </tr>
                      ${account.balance !== undefined ? `
                        <tr>
                          <td colspan="2" style="padding:8px 0 4px 0;font-size:13px;">
                            <strong style="color:#1e293b;display:block;margin-bottom:2px;font-family:${branding.fontFamily},Arial,sans-serif;">Current Balance:</strong>
                            <span style="color:${headerColor};font-weight:600;font-family:${branding.fontFamily},Arial,sans-serif;">${formatAmount(account.balance, account.currency)}</span>
                          </td>
                        </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              ${payment.notes ? `
                <!-- Additional Notes -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#fefefe;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                  <tr>
                    <td style="padding:12px 16px;">
                      <p style="margin:0;font-size:13px;color:#64748b;line-height:1.4;font-family:${branding.fontFamily},Arial,sans-serif;">
                        <strong>Notes:</strong> ${payment.notes}
                      </p>
                    </td>
                  </tr>
                </table>
              ` : ''}
              
              <!-- Call to action -->
              <div style="text-align:center;margin-bottom:20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                  <tr>
                    <td style="border-radius:8px;background-color:${branding.primaryColor};padding:14px 28px;">
                      <a href="#" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;font-family:${branding.fontFamily},Arial,sans-serif;">View Account Dashboard</a>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Additional information -->
              <p style="margin:0 0 16px 0;font-size:14px;line-height:1.5;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">
                Your updated balance is now available for use. If you have any questions about this transaction, please contact our support team.
              </p>
              
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

  // Generate plain text version
  const text = `
${branding.companyName} - Payment Confirmation

${title}

Hello ${account.name},

${isGatewayPayment 
  ? `Your payment of ${formatAmount(Math.abs(payment.amount), payment.currency)} has been successfully processed and added to your account balance.`
  : isDebitOperation
  ? `An administrator has debited ${formatAmount(Math.abs(payment.amount), payment.currency)} from your account balance.`
  : `An administrator has successfully added ${formatAmount(Math.abs(payment.amount), payment.currency)} to your account balance.`
}

PAYMENT DETAILS:
- Amount Added: ${formatAmount(payment.amount, payment.currency)}
${payment.fees?.processingFee ? `- Processing Fee: ${formatAmount(payment.fees.processingFee, payment.currency)}` : ''}
${payment.fees?.fixedFee ? `- Fixed Fee: ${formatAmount(payment.fees.fixedFee, payment.currency)}` : ''}
${payment.fees && (payment.fees.processingFee || payment.fees.fixedFee) ? `- Total Charged: ${formatAmount(totalAmount, payment.currency)}` : ''}
${payment.paymentMethod ? `- Payment Method: ${payment.paymentMethod}` : ''}
${payment.transactionId ? `- Transaction ID: ${payment.transactionId}` : ''}
${paymentType === 'admin_credit' && processedBy ? `- Processed By: ${processedBy}` : ''}
- Date & Time: ${new Date().toLocaleString()}

ACCOUNT INFORMATION:
- Account Name: ${account.name}
- Account ID: ${account.sippyAccountId}
${account.balance !== undefined ? `- Current Balance: ${formatAmount(account.balance, account.currency)}` : ''}

${payment.notes ? `NOTES: ${payment.notes}` : ''}

Your updated balance is now available for use. If you have any questions about this transaction, please contact our support team.

Thank you for choosing ${branding.companyName}

This is an automated email. Please do not reply to this message.
  `.trim();

  return { subject, html, text };
} 