import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import UserModel from '@/models/User';
import TicketNotificationService from '@/services/TicketNotificationService';

// Interfaces for type safety
interface TicketReply {
  content: string;
  authorId: string;
  authorType: 'admin' | 'user';
  createdAt: Date;
  isInternal: boolean;
  attachments: unknown[];
}

interface ActionDetails {
  action: 'status_changed' | 'resolved' | 'assigned' | 'replied';
  changedBy: {
    _id: unknown;
    email: string;
    name?: string;
    role?: string;
  };
  changes?: {
    oldStatus: string;
    newStatus: string;
  };
  replyContent?: string;
  isInternal?: boolean;
}

interface NotificationRecipient {
  email: string;
  name: string;
  type: 'admin' | 'customer';
}

interface TestTicket {
  _id: string;
  ticketNumber: string;
  title: string;
  description: string;
  service: string;
  priority: string;
  status: string;
  userId: string;
  userEmail: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  user: {
    _id: string;
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    company: string;
  };
  assignedTo?: {
    _id: string;
    email: string;
    name: string;
    role: string;
  };
  customerSatisfactionRating?: number;
  customerSatisfactionComment?: string;
  replies: TicketReply[];
}

// Type for notification service with proper method signatures
interface NotificationServiceWithOverrides {
  getNotificationRecipients: (ticket: TestTicket, type: string) => Promise<NotificationRecipient[]>;
  sendTicketNotification: (ticket: TestTicket, options: {
    ticketId: string;
    notificationType: string;
    actionDetails?: ActionDetails;
  }) => Promise<{ results: unknown[] }>;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Check if user is admin
    const currentUser = await UserModel.findById(user.id).lean();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { notificationType, testEmail, includeCustomerInTest = false } = body;

    if (!notificationType || !testEmail) {
      return NextResponse.json(
        { error: 'notificationType and testEmail are required' },
        { status: 400 }
      );
    }

    // Validate notification type
    const validTypes = ['ticket_created', 'ticket_updated', 'ticket_resolved', 'ticket_assigned', 'ticket_replied'];
    if (!validTypes.includes(notificationType)) {
      return NextResponse.json(
        { error: 'Invalid notification type' },
        { status: 400 }
      );
    }

    // Create sample ticket data for testing
    const sampleTicket = {
      _id: '507f1f77bcf86cd799439011',
      ticketNumber: 'TKT-000001',
      title: 'Test Support Ticket - Email Notification Demo',
      description: 'This is a test ticket created to demonstrate the email notification system. It includes sample data to showcase how notifications appear in various scenarios.',
      service: 'technical_support',
      priority: 'medium',
      status: 'open',
      userId: '507f1f77bcf86cd799439012',
      userEmail: 'customer@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
      resolvedAt: notificationType === 'ticket_resolved' ? new Date() : undefined,
      user: {
        _id: '507f1f77bcf86cd799439012',
        email: 'customer@example.com',
        name: 'John Smith',
        firstName: 'John',
        lastName: 'Smith',
        company: 'Acme Corporation'
      },
      assignedTo: ['ticket_assigned', 'ticket_replied'].includes(notificationType) ? {
        _id: user.id,
        email: currentUser.email,
        name: currentUser.name || 'Support Agent',
        role: currentUser.role
      } : undefined,
      customerSatisfactionRating: notificationType === 'ticket_resolved' ? 5 : undefined,
      customerSatisfactionComment: notificationType === 'ticket_resolved' ? 'Excellent support! The team resolved my issue quickly and professionally.' : undefined,
      replies: [] as TicketReply[]
    };

    // Add sample reply if it's a reply notification
    if (notificationType === 'ticket_replied') {
      sampleTicket.replies = [{
        content: 'Thank you for contacting our support team. I\'ve reviewed your issue and I\'m here to help you resolve it. Let me investigate this further and get back to you with a solution.',
        authorId: user.id,
        authorType: 'admin',
        createdAt: new Date(),
        isInternal: false,
        attachments: []
      }];
    }

