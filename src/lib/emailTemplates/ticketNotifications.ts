import juice from 'juice';

// Types for ticket replies (from the interface already defined)
type TicketReply = {
  authorType: string;
  isInternal: boolean;
  content: string;
  createdAt: Date;
  author?: {
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
  };
};

type TicketData = TicketNotificationData['ticket'];

export interface TicketNotificationData {
  ticket: {
    _id: string;
    ticketNumber: string;
    title: string;
    description: string;
    service: string;
    priority: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    resolvedAt?: Date;
    closedAt?: Date;
    customerSatisfactionRating?: number;
    customerSatisfactionComment?: string;
    assignedTo?: {
      _id: string;
      email: string;
      name?: string;
      firstName?: string;
      lastName?: string;
    };
    user?: {
      _id: string;
      email: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      company?: string;
    };
    replies?: TicketReply[];
  };
  branding: {
    companyName: string;
    companySlogan?: string;
    primaryColor: string;
    fontFamily: string;
  };
  notificationType: 'ticket_created' | 'ticket_updated' | 'ticket_resolved' | 'ticket_assigned' | 'ticket_replied';
  recipientType: 'customer' | 'admin';
  actionDetails?: {
    action: string;
    changedBy?: {
      email: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
    };
    changes?: {
      oldStatus?: string;
      newStatus?: string;
      oldPriority?: string;
      newPriority?: string;
      oldAssignedTo?: string;
      newAssignedTo?: string;
    };
    replyContent?: string;
    isInternal?: boolean;
  };
}

// Helper functions
const formatUserName = (user?: { name?: string; firstName?: string; lastName?: string; email: string; role?: string } | string): string => {
  if (!user) return 'Unknown User';
  if (typeof user === 'string') return 'Support Agent'; // Fallback for string IDs
  if (user.name && user.name.trim()) return user.name.trim();
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
  if (user.firstName && user.firstName.trim()) return user.firstName.trim();
  if (user.lastName && user.lastName.trim()) return user.lastName.trim();
  
  // Instead of showing email, show a role-based name
  if (user.role === 'admin') {
    return 'Support Agent';
  }
  
  // Extract first part of email as friendly name
  if (user.email) {
    const emailPart = user.email.split('@')[0];
    return emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
  }
  
  return 'Unknown User';
};

const getServiceLabel = (service: string): string => {
  const serviceLabels: { [key: string]: string } = {
    'outbound_calls': 'Outbound Calls',
    'inbound_calls': 'Inbound Calls',
    'sms': 'SMS Services',
    'number_services': 'Number Services',
    'technical_support': 'Technical Support',
    'billing': 'Billing',
    'other': 'Other'
  };
  return serviceLabels[service] || service;
};

const getServiceDescription = (service: string): string => {
  const serviceDescriptions: { [key: string]: string } = {
    'outbound_calls': 'Issues related to making outbound calls, call quality, routing, or configuration.',
    'inbound_calls': 'Problems with receiving calls, IVR systems, call forwarding, or number setup.',
    'sms': 'SMS delivery issues, messaging configuration, or text messaging services.',
    'number_services': 'Phone number provisioning, porting, or number management requests.',
    'technical_support': 'General technical assistance, API integration, or system configuration.',
    'billing': 'Billing inquiries, payment issues, account charges, or usage questions.',
    'other': 'General inquiries or issues not covered by specific service categories.'
  };
  return serviceDescriptions[service] || 'General support request requiring assistance.';
};

const getPriorityLabel = (priority: string): string => {
  const priorityLabels: { [key: string]: string } = {
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High',
    'urgent': 'Urgent'
  };
  return priorityLabels[priority] || priority;
};

const getStatusLabel = (status: string): string => {
  const statusLabels: { [key: string]: string } = {
    'open': 'Open',
    'in_progress': 'In Progress',
    'waiting_admin': 'Waiting for Support',
    'waiting_user': 'Waiting for Response',
    'resolved': 'Resolved',
    'closed': 'Closed'
  };
  return statusLabels[status] || status;
};

