import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import TicketModel from '@/models/Ticket';
import UserModel from '@/models/User';
import UserOnboardingModel from '@/models/UserOnboarding';
import TicketNotificationService from '@/services/TicketNotificationService';
import { Types } from 'mongoose';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

interface UserDocument {
  _id: Types.ObjectId;
  email: string;
  name: string;
  role?: string;
  firstName?: string;
  lastName?: string;
}

interface NotificationData {
  type: 'reply' | 'status_change' | 'resolved';
  replyContent?: string;
  isInternal?: boolean;
  author?: UserDocument | null;
  oldStatus?: string;
  newStatus?: string;
  changedBy?: UserDocument | null;
}

// GET /api/tickets/[id] - Get specific ticket details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Await params before accessing properties (Next.js 15 requirement)
    const { id } = await params;

    // Check if current user is admin
    const currentUser = await UserModel.findById(user.id).lean();
    const isAdmin = currentUser?.role === 'admin';

    // First, try to find the ticket without user restriction to see if it exists
    const ticketExists = await TicketModel.findById(id).lean();
    if (!ticketExists) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // If user is admin, they can view any ticket; otherwise, only their own tickets
    let ticket;
    if (isAdmin) {
      ticket = await TicketModel.findById(id).lean();
    } else {
      // Try multiple user ID formats to handle potential mismatches
      ticket = await TicketModel.findOne({
        _id: id,
        $or: [
          { userId: user.id },
          { userId: user.id.toString() },
          { userEmail: user.email }
        ]
      }).lean();
    }

    if (!ticket) {
      console.log('Ticket access denied:', {
        ticketId: id,
        ticketUserId: ticketExists.userId,
        ticketUserEmail: ticketExists.userEmail,
        currentUserId: user.id,
        currentUserEmail: user.email,
        isAdmin
      });
      return NextResponse.json({ error: 'Ticket not found or you don\'t have permission to view it.' }, { status: 404 });
    }

    // Get user details for replies
    const userIds = ticket.replies.map(reply => reply.authorId);
    const users = await UserModel.find({ _id: { $in: userIds } })
      .select('_id email name role')
      .lean();

    const userMap = users.reduce((acc, user) => {
      acc[user._id.toString()] = user;
      return acc;
    }, {} as Record<string, UserDocument>);

    // Add user details to replies
    const repliesWithUserInfo = ticket.replies.map(reply => ({
      ...reply,
      author: userMap[reply.authorId] || null
    }));

    // Get assigned user details if ticket is assigned
    let assignedUser = null;
    if (ticket.assignedTo) {
      // Check if assignedTo looks like an ObjectId (24 character hex string)
      if (ticket.assignedTo.match(/^[0-9a-fA-F]{24}$/)) {
        assignedUser = await UserModel.findById(ticket.assignedTo)
          .select('_id email name role')
          .lean();
      } else {
        // Assume it's an email address
        assignedUser = await UserModel.findOne({ email: ticket.assignedTo })
          .select('_id email name role')
          .lean();
      }
    }

    // Get ticket owner details
    const ticketOwner = await UserModel.findOne({
      $or: [
        { _id: ticket.userId },
        { email: ticket.userEmail }
      ]
    }).select('_id email name').lean();

    return NextResponse.json({
      ...ticket,
      assignedTo: assignedUser,
      user: ticketOwner,
      replies: repliesWithUserInfo
    });

  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/tickets/[id] - Update ticket (add reply, close ticket, etc.)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Await params before accessing properties (Next.js 15 requirement)
    const { id } = await params;

    // Check if current user is admin
    const currentUser = await UserModel.findById(user.id).lean();
    const isAdmin = currentUser?.role === 'admin';

    const body = await request.json();
    const { action, content, attachments, status, rating } = body;

    // Find the ticket - admins can access any ticket, users only their own
    let ticket;
    if (isAdmin) {
      ticket = await TicketModel.findById(id);
    } else {
      ticket = await TicketModel.findOne({
        _id: id,
        $or: [
          { userId: user.id },
          { userId: user.id.toString() },
          { userEmail: user.email }
        ]
      });
    }

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Store notification data for change tracking
    let notificationData: NotificationData | null = null;

    switch (action) {
      case 'add_reply':
        if (!content) {
          return NextResponse.json(
            { error: 'Reply content is required' },
            { status: 400 }
          );
        }

        ticket.replies.push({
          content: content.trim(),
          attachments: attachments || [],
          authorId: user.id,
          authorType: 'user',
          createdAt: new Date()
        });

        // Update status to waiting_admin if it was waiting_user
        if (ticket.status === 'waiting_user') {
          ticket.status = 'waiting_admin';
        }

        // Prepare notification data for reply
        notificationData = {
          type: 'reply',
          replyContent: getPlainTextFromHtml(content.trim()),
          isInternal: false,
          author: currentUser
        };
        break;

      case 'close_ticket':
        if (ticket.status === 'resolved') {
          ticket.status = 'closed';
          ticket.closedAt = new Date();
          
          notificationData = {
            type: 'status_change',
            oldStatus: 'resolved',
            newStatus: 'closed',
            changedBy: currentUser
          };
        } else {
          return NextResponse.json(
            { error: 'Ticket must be resolved before closing' },
            { status: 400 }
          );
        }
        break;

      case 'reopen_ticket':
        if (ticket.status === 'closed' || ticket.status === 'resolved') {
          // Check 48-hour restriction
          const referenceDate = ticket.status === 'resolved' 
            ? ticket.resolvedAt 
            : ticket.closedAt;
          
          if (referenceDate) {
            const now = new Date();
            const restrictionDate = new Date(referenceDate);
            restrictionDate.setHours(restrictionDate.getHours() + 48); // 48-hour restriction
            
            if (now > restrictionDate) {
              const hoursAgo = Math.floor((now.getTime() - new Date(referenceDate).getTime()) / (1000 * 60 * 60));
              return NextResponse.json(
                { 
                  error: `Tickets can only be reopened within 48 hours. This ticket was ${ticket.status} ${hoursAgo} hours ago.`,
                  code: 'REOPEN_TIME_EXPIRED'
                },
                { status: 400 }
              );
            }
          }
          
          const oldStatus = ticket.status;
          ticket.status = 'open';
          ticket.resolvedAt = undefined;
          ticket.closedAt = undefined;
          
          // Add an automatic reply to indicate user reopened the ticket
          ticket.replies.push({
            content: '🔄 Customer reopened this ticket.',
            attachments: [],
            authorId: user.id,
            authorType: 'user',
            createdAt: new Date(),
            isInternal: false
          });

          notificationData = {
            type: 'status_change',
            oldStatus,
            newStatus: 'open',
            changedBy: currentUser
          };
        } else {
          return NextResponse.json(
            { error: 'Only closed or resolved tickets can be reopened' },
            { status: 400 }
          );
        }
        break;

      case 'rate_satisfaction':
        // Check if ticket is in a ratable status
        if (ticket.status !== 'closed' && ticket.status !== 'resolved') {
          return NextResponse.json(
            { error: 'Tickets can only be rated after being resolved or closed' },
            { status: 400 }
          );
        }

        // Check 48-hour restriction for re-rating
        if (ticket.customerSatisfactionRating) {
          const referenceDate = ticket.status === 'resolved' 
            ? ticket.resolvedAt 
            : ticket.closedAt;
          
          if (referenceDate) {
            const now = new Date();
            const restrictionDate = new Date(referenceDate);
            restrictionDate.setHours(restrictionDate.getHours() + 48); // 48-hour restriction
            
            if (now > restrictionDate) {
              const hoursAgo = Math.floor((now.getTime() - new Date(referenceDate).getTime()) / (1000 * 60 * 60));
              return NextResponse.json(
                { 
                  error: `Tickets can only be re-rated within 48 hours. This ticket was ${ticket.status} ${hoursAgo} hours ago.`,
                  code: 'RERATING_TIME_EXPIRED'
                },
                { status: 400 }
              );
            }
          }
        }

        if (rating < 1 || rating > 5) {
          return NextResponse.json(
            { error: 'Rating must be between 1 and 5' },
            { status: 400 }
          );
        }
        ticket.customerSatisfactionRating = rating;
        
        // Handle comment for low ratings
        if (body.comment) {
          ticket.customerSatisfactionComment = body.comment;
        }
        
        // Add an automatic reply to indicate rating was submitted
        const stars = '⭐'.repeat(rating);
        let ratingMessage = `${stars} Customer rated this ticket ${rating}/5 stars.`;
        if (body.comment) {
          ratingMessage += `\nFeedback: "${body.comment}"`;
        }
        
        ticket.replies.push({
          content: ratingMessage,
          attachments: [],
          authorId: user.id,
          authorType: 'user',
          createdAt: new Date(),
          isInternal: false
        });

        // No notification for rating - we don't want to spam admins
        break;

      case 'update_status':
        // Users can only mark tickets as resolved or reopen them
        if (status === 'resolved') {
          if (ticket.status === 'open' || ticket.status === 'in_progress' || ticket.status === 'waiting_admin' || ticket.status === 'waiting_user') {
            const oldStatus = ticket.status;
            ticket.status = 'resolved';
            ticket.resolvedAt = new Date();
            
            // Add an automatic reply to indicate user marked as resolved
            ticket.replies.push({
              content: '✅ Customer marked this ticket as resolved.',
              attachments: [],
              authorId: user.id,
              authorType: 'user',
              createdAt: new Date(),
              isInternal: false
            });

            notificationData = {
              type: 'resolved',
              oldStatus,
              newStatus: 'resolved',
              changedBy: currentUser
            };
          } else {
            return NextResponse.json(
              { error: 'Cannot mark this ticket as resolved' },
              { status: 400 }
            );
          }
        } else {
          return NextResponse.json(
            { error: 'Users can only mark tickets as resolved' },
            { status: 400 }
          );
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    await ticket.save();

    // Send notifications asynchronously if needed
    if (notificationData) {
      process.nextTick(async () => {
        try {
          // Get the updated ticket with populated user data for notifications
          const populatedTicket = await TicketModel.findById(ticket._id).lean();
          const userDetails = await UserModel.findById(ticket.userId).lean();
          const userOnboarding = await UserOnboardingModel.findOne({ userId: ticket.userId }).lean();

          // Add user information to ticket for notifications
          const ticketWithUser = {
            ...populatedTicket,
            _id: populatedTicket?._id?.toString(),
            user: userDetails ? {
              _id: userDetails._id.toString(),
              email: userDetails.email,
              name: userDetails.name,
              firstName: (userDetails as any).firstName || '',
              lastName: (userDetails as any).lastName || '',
              company: userOnboarding?.companyName
            } : null
          } as any;

          const notificationService = TicketNotificationService.getInstance();

          switch (notificationData.type) {
            case 'reply':
              await notificationService.notifyTicketReplied(
                ticketWithUser,
                notificationData.replyContent || '',
                notificationData.isInternal || false,
                notificationData.author || undefined
              );
              break;
            case 'status_change':
              await notificationService.notifyTicketUpdated(ticketWithUser, {
                action: 'status_changed',
                changedBy: notificationData.changedBy || undefined,
                changes: {
                  oldStatus: notificationData.oldStatus,
                  newStatus: notificationData.newStatus
                }
              });
              break;
            case 'resolved':
              await notificationService.notifyTicketResolved(
                ticketWithUser,
                notificationData.changedBy || undefined
              );
              break;
          }
        } catch (error) {
          console.error('Error sending ticket notification:', error);
        }
      });
    }

    return NextResponse.json({
      message: 'Ticket updated successfully',
      ticket: {
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        updatedAt: ticket.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/tickets/[id] - Delete ticket (only if just created and no replies)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Await params before accessing properties (Next.js 15 requirement)
    const { id } = await params;

    const ticket = await TicketModel.findOne({
      _id: id,
      $or: [
        { userId: user.id },
        { userId: user.id.toString() },
        { userEmail: user.email }
      ]
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Only allow deletion if ticket is just created (no replies and status is open)
    if (ticket.replies.length > 0 || ticket.status !== 'open') {
      return NextResponse.json(
        { error: 'Cannot delete ticket with replies or that has been processed' },
        { status: 400 }
      );
    }

    // Check if ticket was created within the last hour
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (ticket.createdAt < hourAgo) {
      return NextResponse.json(
        { error: 'Cannot delete ticket created more than 1 hour ago' },
        { status: 400 }
      );
    }

    await TicketModel.findByIdAndDelete(id);

    return NextResponse.json({
      message: 'Ticket deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to extract plain text from HTML content
const getPlainTextFromHtml = (html: string): string => {
  // Remove HTML tags and decode entities
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .trim();
}; 