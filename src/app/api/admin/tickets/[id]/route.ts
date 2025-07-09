import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import TicketModel from '@/models/Ticket';
import UserModel from '@/models/User';
import UserOnboardingModel from '@/models/UserOnboarding';
import TicketNotificationService from '@/services/TicketNotificationService';

// Interface matching what TicketNotificationService expects
interface PopulatedTicket {
  _id: string;
  ticketNumber: string;
  title: string;
  description: string;
  service: string;
  priority: string;
  status: string;
  userId: string;
  user?: {
    _id: string;
    email: string;
    name?: string;
    role?: string;
    company?: string;
  };
  userEmail: string;
  assignedTo?: {
    _id: string;
    email: string;
    name?: string;
    role?: string;
    company?: string;
  };
  assignedToId?: string;
  replies?: Array<{
    _id?: string;
    content: string;
    authorId: string;
    authorType: 'user' | 'admin';
    isInternal: boolean;
    createdAt: Date;
    author?: {
      _id: string;
      email: string;
      name?: string;
      role?: string;
      company?: string;
    };
  }>;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

interface UserDocument {
  _id: { toString(): string };
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: string;
  company?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    state?: string;
  } | string;
  onboarding?: any; // Keep as any for now since it's complex nested structure
}

interface NotificationData {
  type: 'reply' | 'status_change' | 'resolved' | 'assigned' | 'unassigned' | 'priority_change';
  replyContent?: string;
  isInternal?: boolean;
  author?: UserDocument;
  oldStatus?: string;
  newStatus?: string;
  changedBy?: UserDocument;
  oldAssignedTo?: string;
  newAssignedTo?: UserDocument | null;
  oldPriority?: string;
  newPriority?: string;
}