const getPriorityColor = (priority: string): string => {
  const priorityColors: { [key: string]: string } = {
    'low': '#10b981',
    'medium': '#f59e0b',
    'high': '#f97316',
    'urgent': '#ef4444'
  };
  return priorityColors[priority] || '#6b7280';
};

const getStatusColor = (status: string): string => {
  const statusColors: { [key: string]: string } = {
    'open': '#f59e0b',
    'in_progress': '#3b82f6',
    'waiting_admin': '#8b5cf6',
    'waiting_user': '#f97316',
    'resolved': '#10b981',
    'closed': '#6b7280'
  };
  return statusColors[status] || '#6b7280';
};

const formatReplyAuthor = (reply: TicketReply, ticket: TicketData): string => {
  if (reply.authorType === 'admin') {
    // For admin/support replies: "Support Agent Name - Support"
    const agentName = reply.author ? formatUserName(reply.author) : 'Support Team';
    return `${agentName} - Support`;
  } else {
    // For customer replies: "Customer Name - Company"
    let customerName = 'Customer';
    let company = '';
    
    if (reply.author) {
      customerName = formatUserName(reply.author);
      company = reply.author.company || '';
    } else if (ticket.user) {
      customerName = formatUserName(ticket.user);
      company = ticket.user.company || '';
    }
    
    return company ? `${customerName} - ${company}` : customerName;
  }
};

