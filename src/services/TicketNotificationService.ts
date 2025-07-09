import { connectToDatabase } from '@/lib/db';
import UserModel from '@/models/User';
import BrandingSettings from '@/models/BrandingSettings';
import { getEmailBrandingStyles } from '@/lib/brandingUtils';
import { generateTicketNotificationTemplate } from '@/lib/emailTemplates/ticketNotifications';
import { createEmailLog, markEmailAsSent, markEmailAsFailed } from '@/lib/emailLogger';
import SmtpService from '@/services/SmtpService';
import UserOnboardingModel from '@/models/UserOnboarding';

// TypeScript interfaces for ticket objects
interface TicketUser {
  _id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  company?: string;
}

interface TicketReplyWithAuthor {
  _id?: string;
  content: string;
  authorId: string;
  authorType: 'user' | 'admin';
  isInternal: boolean;
  createdAt: Date;
  author?: TicketUser;
}

interface PopulatedTicket {
  _id: string;
  ticketNumber: string;
  title: string;
  description: string;
  service: string;
  priority: string;
  status: string;
  userId: string;
  user?: TicketUser;
  userEmail: string;
  assignedTo?: TicketUser;
  assignedToId?: string;
  replies?: TicketReplyWithAuthor[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface TicketNotificationOptions {
  ticketId: string;
  notificationType: 'ticket_created' | 'ticket_updated' | 'ticket_resolved' | 'ticket_assigned' | 'ticket_replied';
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

export interface NotificationRecipient {
  email: string;
  name?: string;
  role?: string;
  type: 'customer' | 'admin';
}

interface UserDetails {
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

// Type definition for MongoDB user document
interface UserDocument {
  _id: { toString(): string };
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

export class TicketNotificationService {
  private static instance: TicketNotificationService;

  public static getInstance(): TicketNotificationService {
    if (!TicketNotificationService.instance) {
      TicketNotificationService.instance = new TicketNotificationService();
    }
    return TicketNotificationService.instance;
  }

  /**
   * Send ticket notification to relevant recipients
   */
  public async sendTicketNotification(
    ticket: PopulatedTicket,
    options: TicketNotificationOptions
  ): Promise<{ success: boolean; results: Array<{ recipient: string; success: boolean; error?: string }> }> {
    try {
      await connectToDatabase();

      const { notificationType, actionDetails } = options;
      const results: Array<{ recipient: string; success: boolean; error?: string }> = [];

      // Determine recipients based on notification type
      const actionPerformedBy = options.actionDetails?.changedBy?.email;
      const recipients = await this.getNotificationRecipients(ticket, options.notificationType, actionPerformedBy);

      if (recipients.length === 0) {
        console.log(`No recipients found for ${notificationType} notification for ticket ${ticket.ticketNumber}`);
        return { success: true, results: [] };
      }

      // Populate reply authors with detailed information
      const ticketWithAuthors = await this.populateReplyAuthors(ticket);

      // Get branding settings
      const brandingSettings = await BrandingSettings.getSettings();
      const branding = getEmailBrandingStyles(brandingSettings || {});

      // Send notification to each recipient
      for (const recipient of recipients) {
        try {
          const emailContent = generateTicketNotificationTemplate({
            ticket: ticketWithAuthors,
            branding,
            notificationType: notificationType,
            recipientType: recipient.type,
            actionDetails: actionDetails
          });

          // Create email log entry
          const logResult = await createEmailLog({
            userId: recipient.type === 'customer' ? ticket.userId : (recipient as unknown as TicketUser)._id?.toString() || 'admin',
            userEmail: recipient.email,
            userName: this.formatUserName(recipient),
            notificationType: this.mapNotificationTypeToLogType(notificationType) as any,
            emailSubject: emailContent.subject,
            emailBody: emailContent.html,
            metadata: {
              ticketId: ticket._id,
              ticketNumber: ticket.ticketNumber,
              recipientType: recipient.type,
              notificationTrigger: notificationType,
              actionDetails: actionDetails
            }
          });

          if (!logResult.success) {
            console.error(`Failed to create email log for ${recipient.email}:`, logResult.error);
            results.push({ recipient: recipient.email, success: false, error: 'Failed to create email log' });
            continue;
          }

          // Send email using SmtpService
          const smtpService = SmtpService.getInstance();
          const sendResult = await smtpService.sendSupportEmail({
            to: recipient.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text
          });

          if (sendResult.success) {
            await markEmailAsSent(logResult.logId, sendResult.accountUsed?.fromEmail);
            results.push({ recipient: recipient.email, success: true });
            console.log(`✅ Sent ${notificationType} notification to ${recipient.email} (${recipient.type})`);
          } else {
            await markEmailAsFailed(logResult.logId, sendResult.error || 'Unknown error');
            results.push({ recipient: recipient.email, success: false, error: sendResult.error });
            console.error(`❌ Failed to send ${notificationType} notification to ${recipient.email}:`, sendResult.error);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({ recipient: recipient.email, success: false, error: errorMessage });
          console.error(`❌ Error sending notification to ${recipient.email}:`, error);
        }
      }

      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;

      console.log(`📧 Ticket notification summary: ${successCount}/${totalCount} notifications sent successfully for ticket ${ticket.ticketNumber}`);

      return {
        success: successCount === totalCount,
        results
      };

    } catch (error) {
      console.error('❌ Error in sendTicketNotification:', error);
      throw error;
    }
  }

  /**
   * Get notification recipients based on ticket and notification type
   */
  private async getNotificationRecipients(
    ticket: PopulatedTicket,
    notificationType: string,
    actionPerformedBy?: string // email of the person who performed the action
  ): Promise<NotificationRecipient[]> {
    const recipients: NotificationRecipient[] = [];

    try {
      // Special case for ticket_assigned: only notify the assigned person
      if (notificationType === 'ticket_assigned') {
        if (ticket.assignedTo) {
          let assignedUser;
          if (typeof ticket.assignedTo === 'string') {
            assignedUser = await UserModel.findById(ticket.assignedTo).lean();
          } else {
            assignedUser = ticket.assignedTo;
          }

          if (assignedUser && assignedUser.role === 'admin') {
            // Only add if they're not the one who assigned it
            if (!actionPerformedBy || assignedUser.email !== actionPerformedBy) {
              recipients.push({
                email: assignedUser.email,
                name: assignedUser.name,
                role: assignedUser.role,
                type: 'admin'
              });
            }
          }
        }
        return recipients;
      }

      // For all other notification types, include ticket owner (customer)
      if (ticket.user) {
        // Only include customer if they're not the one who performed the action
        const customerEmail = ticket.user.email || ticket.userEmail || '';
        if (!actionPerformedBy || customerEmail !== actionPerformedBy) {
          recipients.push({
            email: customerEmail,
            name: ticket.user.name,
            type: 'customer'
          });
        }
      } else if (ticket.userEmail) {
        // Only include if they're not the one who performed the action
        if (!actionPerformedBy || ticket.userEmail !== actionPerformedBy) {
          recipients.push({
            email: ticket.userEmail,
            type: 'customer'
          });
        }
      }

      // Include assigned admin if ticket is assigned (except for ticket_assigned which is handled above)
      if (ticket.assignedTo) {
        let assignedUser;
        if (typeof ticket.assignedTo === 'string') {
          assignedUser = await UserModel.findById(ticket.assignedTo).lean();
        } else {
          assignedUser = ticket.assignedTo;
        }

        if (assignedUser && assignedUser.role === 'admin') {
          // Only include if they're not the one who performed the action
          if (!actionPerformedBy || assignedUser.email !== actionPerformedBy) {
            recipients.push({
              email: assignedUser.email,
              name: assignedUser.name,
              role: assignedUser.role,
              type: 'admin'
            });
          }
        }
      }

      // For ticket_created and ticket_updated (when unassigned), include all admins
      if (['ticket_created', 'ticket_updated'].includes(notificationType) && !ticket.assignedTo) {
        const adminUsers = await UserModel.find({ role: 'admin' }).lean();
        for (const admin of adminUsers) {
          // Don't duplicate if already included as assigned user
          // Don't include if they're the one who performed the action
          if (!recipients.find(r => r.email === admin.email) && 
              (!actionPerformedBy || admin.email !== actionPerformedBy)) {
            recipients.push({
              email: admin.email,
              name: admin.name,
              role: admin.role,
              type: 'admin'
            });
          }
        }
      }

      return recipients;
    } catch (error) {
      console.error('Error getting notification recipients:', error);
      return recipients; // Return what we have so far
    }
  }

  /**
   * Format user name for display
   */
  private formatUserName(user: { name?: string; email: string }): string {
    if (user.name) return user.name;
    return user.email;
  }

  /**
   * Populate reply authors and assigned user with user details
   */
  private async populateReplyAuthors(ticket: PopulatedTicket): Promise<PopulatedTicket> {
    try {
      // Collect all user IDs we need to fetch
      const userIdsToFetch = new Set<string>();

      // Add reply author IDs
      if (ticket.replies && ticket.replies.length > 0) {
        ticket.replies.forEach((reply: TicketReplyWithAuthor) => {
          if (reply.authorId) {
            userIdsToFetch.add(reply.authorId);
          }
        });
      }

      // Add assigned user ID
      if (ticket.assignedTo && typeof ticket.assignedTo === 'string') {
        userIdsToFetch.add(ticket.assignedTo);
      }

      if (userIdsToFetch.size === 0) {
        return ticket;
      }

      // Fetch user details for all collected IDs
      const users = await UserModel.find({ _id: { $in: Array.from(userIdsToFetch) } }).lean();
      const userMap = users.reduce((acc, user) => {
        acc[user._id.toString()] = user;
        return acc;
      }, {} as Record<string, UserDocument>);

      // For customer authors, also get company information
      const customerIds = ticket.replies
        ?.filter((reply: TicketReplyWithAuthor) => reply.authorType === 'user')
        .map((reply: TicketReplyWithAuthor) => reply.authorId) || [];
      
      let companyMap: Record<string, string> = {};
      if (customerIds.length > 0) {
        const userOnboardings = await UserOnboardingModel.find({ 
          userId: { $in: customerIds } 
        }).lean();
        
        companyMap = userOnboardings.reduce((acc, onboarding) => {
          acc[onboarding.userId] = onboarding.companyName || '';
          return acc;
        }, {} as Record<string, string>);
      }

      // Populate assigned user
      let populatedAssignedTo = ticket.assignedTo;
      if (ticket.assignedTo && typeof ticket.assignedTo === 'string') {
        const assignedUserDetails = userMap[ticket.assignedTo];
        if (assignedUserDetails) {
          populatedAssignedTo = {
            _id: assignedUserDetails._id.toString(),
            email: assignedUserDetails.email,
            name: assignedUserDetails.name,
            firstName: assignedUserDetails.firstName,
            lastName: assignedUserDetails.lastName,
            role: assignedUserDetails.role
          };
        }
      }

      // Add author information to each reply
      const repliesWithAuthors = ticket.replies?.map((reply: TicketReplyWithAuthor) => {
        const authorDetails = userMap[reply.authorId];
        if (authorDetails) {
          return {
            ...reply,
            author: {
              _id: authorDetails._id.toString(),
              email: authorDetails.email,
              name: authorDetails.name,
              firstName: authorDetails.firstName,
              lastName: authorDetails.lastName,
              role: authorDetails.role,
              company: reply.authorType === 'user' ? companyMap[reply.authorId] : undefined
            }
          };
        }
        return reply;
      }) || [];

      return {
        ...ticket,
        assignedTo: populatedAssignedTo,
        replies: repliesWithAuthors
      };
    } catch (error) {
      console.error('Error populating reply authors and assigned user:', error);
      return ticket; // Return original ticket if population fails
    }
  }

  /**
   * Map ticket notification types to notification log types
   */
  private mapNotificationTypeToLogType(notificationType: string): string {
    const mapping: { [key: string]: string } = {
      'ticket_created': 'ticket_created',
      'ticket_updated': 'ticket_updated', 
      'ticket_resolved': 'ticket_resolved',
      'ticket_assigned': 'ticket_assigned',
      'ticket_replied': 'ticket_replied'
    };
    return mapping[notificationType] || 'ticket_notification';
  }

  /**
   * Send notification for ticket creation
   */
  public async notifyTicketCreated(ticket: PopulatedTicket, createdBy?: UserDetails): Promise<void> {
    try {
      await this.sendTicketNotification(ticket, {
        ticketId: ticket._id,
        notificationType: 'ticket_created',
        actionDetails: {
          action: 'created',
          changedBy: createdBy || {
            email: ticket.user?.email || ticket.userEmail,
            name: ticket.user?.name,
            firstName: ticket.user?.firstName,
            lastName: ticket.user?.lastName
          }
        }
      });
    } catch (error) {
      console.error('Error sending ticket created notification:', error);
    }
  }

  /**
   * Send notification for ticket updates
   */
  public async notifyTicketUpdated(
    ticket: PopulatedTicket,
    actionDetails: TicketNotificationOptions['actionDetails']
  ): Promise<void> {
    try {
      await this.sendTicketNotification(ticket, {
        ticketId: ticket._id,
        notificationType: 'ticket_updated',
        actionDetails
      });
    } catch (error) {
      console.error('Error sending ticket updated notification:', error);
    }
  }

  /**
   * Send notification for ticket resolution
   */
  public async notifyTicketResolved(
    ticket: PopulatedTicket,
    resolvedBy?: UserDetails
  ): Promise<void> {
    try {
      await this.sendTicketNotification(ticket, {
        ticketId: ticket._id,
        notificationType: 'ticket_resolved',
        actionDetails: {
          action: 'resolved',
          changedBy: resolvedBy
        }
      });
    } catch (error) {
      console.error('Error sending ticket resolved notification:', error);
    }
  }

  /**
   * Send notification for ticket assignment
   */
  public async notifyTicketAssigned(
    ticket: PopulatedTicket,
    assignedBy?: UserDetails
  ): Promise<void> {
    try {
      await this.sendTicketNotification(ticket, {
        ticketId: ticket._id,
        notificationType: 'ticket_assigned',
        actionDetails: {
          action: 'assigned',
          changedBy: assignedBy
        }
      });
    } catch (error) {
      console.error('Error sending ticket assigned notification:', error);
    }
  }

  /**
   * Send notification for new ticket replies
   */
  public async notifyTicketReplied(
    ticket: PopulatedTicket,
    replyContent: string,
    isInternal: boolean,
    replyAuthor?: UserDetails
  ): Promise<void> {
    try {
      // Don't send notifications for internal replies
      if (isInternal) {
        return;
      }

      await this.sendTicketNotification(ticket, {
        ticketId: ticket._id,
        notificationType: 'ticket_replied',
        actionDetails: {
          action: 'replied',
          changedBy: replyAuthor,
          replyContent,
          isInternal
        }
      });
    } catch (error) {
      console.error('Error sending ticket replied notification:', error);
    }
  }
}

export default TicketNotificationService; 