// GET /api/admin/tickets/[id] - Get specific ticket details for admin
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Await params before accessing properties (Next.js 15 requirement)
    const { id } = await params;

    const ticket = await TicketModel.findById(id).lean();

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Get user details for the ticket owner, assigned user, and all reply authors
    const userIds = [ticket.userId, ...ticket.replies.map(reply => reply.authorId)];
    if (ticket.assignedTo) {
      // Only add to userIds if it's a valid ObjectId, not an email
      if (ticket.assignedTo.match(/^[0-9a-fA-F]{24}$/)) {
        userIds.push(ticket.assignedTo);
      }
    }
    const uniqueUserIds = [...new Set(userIds)];
    
    const users = await UserModel.find({ _id: { $in: uniqueUserIds } })
      .select('_id email name role')
      .lean();

    const userMap = users.reduce((acc, user) => {
      acc[user._id.toString()] = user;
      return acc;
    }, {} as Record<string, UserDocument>);

    // Get onboarding data for the ticket owner
    const ticketOwnerOnboarding = await UserOnboardingModel.findOne({ userId: ticket.userId }).lean();

    // Add user details to replies
    const repliesWithUserInfo = ticket.replies.map(reply => ({
      ...reply,
      author: userMap[reply.authorId] || null
    }));

    // Get assigned user details - handle both ObjectId and email
    let assignedToUser = null;
    if (ticket.assignedTo) {
      if (ticket.assignedTo.match(/^[0-9a-fA-F]{24}$/)) {
        // It's an ObjectId
        assignedToUser = userMap[ticket.assignedTo.toString()];
      } else {
        // It's an email address - look it up directly
        assignedToUser = await UserModel.findOne({ email: ticket.assignedTo })
          .select('_id email name role')
          .lean();
      }
    }

    // Combine user data with onboarding data for the ticket owner
    const ticketOwnerUser = userMap[ticket.userId];
    let enhancedUser = ticketOwnerUser;
    
    if (ticketOwnerUser && ticketOwnerOnboarding) {
      enhancedUser = {
        ...ticketOwnerUser,
        name: ticketOwnerUser.name,
        company: ticketOwnerOnboarding.companyName,
        phone: ticketOwnerOnboarding.phoneNumber,
        address: typeof ticketOwnerOnboarding.address === 'string' 
          ? ticketOwnerOnboarding.address 
          : `${ticketOwnerOnboarding.address?.street || ''}, ${ticketOwnerOnboarding.address?.city || ''}, ${ticketOwnerOnboarding.address?.country || ''}`.trim(),
        onboarding: ticketOwnerOnboarding as any
      };
    }

    return NextResponse.json({
      ...ticket,
      user: enhancedUser || null,
      assignedTo: assignedToUser,
      replies: repliesWithUserInfo
    });

  } catch (error) {
    console.error('Error fetching admin ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/tickets/[id] - Update ticket as admin
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Await params before accessing properties (Next.js 15 requirement)
    const { id } = await params;

    const body = await request.json();
    const { 
      action, 
      content, 
      attachments, 
      status, 
      assignedTo, 
      priority,
      tags,
      internalNotes,
      estimatedResolutionTime,
      isInternal
    } = body;

    // Find the ticket
    const ticket = await TicketModel.findById(id);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

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
          authorType: 'admin',
          createdAt: new Date(),
          isInternal: isInternal || false
        });

        // Update status based on reply type
        if (isInternal) {
          // Internal notes don't change status
        } else if (ticket.status === 'waiting_admin' || ticket.status === 'open') {
          ticket.status = 'waiting_user';
        }

        // Prepare notification data for reply (only for non-internal replies)
        if (!isInternal) {
          notificationData = {
            type: 'reply',
            replyContent: getPlainTextFromHtml(content.trim()),
            isInternal: false,
            author: currentUser
          };
        }
        break;

      case 'update_status':
        if (!status) {
          return NextResponse.json(
            { error: 'Status is required' },
            { status: 400 }
          );
        }

        const oldStatus = ticket.status;
        ticket.status = status;

        // Set resolution/closure timestamps
        if (status === 'resolved' && oldStatus !== 'resolved') {
          ticket.resolvedAt = new Date();
        } else if (status === 'closed' && oldStatus !== 'closed') {
          ticket.closedAt = new Date();
          if (!ticket.resolvedAt) {
            ticket.resolvedAt = new Date();
          }
        } else if (status === 'open' || status === 'in_progress') {
          ticket.resolvedAt = undefined;
          ticket.closedAt = undefined;
        }

        // Add system message for status change (visible to user)
        const statusLabels: Record<string, string> = {
          'open': 'Open',
          'in_progress': 'In Progress',
          'waiting_user': 'Waiting for Customer',
          'waiting_admin': 'Waiting for Support',
          'resolved': 'Resolved',
          'closed': 'Closed'
        };
        
        ticket.replies.push({
          content: `🔄 Support team changed status to "${statusLabels[status] || status}".`,
          attachments: [],
          authorId: user.id,
          authorType: 'admin',
          createdAt: new Date(),
          isInternal: false
        });

        // Prepare notification data
        if (status === 'resolved') {
          notificationData = {
            type: 'resolved',
            oldStatus,
            newStatus: status,
            changedBy: currentUser
          };
        } else {
          notificationData = {
            type: 'status_change',
            oldStatus,
            newStatus: status,
            changedBy: currentUser
          };
        }
        break;

      case 'assign_ticket':
        const oldAssignedTo = ticket.assignedTo;
        
        if (assignedTo) {
          // Verify the assigned user exists and is admin
          // Try to find by ObjectId first, then by email if it's not a valid ObjectId
          let assignedUser;
          
          // Check if assignedTo looks like an ObjectId (24 character hex string)
          if (assignedTo.match(/^[0-9a-fA-F]{24}$/)) {
            assignedUser = await UserModel.findById(assignedTo).lean();
          } else {
            // Assume it's an email address
            assignedUser = await UserModel.findOne({ email: assignedTo }).lean();
          }
          
          if (!assignedUser || assignedUser.role !== 'admin') {
            return NextResponse.json(
              { error: 'Invalid assigned user' },
              { status: 400 }
            );
          }
          
          // Add system message for assignment (visible to user)
          const assignedName = assignedUser.name || assignedUser.email;
          
          ticket.replies.push({
            content: `👤 Ticket assigned to ${assignedName}.`,
            attachments: [],
            authorId: user.id,
            authorType: 'admin',
            createdAt: new Date(),
            isInternal: false
          });

          notificationData = {
            type: 'assigned',
            oldAssignedTo,
            newAssignedTo: assignedUser,
            changedBy: currentUser
          };
        } else {
          // Unassignment
          ticket.replies.push({
            content: `👤 Ticket unassigned.`,
            attachments: [],
            authorId: user.id,
            authorType: 'admin',
            createdAt: new Date(),
            isInternal: false
          });

          notificationData = {
            type: 'unassigned',
            oldAssignedTo,
            newAssignedTo: null,
            changedBy: currentUser
          };
        }
        ticket.assignedTo = assignedTo || undefined;
        break;

      case 'update_priority':
        if (!priority) {
          return NextResponse.json(
            { error: 'Priority is required' },
            { status: 400 }
          );
        }
        
        const priorityLabels: Record<string, string> = {
          'low': 'Low',
          'medium': 'Medium',
          'high': 'High',
          'urgent': 'Urgent'
        };
        
        const oldPriority = ticket.priority;
        ticket.priority = priority;
        
        // Add system message for priority change (visible to user)
        ticket.replies.push({
          content: `⚡ Support team changed priority to "${priorityLabels[priority] || priority}".`,
          attachments: [],
          authorId: user.id,
          authorType: 'admin',
          createdAt: new Date(),
          isInternal: false
        });

        notificationData = {
          type: 'priority_change',
          oldPriority,
          newPriority: priority,
          changedBy: currentUser
        };
        break;

      case 'update_tags':
        ticket.tags = tags || [];
        // No notification for tag updates
        break;

      case 'update_internal_notes':
        ticket.internalNotes = internalNotes || '';
        // No notification for internal notes
        break;

      case 'set_estimated_resolution':
        ticket.estimatedResolutionTime = estimatedResolutionTime 
          ? new Date(estimatedResolutionTime) 
          : undefined;
        // No notification for estimated resolution time
        break;

      case 'bulk_update':
        // Allow multiple updates in one request
        if (status) {
          const oldStatus = ticket.status;
          ticket.status = status;
          
          if (status === 'resolved' && oldStatus !== 'resolved') {
            ticket.resolvedAt = new Date();
          } else if (status === 'closed' && oldStatus !== 'closed') {
            ticket.closedAt = new Date();
            if (!ticket.resolvedAt) {
              ticket.resolvedAt = new Date();
            }
          }

          // Prepare notification for bulk status change
          if (status === 'resolved') {
            notificationData = {
              type: 'resolved',
              oldStatus,
              newStatus: status,
              changedBy: currentUser
            };
          } else {
            notificationData = {
              type: 'status_change',
              oldStatus,
              newStatus: status,
              changedBy: currentUser
            };
          }
        }
        
        if (assignedTo !== undefined) {
          const oldAssignedTo = ticket.assignedTo;
          ticket.assignedTo = assignedTo || undefined;
          
          // If not already notifying for status change, notify for assignment
          if (!notificationData && assignedTo && assignedTo !== oldAssignedTo) {
            // Use the same lookup logic as above
            let assignedUser;
            
            // Check if assignedTo looks like an ObjectId (24 character hex string)
            if (assignedTo.match(/^[0-9a-fA-F]{24}$/)) {
              assignedUser = await UserModel.findById(assignedTo).lean();
            } else {
              // Assume it's an email address
              assignedUser = await UserModel.findOne({ email: assignedTo }).lean();
            }
            
            notificationData = {
              type: 'assigned',
              oldAssignedTo,
              newAssignedTo: assignedUser,
              changedBy: currentUser
            };
          }
        }
        
        if (priority) ticket.priority = priority;
        if (tags !== undefined) ticket.tags = tags;
        if (internalNotes !== undefined) ticket.internalNotes = internalNotes;
        if (estimatedResolutionTime !== undefined) {
          ticket.estimatedResolutionTime = estimatedResolutionTime 
            ? new Date(estimatedResolutionTime) 
            : undefined;
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

          if (!populatedTicket || !userDetails) {
            console.error('Failed to get ticket or user details for notification');
            return;
          }

          // Add assigned user details if present
          let assignedToUser: PopulatedTicket['assignedTo'] = undefined;
          if (populatedTicket.assignedTo) {
            let assignedUser;
            
            // Check if assignedTo looks like an ObjectId (24 character hex string)
            if (populatedTicket.assignedTo.match(/^[0-9a-fA-F]{24}$/)) {
              assignedUser = await UserModel.findById(populatedTicket.assignedTo).lean();
            } else {
              // Assume it's an email address
              assignedUser = await UserModel.findOne({ email: populatedTicket.assignedTo }).lean();
            }
            
            if (assignedUser) {
              assignedToUser = {
                _id: assignedUser._id.toString(),
                email: assignedUser.email,
                name: assignedUser.name,
                role: assignedUser.role
              };
            }
          }

          // Construct properly typed ticket object for notifications
          const ticketWithUser: PopulatedTicket = {
            _id: populatedTicket._id.toString(),
            ticketNumber: populatedTicket.ticketNumber || '',
            title: populatedTicket.title,
            description: populatedTicket.description,
            service: populatedTicket.service,
            priority: populatedTicket.priority,
            status: populatedTicket.status,
            userId: populatedTicket.userId.toString(),
            userEmail: populatedTicket.userEmail,
            user: {
              _id: userDetails._id.toString(),
              email: userDetails.email,
              name: userDetails.name,
              role: userDetails.role,
              company: userOnboarding?.companyName
            },
            assignedTo: assignedToUser,
            replies: populatedTicket.replies?.map(reply => ({
              _id: (reply as unknown as { _id?: { toString(): string } })._id?.toString(),
              content: reply.content,
              authorId: reply.authorId,
              authorType: reply.authorType as 'user' | 'admin',
              isInternal: reply.isInternal || false,
              createdAt: reply.createdAt
            })) || [],
            createdAt: populatedTicket.createdAt,
            updatedAt: populatedTicket.updatedAt,
            resolvedAt: populatedTicket.resolvedAt
          };

          const notificationService = TicketNotificationService.getInstance();

          switch (notificationData.type) {
            case 'reply':
              await notificationService.notifyTicketReplied(
                ticketWithUser,
                notificationData.replyContent || '',
                notificationData.isInternal || false,
                notificationData.author
              );
              break;
            case 'status_change':
              await notificationService.notifyTicketUpdated(ticketWithUser, {
                action: 'status_changed',
                changedBy: notificationData.changedBy,
                changes: {
                  oldStatus: notificationData.oldStatus,
                  newStatus: notificationData.newStatus
                }
              });
              break;
            case 'resolved':
              await notificationService.notifyTicketResolved(
                ticketWithUser,
                notificationData.changedBy
              );
              break;
            case 'assigned':
              await notificationService.notifyTicketAssigned(
                ticketWithUser,
                notificationData.changedBy
              );
              break;
            case 'unassigned':
              await notificationService.notifyTicketUpdated(ticketWithUser, {
                action: 'unassigned',
                changedBy: notificationData.changedBy,
                changes: {
                  oldAssignedTo: notificationData.oldAssignedTo,
                  newAssignedTo: undefined
                }
              });
              break;
            case 'priority_change':
              await notificationService.notifyTicketUpdated(ticketWithUser, {
                action: 'priority_changed',
                changedBy: notificationData.changedBy,
                changes: {
                  oldPriority: notificationData.oldPriority,
                  newPriority: notificationData.newPriority
                }
              });
              break;
          }
        } catch (error) {
          console.error('Error sending admin ticket notification:', error);
        }
      });
    }

    // After saving, get the updated ticket with populated user details
    const updatedTicket = await TicketModel.findById(ticket._id).lean();
    
    if (!updatedTicket) {
      return NextResponse.json({ error: 'Failed to retrieve updated ticket' }, { status: 500 });
    }
    
    // Get user details for response
    const userIds = [updatedTicket.userId];
    if (updatedTicket.assignedTo) {
      // Only add to userIds if it's a valid ObjectId, not an email
      if (updatedTicket.assignedTo.match(/^[0-9a-fA-F]{24}$/)) {
        userIds.push(updatedTicket.assignedTo);
      }
    }
    
    const users = await UserModel.find({ _id: { $in: userIds } })
      .select('_id email firstName lastName role')
      .lean();

    const userMap = users.reduce((acc, user) => {
      acc[user._id.toString()] = user;
      return acc;
    }, {} as Record<string, UserDocument>);

    // Get assigned user details - handle both ObjectId and email
    let assignedToUser = null;
    if (updatedTicket.assignedTo) {
      if (updatedTicket.assignedTo.match(/^[0-9a-fA-F]{24}$/)) {
        // It's an ObjectId
        assignedToUser = userMap[updatedTicket.assignedTo.toString()];
      } else {
        // It's an email address - look it up directly
        assignedToUser = await UserModel.findOne({ email: updatedTicket.assignedTo })
          .select('_id email name role')
          .lean();
      }
    }

    return NextResponse.json({
      message: 'Ticket updated successfully',
      ticket: {
        ...updatedTicket,
        _id: updatedTicket._id.toString(),
        user: userMap[updatedTicket.userId],
        assignedTo: assignedToUser,
      }
    });

  } catch (error) {
    console.error('Error updating admin ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/tickets/[id] - Delete ticket (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Await params before accessing properties (Next.js 15 requirement)
    const { id } = await params;

    // Find the ticket (admins can delete any ticket)
    const ticket = await TicketModel.findById(id);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Get ticket details for logging before deletion
    const ticketDetails = {
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      userId: ticket.userId,
      userEmail: ticket.userEmail,
      status: ticket.status,
      priority: ticket.priority,
      service: ticket.service,
      repliesCount: ticket.replies.length,
      attachmentsCount: ticket.attachments?.length || 0,
      replyAttachmentsCount: ticket.replies.reduce((acc, reply) => acc + (reply.attachments?.length || 0), 0),
      createdAt: ticket.createdAt,
      assignedTo: ticket.assignedTo
    };

    // Log admin deletion action (for audit trail)
    console.log(`Admin deletion: User ${currentUser.email} (${currentUser._id}) deleted ticket ${ticket.ticketNumber} (${ticket._id})`);
    console.log('Deleted ticket details:', ticketDetails);

    // TODO: Enhanced file cleanup for production
    // Collect all attachment file paths for cleanup
    const attachmentFiles = [
      ...(ticket.attachments || []).map(att => att.filename),
      ...ticket.replies.flatMap(reply => 
        (reply.attachments || []).map(att => att.filename)
      )
    ].filter(Boolean);
    
    if (attachmentFiles.length > 0) {
      console.log(`Ticket had ${attachmentFiles.length} attachment files that may need cleanup:`, attachmentFiles);
      // TODO: Implement actual file deletion from storage (S3, local storage, etc.)
    }

    // Delete the ticket and all associated data
    await TicketModel.findByIdAndDelete(id);

    // TODO: Optional - Send notification to customer about ticket deletion
    // This could be implemented if you want to notify customers when their tickets are deleted

    return NextResponse.json({
      message: 'Ticket deleted successfully',
      deletedTicket: {
        id: (ticket._id as { toString(): string }).toString(),
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        deletedBy: {
          id: currentUser._id.toString(),
          email: currentUser.email,
          name: currentUser.name || 'Admin'
        },
        deletedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error deleting admin ticket:', error);
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