    // Add sample conversation for ticket updates to show recent messages
    if (notificationType === 'ticket_updated') {
      sampleTicket.replies = [
        {
          content: 'I\'m experiencing issues with call quality on outbound calls. The audio cuts out frequently and customers are complaining.',
          authorId: '507f1f77bcf86cd799439012',
          authorType: 'user',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          isInternal: false,
          attachments: []
        },
        {
          content: 'Thank you for reporting this issue. I\'ve reviewed your account and noticed some configuration issues with your codec settings. I\'m updating your account configuration now.',
          authorId: user.id,
          authorType: 'admin',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          isInternal: false,
          attachments: []
        },
        {
          content: 'Internal note: Updated codec from G.711 to G.729 and adjusted jitter buffer settings. Also increased packet timeout to 200ms.',
          authorId: user.id,
          authorType: 'admin',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          isInternal: true,
          attachments: []
        },
        {
          content: 'The configuration has been updated. Please test your calls now and let me know if you notice any improvement in call quality.',
          authorId: user.id,
          authorType: 'admin',
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          isInternal: false,
          attachments: []
        }
      ];
    }

    // Create action details based on notification type
    let actionDetails: Partial<ActionDetails> = {};
    
    switch (notificationType) {
      case 'ticket_updated':
        sampleTicket.status = 'in_progress';
        actionDetails = {
          action: 'status_changed',
          changedBy: currentUser,
          changes: {
            oldStatus: 'open',
            newStatus: 'in_progress'
          }
        };
        break;
      case 'ticket_resolved':
        sampleTicket.status = 'resolved';
        actionDetails = {
          action: 'resolved',
          changedBy: currentUser
        };
        break;
      case 'ticket_assigned':
        actionDetails = {
          action: 'assigned',
          changedBy: currentUser
        };
        break;
      case 'ticket_replied':
        actionDetails = {
          action: 'replied',
          changedBy: currentUser,
          replyContent: sampleTicket.replies[0].content,
          isInternal: false
        };
        break;
    }

    const notificationService = TicketNotificationService.getInstance();

    // Temporarily override the notification recipients for testing
    const serviceWithOverrides = notificationService as unknown as NotificationServiceWithOverrides;
    const originalGetNotificationRecipients = serviceWithOverrides.getNotificationRecipients;
    
    serviceWithOverrides.getNotificationRecipients = async (ticket: TestTicket, _type: string) => {
      const recipients: NotificationRecipient[] = [];
      
      // Always include the test email as admin
      recipients.push({
        email: testEmail,
        name: 'Test Admin',
        type: 'admin' as const
      });

      // Optionally include customer template but sent to the same test email
      if (includeCustomerInTest && ticket.user) {
        recipients.push({
          email: testEmail, // Send customer email to the same test email address
          name: ticket.user.name,
          type: 'customer' as const // This will generate the customer template
        });
      }

      return recipients;
    };

    try {
      // Send the test notification
      const result = await notificationService.sendTicketNotification(sampleTicket, {
        ticketId: sampleTicket._id,
        notificationType: notificationType,
        actionDetails: Object.keys(actionDetails).length > 0 ? actionDetails as ActionDetails : undefined
      });

      // Restore original method
      serviceWithOverrides.getNotificationRecipients = originalGetNotificationRecipients;

      return NextResponse.json({
        message: 'Test notification sent successfully',
        results: result.results,
        sampleData: {
          notificationType,
          ticketNumber: sampleTicket.ticketNumber,
          testEmail,
          includeCustomerInTest
        }
      });

    } catch (error) {
      // Restore original method in case of error
      serviceWithOverrides.getNotificationRecipients = originalGetNotificationRecipients;
      throw error;
    }

  } catch (error) {
    console.error('Error sending test notification:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
}

// GET endpoint to get available notification types for testing
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Check if user is admin
    const currentUser = await UserModel.findById(user.id).lean();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const notificationTypes = [
      {
        value: 'ticket_created',
        label: 'Ticket Created',
        description: 'Sent when a new support ticket is created'
      },
      {
        value: 'ticket_updated',
        label: 'Ticket Updated',
        description: 'Sent when ticket status, priority, or assignment changes'
      },
      {
        value: 'ticket_resolved',
        label: 'Ticket Resolved',
        description: 'Sent when a ticket is marked as resolved'
      },
      {
        value: 'ticket_assigned',
        label: 'Ticket Assigned',
        description: 'Sent when a ticket is assigned to a support agent'
      },
      {
        value: 'ticket_replied',
        label: 'Ticket Reply',
        description: 'Sent when a new reply is added to a ticket'
      }
    ];

    return NextResponse.json({
      notificationTypes,
      currentUserEmail: currentUser.email
    });

  } catch (error) {
    console.error('Error getting notification types:', error);
    return NextResponse.json(
      { error: 'Failed to get notification types' },
      { status: 500 }
    );
  }
} 