export function generateTicketNotificationTemplate(data: TicketNotificationData): { subject: string; html: string; text: string } {
  const { ticket, branding, notificationType, recipientType, actionDetails } = data;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Determine notification details based on type and recipient
  let notificationIcon = '🎫';
  let notificationTitle = '';
  let notificationMessage = '';
  let headerColor = branding.primaryColor;
  let actionUrl = `${baseUrl}/support/tickets/${ticket._id}`;

  // Admin notifications have different URLs
  if (recipientType === 'admin') {
    actionUrl = `${baseUrl}/admin/support/tickets/${ticket._id}`;
  }

  switch (notificationType) {
    case 'ticket_created':
      notificationIcon = '🆕';
      if (recipientType === 'admin') {
        notificationTitle = 'New Support Ticket - Action Required';
        notificationMessage = `A new support ticket has been created by ${formatUserName(ticket.user)} for ${getServiceLabel(ticket.service)}. Please review and respond.`;
      } else {
        notificationTitle = 'Support Ticket Created';
        notificationMessage = `Your support ticket has been created for ${getServiceLabel(ticket.service)}. Our team will review and respond soon.`;
      }
      headerColor = '#10b981';
      break;
    case 'ticket_updated':
      notificationIcon = '🔄';
      if (recipientType === 'admin') {
        notificationTitle = 'Ticket Updated - Review Required';
        if (actionDetails?.changes?.newStatus) {
          notificationMessage = `Ticket #${ticket.ticketNumber} status changed to "${getStatusLabel(actionDetails.changes.newStatus)}". Please review the update.`;
        } else if (actionDetails?.changes?.newPriority) {
          notificationMessage = `Ticket #${ticket.ticketNumber} priority changed to "${getPriorityLabel(actionDetails.changes.newPriority)}". Please review the update.`;
        } else if (actionDetails?.changes?.newAssignedTo) {
          const assignedName = formatUserName(ticket.assignedTo);
          notificationMessage = `Ticket #${ticket.ticketNumber} has been assigned to ${assignedName}.`;
        } else {
          notificationMessage = `Ticket #${ticket.ticketNumber} has been updated. Please review the changes.`;
        }
      } else {
        notificationTitle = 'Support Ticket Updated';
        if (actionDetails?.changes?.newStatus) {
          notificationMessage = `Your ticket status has been changed to "${getStatusLabel(actionDetails.changes.newStatus)}".`;
        } else if (actionDetails?.changes?.newPriority) {
          notificationMessage = `Your ticket priority has been changed to "${getPriorityLabel(actionDetails.changes.newPriority)}".`;
        } else if (actionDetails?.changes?.newAssignedTo) {
          const assignedName = formatUserName(ticket.assignedTo);
          notificationMessage = `Your ticket has been assigned to ${assignedName} for personalized support.`;
        } else {
          notificationMessage = 'Your support ticket has been updated.';
        }
      }
      headerColor = '#3b82f6';
      break;
    case 'ticket_resolved':
      notificationIcon = '✅';
      if (recipientType === 'admin') {
        notificationTitle = 'Ticket Marked as Resolved';
        notificationMessage = `Ticket #${ticket.ticketNumber} has been marked as resolved. Monitor for customer feedback.`;
      } else {
        notificationTitle = 'Support Ticket Resolved';
        notificationMessage = 'Your support ticket has been resolved! Please review the solution and provide feedback if needed.';
      }
      headerColor = '#10b981';
      break;
    case 'ticket_assigned':
      notificationIcon = '👤';
      const assignedName = formatUserName(ticket.assignedTo);
      if (recipientType === 'admin') {
        notificationTitle = 'Ticket Assignment Update';
        notificationMessage = `Ticket #${ticket.ticketNumber} has been assigned to ${assignedName}. Ensure proper handover if needed.`;
      } else {
        notificationTitle = 'Support Agent Assigned';
        notificationMessage = `Your support ticket has been assigned to ${assignedName} for personalized assistance.`;
      }
      headerColor = '#8b5cf6';
      break;
    case 'ticket_replied':
      notificationIcon = '💬';
      const replyAuthor = actionDetails?.changedBy ? formatUserName(actionDetails.changedBy) : 'Support Team';
      if (recipientType === 'admin') {
        notificationTitle = 'New Reply on Ticket';
        notificationMessage = `${replyAuthor} has added a reply to ticket #${ticket.ticketNumber}. Review and respond if necessary.`;
      } else {
        notificationTitle = 'New Reply from Support';
        notificationMessage = `${replyAuthor} has replied to your support ticket. Check the response and reply if needed.`;
      }
      headerColor = '#06b6d4';
      break;
  }

  const subject = `${notificationIcon} ${notificationTitle} - ${ticket.ticketNumber}`;

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
  <title>${branding.companyName} Ticket Notification</title>
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
    ${notificationTitle} #${ticket.ticketNumber} - ${ticket.title}
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
          
          <!-- Notification banner -->
          <tr>
            <td style="padding:0 20px 16px;" class="mobile-padding">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${headerColor};border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" style="padding:20px 16px;">
                    <h2 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">${notificationIcon} ${notificationTitle}</h2>
                    <p style="margin:6px 0 0;color:#ffffff;opacity:0.9;font-size:14px;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">${notificationMessage}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Ticket information -->
          <tr>
            <td style="padding:0 20px 20px;" class="mobile-padding">
              
              <!-- Ticket header -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td style="padding-bottom:8px;">
                          <h3 style="margin:0;font-size:18px;font-weight:700;color:#1e293b;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">${ticket.title}</h3>
                          <p style="margin:4px 0 0;font-size:13px;color:#64748b;font-family:${branding.fontFamily},Arial,sans-serif;">Ticket #${ticket.ticketNumber}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Ticket Description -->
              ${ticket.description && notificationType !== 'ticket_updated' && notificationType !== 'ticket_replied' && notificationType !== 'ticket_resolved' ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;">
                    <h4 style="margin:0 0 12px 0;font-size:14px;font-weight:700;color:#1e293b;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">📝 Issue Description</h4>
                    <div style="background-color:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
                      <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;font-family:${branding.fontFamily},Arial,sans-serif;">${ticket.description.replace(/\n/g, '<br>')}</p>
                    </div>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Ticket details grid -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <!-- Status Card -->
                  <td width="24%" style="padding-right:8px;vertical-align:top;" class="mobile-stack">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:2px solid ${getStatusColor(ticket.status)};border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td align="center" style="padding:12px 8px;">
                          <p style="margin:0 0 4px 0;font-size:10px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">STATUS</p>
                          <p style="margin:0;font-size:14px;font-weight:700;color:${getStatusColor(ticket.status)};line-height:1;font-family:${branding.fontFamily},Arial,sans-serif;">${getStatusLabel(ticket.status)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  
                  <!-- Priority Card -->
                  <td width="24%" style="padding:0 4px;vertical-align:top;" class="mobile-stack">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:2px solid ${getPriorityColor(ticket.priority)};border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td align="center" style="padding:12px 8px;">
                          <p style="margin:0 0 4px 0;font-size:10px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">PRIORITY</p>
                          <p style="margin:0;font-size:14px;font-weight:700;color:${getPriorityColor(ticket.priority)};line-height:1;font-family:${branding.fontFamily},Arial,sans-serif;">${getPriorityLabel(ticket.priority)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- Service Card -->
                  <td width="24%" style="padding:0 4px;vertical-align:top;" class="mobile-stack">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:2px solid #6b7280;border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td align="center" style="padding:12px 8px;">
                          <p style="margin:0 0 4px 0;font-size:10px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">SERVICE</p>
                          <p style="margin:0;font-size:12px;font-weight:700;color:#6b7280;line-height:1.1;text-align:center;font-family:${branding.fontFamily},Arial,sans-serif;">${getServiceLabel(ticket.service)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- Date Card -->
                  <td width="24%" style="padding-left:8px;vertical-align:top;" class="mobile-stack">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td align="center" style="padding:12px 8px;">
                          <p style="margin:0 0 4px 0;font-size:10px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">CREATED</p>
                          <p style="margin:0;font-size:12px;font-weight:700;color:#475569;line-height:1.1;text-align:center;font-family:${branding.fontFamily},Arial,sans-serif;">${new Date(ticket.createdAt).toLocaleDateString()}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Service Information -->
              ${notificationType !== 'ticket_updated' && notificationType !== 'ticket_replied' && notificationType !== 'ticket_resolved' ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f0f9ff;border:2px solid #0ea5e9;border-radius:12px;margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;">
                    <h4 style="margin:0 0 8px 0;font-size:14px;font-weight:700;color:#0c4a6e;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">🎯 Service Category: ${getServiceLabel(ticket.service)}</h4>
                    <p style="margin:0 0 12px 0;font-size:13px;color:#0369a1;line-height:1.4;font-family:${branding.fontFamily},Arial,sans-serif;">${getServiceDescription(ticket.service)}</p>
                    
                    ${recipientType === 'customer' ? `
                    <div style="background-color:#ffffff;border:1px solid #bae6fd;border-radius:8px;padding:12px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                        <tr>
                          <td width="50%" style="padding:4px 8px 4px 0;font-size:12px;vertical-align:top;">
                            <strong style="color:#0c4a6e;display:block;margin-bottom:2px;font-family:${branding.fontFamily},Arial,sans-serif;">Expected Response:</strong>
                            <span style="color:#0369a1;font-family:${branding.fontFamily},Arial,sans-serif;">
                              ${ticket.priority === 'urgent' ? 'Within 1 hour' : 
                                ticket.priority === 'high' ? 'Within 4 hours' : 
                                ticket.priority === 'medium' ? 'Within 24 hours' : 'Within 48 hours'}
                            </span>
                          </td>
                          <td width="50%" style="padding:4px 0 4px 8px;font-size:12px;vertical-align:top;">
                            <strong style="color:#0c4a6e;display:block;margin-bottom:2px;font-family:${branding.fontFamily},Arial,sans-serif;">Support Hours:</strong>
                            <span style="color:#0369a1;font-family:${branding.fontFamily},Arial,sans-serif;">
                              ${ticket.service === 'technical_support' || ticket.priority === 'urgent' ? '24/7 Available' : 'Mon-Fri 9AM-6PM'}
                            </span>
                          </td>
                        </tr>
                      </table>
                    </div>
                    ` : `
                    <div style="background-color:#ffffff;border:1px solid #bae6fd;border-radius:8px;padding:12px;">
                      <p style="margin:0;font-size:12px;color:#0369a1;font-family:${branding.fontFamily},Arial,sans-serif;">
                        <strong>Priority Level:</strong> ${getPriorityLabel(ticket.priority)} | 
                        <strong>SLA Target:</strong> ${ticket.priority === 'urgent' ? '1 hour' : 
                          ticket.priority === 'high' ? '4 hours' : 
                          ticket.priority === 'medium' ? '24 hours' : '48 hours'} response time
                      </p>
                    </div>
                    `}
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Customer information (if available) -->
              ${ticket.user && notificationType !== 'ticket_updated' && notificationType !== 'ticket_replied' && notificationType !== 'ticket_resolved' ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;">
                    <h4 style="margin:0 0 12px 0;font-size:14px;font-weight:700;color:#1e293b;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">Customer Information</h4>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td width="50%" style="padding:4px 8px 4px 0;font-size:13px;vertical-align:top;">
                          <strong style="color:#1e293b;display:block;margin-bottom:2px;font-family:${branding.fontFamily},Arial,sans-serif;">Name:</strong>
                          <span style="color:#475569;font-family:${branding.fontFamily},Arial,sans-serif;">${formatUserName(ticket.user)}</span>
                        </td>
                        <td width="50%" style="padding:4px 0 4px 8px;font-size:13px;vertical-align:top;">
                          <strong style="color:#1e293b;display:block;margin-bottom:2px;font-family:${branding.fontFamily},Arial,sans-serif;">Email:</strong>
                          <span style="color:#475569;font-family:${branding.fontFamily},Arial,sans-serif;">${ticket.user.email}</span>
                        </td>
                      </tr>
                      ${ticket.user.company ? `
                      <tr>
                        <td colspan="2" style="padding:4px 0;font-size:13px;">
                          <strong style="color:#1e293b;display:block;margin-bottom:2px;font-family:${branding.fontFamily},Arial,sans-serif;">Company:</strong>
                          <span style="color:#475569;font-family:${branding.fontFamily},Arial,sans-serif;">${ticket.user.company}</span>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Update Details (for ticket updates) -->
              ${notificationType === 'ticket_updated' && actionDetails ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#fef3c7;border:2px solid #f59e0b;border-radius:12px;margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;">
                    <h4 style="margin:0 0 12px 0;font-size:14px;font-weight:700;color:#92400e;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">🔄 What Changed</h4>
                    
                    ${actionDetails.changes ? `
                    <div style="background-color:#ffffff;border:1px solid #fbbf24;border-radius:8px;padding:12px;margin-bottom:12px;">
                      ${actionDetails.changes.oldStatus && actionDetails.changes.newStatus ? `
                      <p style="margin:0 0 8px 0;font-size:13px;color:#374151;font-family:${branding.fontFamily},Arial,sans-serif;">
                        <strong>Status:</strong> ${getStatusLabel(actionDetails.changes.oldStatus)} → ${getStatusLabel(actionDetails.changes.newStatus)}
                      </p>
                      ` : ''}
                      ${actionDetails.changes.oldPriority && actionDetails.changes.newPriority ? `
                      <p style="margin:0 0 8px 0;font-size:13px;color:#374151;font-family:${branding.fontFamily},Arial,sans-serif;">
                        <strong>Priority:</strong> ${getPriorityLabel(actionDetails.changes.oldPriority)} → ${getPriorityLabel(actionDetails.changes.newPriority)}
                      </p>
                      ` : ''}
                      ${actionDetails.changes.newAssignedTo ? `
                      <p style="margin:0;font-size:13px;color:#374151;font-family:${branding.fontFamily},Arial,sans-serif;">
                        <strong>Assigned to:</strong> ${formatUserName(ticket.assignedTo)}
                      </p>
                      ` : ''}
                    </div>
                    ` : ''}
                    
                    ${actionDetails.changedBy ? `
                    <p style="margin:0;font-size:12px;color:#92400e;font-style:italic;font-family:${branding.fontFamily},Arial,sans-serif;">
                      Updated by ${formatUserName(actionDetails.changedBy)} on ${new Date().toLocaleString()}
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Recent Messages/Replies (for ticket updates and replies) -->
              ${(notificationType === 'ticket_updated' || notificationType === 'ticket_replied') && ticket.replies && ticket.replies.length > 0 ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f0fdf4;border:2px solid #22c55e;border-radius:12px;margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;">
                    <h4 style="margin:0 0 12px 0;font-size:14px;font-weight:700;color:#15803d;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">💬 ${notificationType === 'ticket_replied' ? 'Latest Reply' : 'Recent Messages'}</h4>
                    
                    ${notificationType === 'ticket_replied' ? 
                      // For replies, show just the latest reply prominently
                      ticket.replies.slice(-1).map((reply: TicketReply) => `
                      <div style="background-color:#ffffff;border:2px solid #22c55e;border-radius:8px;padding:16px;margin-bottom:8px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                          <p style="margin:0;font-size:14px;font-weight:700;color:#15803d;font-family:${branding.fontFamily},Arial,sans-serif;">
                            ${formatReplyAuthor(reply, ticket)}${reply.isInternal ? ' (Internal Note)' : ''}
                          </p>
                          <p style="margin:0;font-size:12px;color:#6b7280;font-family:${branding.fontFamily},Arial,sans-serif;">
                            ${new Date(reply.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <p style="margin:0;font-size:14px;line-height:1.5;color:#374151;font-family:${branding.fontFamily},Arial,sans-serif;">
                          ${reply.content.replace(/\n/g, '<br>')}
                        </p>
                      </div>
                      `).join('') :
                      // For updates, show last 3 messages as before
                      ticket.replies.slice(-3).map((reply: TicketReply) => `
                      <div style="background-color:#ffffff;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin-bottom:8px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                          <p style="margin:0;font-size:12px;font-weight:600;color:#15803d;font-family:${branding.fontFamily},Arial,sans-serif;">
                            ${formatReplyAuthor(reply, ticket)}${reply.isInternal ? ' (Internal Note)' : ''}
                          </p>
                          <p style="margin:0;font-size:11px;color:#6b7280;font-family:${branding.fontFamily},Arial,sans-serif;">
                            ${new Date(reply.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <p style="margin:0;font-size:13px;line-height:1.5;color:#374151;font-family:${branding.fontFamily},Arial,sans-serif;">
                          ${reply.content.replace(/\n/g, '<br>').substring(0, 300)}${reply.content.length > 300 ? '...' : ''}
                        </p>
                      </div>
                      `).join('')
                    }
                    
                    ${notificationType === 'ticket_updated' && ticket.replies.length > 3 ? `
                    <p style="margin:8px 0 0;font-size:12px;color:#15803d;text-align:center;font-family:${branding.fontFamily},Arial,sans-serif;">
                      + ${ticket.replies.length - 3} more message${ticket.replies.length - 3 === 1 ? '' : 's'} in the full ticket
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Assignment information (if assigned) -->
              ${ticket.assignedTo ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f0f9ff;border:2px solid #0ea5e9;border-radius:12px;margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;">
                    <h4 style="margin:0 0 8px 0;font-size:14px;font-weight:700;color:#0c4a6e;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">👤 Assigned Support Agent</h4>
                    <p style="margin:0;font-size:15px;font-weight:600;color:#0369a1;font-family:${branding.fontFamily},Arial,sans-serif;">${formatUserName(ticket.assignedTo)}</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#0c4a6e;font-family:${branding.fontFamily},Arial,sans-serif;">Your dedicated support agent for this ticket</p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Action details (if provided) -->
              ${actionDetails?.replyContent && !actionDetails.isInternal && notificationType !== 'ticket_replied' ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f0fdf4;border:2px solid #22c55e;border-radius:12px;margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;">
                    <h4 style="margin:0 0 8px 0;font-size:14px;font-weight:700;color:#15803d;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">💬 Latest Reply</h4>
                    <div style="background-color:#ffffff;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin-top:8px;">
                      <p style="margin:0;font-size:14px;line-height:1.5;color:#374151;font-family:${branding.fontFamily},Arial,sans-serif;">${actionDetails.replyContent.replace(/\n/g, '<br>')}</p>
                    </div>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Rating information (if resolved with rating) -->
              ${ticket.customerSatisfactionRating && notificationType === 'ticket_resolved' ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#fefce8;border:2px solid #eab308;border-radius:12px;margin-bottom:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;">
                    <h4 style="margin:0 0 8px 0;font-size:14px;font-weight:700;color:#a16207;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">⭐ Customer Feedback</h4>
                    <p style="margin:0;font-size:16px;font-weight:600;color:#a16207;font-family:${branding.fontFamily},Arial,sans-serif;">${'★'.repeat(ticket.customerSatisfactionRating)}${'☆'.repeat(5 - ticket.customerSatisfactionRating)} (${ticket.customerSatisfactionRating}/5)</p>
                    ${ticket.customerSatisfactionComment ? `
                    <div style="background-color:#ffffff;border:1px solid #fde047;border-radius:8px;padding:12px;margin-top:8px;">
                      <p style="margin:0;font-size:14px;line-height:1.5;color:#374151;font-style:italic;font-family:${branding.fontFamily},Arial,sans-serif;">"${ticket.customerSatisfactionComment}"</p>
                    </div>
                    ` : ''}
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Call to Action Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center" style="border-radius:12px;background-color:${headerColor};box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                    <a href="${actionUrl}" style="display:inline-block;padding:18px 32px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;text-align:center;min-width:200px;line-height:1.2;font-family:${branding.fontFamily},Arial,sans-serif;">
                      <font color="#ffffff">View Ticket Details</font>
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Help and support info -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="padding:16px;text-align:center;">
                    <p style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#1e293b;font-family:${branding.fontFamily},Arial,sans-serif;">Need additional help?</p>
                    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.4;font-family:${branding.fontFamily},Arial,sans-serif;">
                      Reply to this ticket or contact our support team for immediate assistance.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px;background-color:#f8fafc;border-top:1px solid #e2e8f0;" class="mobile-padding">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="center">
                    <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">
                      <a href="${baseUrl}" style="color:${branding.primaryColor};text-decoration:none;margin:0 8px;font-family:${branding.fontFamily},Arial,sans-serif;">Dashboard</a> •
                      <a href="${baseUrl}/support" style="color:${branding.primaryColor};text-decoration:none;margin:0 8px;font-family:${branding.fontFamily},Arial,sans-serif;">Support</a> •
                      <a href="${baseUrl}/contact" style="color:${branding.primaryColor};text-decoration:none;margin:0 8px;font-family:${branding.fontFamily},Arial,sans-serif;">Contact</a>
                    </p>
                    <p style="margin:0 0 6px;font-size:11px;color:#94a3b8;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">© 2024 ${branding.companyName}. All rights reserved.</p>
                    <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.3;font-family:${branding.fontFamily},Arial,sans-serif;">This is an automated ticket notification.</p>
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
${notificationTitle.toUpperCase()} - ${branding.companyName}

${notificationMessage}

TICKET DETAILS:
- Ticket Number: #${ticket.ticketNumber}
- Title: ${ticket.title}
- Service: ${getServiceLabel(ticket.service)}
- Priority: ${getPriorityLabel(ticket.priority)}
- Status: ${getStatusLabel(ticket.status)}
- Created: ${new Date(ticket.createdAt).toLocaleString()}

${ticket.description && notificationType !== 'ticket_updated' && notificationType !== 'ticket_replied' && notificationType !== 'ticket_resolved' ? `
ISSUE DESCRIPTION:
${ticket.description}
` : ''}

${notificationType !== 'ticket_updated' && notificationType !== 'ticket_replied' && notificationType !== 'ticket_resolved' ? `
SERVICE INFORMATION:
- Category: ${getServiceLabel(ticket.service)}
- Description: ${getServiceDescription(ticket.service)}
- Expected Response: ${ticket.priority === 'urgent' ? 'Within 1 hour' : 
  ticket.priority === 'high' ? 'Within 4 hours' : 
  ticket.priority === 'medium' ? 'Within 24 hours' : 'Within 48 hours'}
- Support Hours: ${ticket.service === 'technical_support' || ticket.priority === 'urgent' ? '24/7 Available' : 'Mon-Fri 9AM-6PM'}
` : ''}

${notificationType === 'ticket_updated' && actionDetails ? `
WHAT CHANGED:
${actionDetails.changes?.oldStatus && actionDetails.changes?.newStatus ? `- Status: ${getStatusLabel(actionDetails.changes.oldStatus)} → ${getStatusLabel(actionDetails.changes.newStatus)}` : ''}
${actionDetails.changes?.oldPriority && actionDetails.changes?.newPriority ? `- Priority: ${getPriorityLabel(actionDetails.changes.oldPriority)} → ${getPriorityLabel(actionDetails.changes.newPriority)}` : ''}
${actionDetails.changes?.newAssignedTo ? `- Assigned to: ${formatUserName(ticket.assignedTo)}` : ''}
${actionDetails.changedBy ? `\nUpdated by ${formatUserName(actionDetails.changedBy)} on ${new Date().toLocaleString()}` : ''}
` : ''}

${notificationType === 'ticket_updated' && ticket.replies && ticket.replies.length > 0 ? `
RECENT MESSAGES:
${ticket.replies.slice(-3).map((reply: TicketReply) => `
${formatReplyAuthor(reply, ticket)}${reply.isInternal ? ' (Internal Note)' : ''} - ${new Date(reply.createdAt).toLocaleString()}
${reply.content.substring(0, 300)}${reply.content.length > 300 ? '...' : ''}
`).join('\n---\n')}
${ticket.replies.length > 3 ? `\n+ ${ticket.replies.length - 3} more message${ticket.replies.length - 3 === 1 ? '' : 's'} in the full ticket` : ''}
` : ''}

${notificationType === 'ticket_replied' && ticket.replies && ticket.replies.length > 0 ? `
LATEST REPLY:
${ticket.replies.slice(-1).map((reply: TicketReply) => `
${formatReplyAuthor(reply, ticket)}${reply.isInternal ? ' (Internal Note)' : ''} - ${new Date(reply.createdAt).toLocaleString()}
${reply.content}
`).join('')}
` : ''}

${ticket.user && notificationType !== 'ticket_updated' && notificationType !== 'ticket_replied' && notificationType !== 'ticket_resolved' ? `
CUSTOMER INFORMATION:
- Name: ${formatUserName(ticket.user)}
- Email: ${ticket.user.email}
${ticket.user.company ? `- Company: ${ticket.user.company}` : ''}
` : ''}

${ticket.assignedTo ? `
ASSIGNED TO: ${formatUserName(ticket.assignedTo)}
` : ''}

${actionDetails?.replyContent && !actionDetails.isInternal && notificationType !== 'ticket_replied' ? `
LATEST REPLY:
${actionDetails.replyContent}
` : ''}

${ticket.customerSatisfactionRating ? `
CUSTOMER RATING: ${ticket.customerSatisfactionRating}/5 stars
${ticket.customerSatisfactionComment ? `FEEDBACK: "${ticket.customerSatisfactionComment}"` : ''}
` : ''}

View full ticket details: ${actionUrl}

Need help? Contact our support team.

© 2024 ${branding.companyName}. All rights reserved.
This is an automated ticket notification.
  `;

  return { subject, html, text };
} 