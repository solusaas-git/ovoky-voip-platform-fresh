import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import TicketModel from '@/models/Ticket';
import UserModel from '@/models/User';

interface TicketWithPopulatedFields {
  _id: { toString(): string };
  user?: {
    _id: { toString(): string };
    firstName?: string;
    lastName?: string;
    email: string;
  };
  assignedTo?: {
    _id: { toString(): string };
    firstName?: string;
    lastName?: string;
    email: string;
  };
  ticketNumber?: string;
  title: string;
  description: string;
  service: string;
  priority: string;
  status: string;
  userId: string;
  userEmail: string;
  assignedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  replies?: Array<{
    content: string;
    authorType: 'user' | 'admin';
    authorId: string;
    isInternal: boolean;
    createdAt: Date;
  }>;
}

// PUT /api/admin/tickets/bulk - Bulk update tickets
export async function PUT(request: NextRequest) {
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

    const {
      ticketIds,
      action,
      assignTo,
      status,
      priority,
      internalNote
    } = await request.json();

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return NextResponse.json({ error: 'No ticket IDs provided' }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const updatedTickets = [];

    switch (action) {
      case 'assign':
        if (!assignTo) {
          return NextResponse.json({ error: 'Assign to user is required' }, { status: 400 });
        }

        // Verify assignTo user exists and is admin
        const assignToUser = await UserModel.findById(assignTo).lean();
        if (!assignToUser || assignToUser.role !== 'admin') {
          return NextResponse.json({ error: 'Invalid admin user for assignment' }, { status: 400 });
        }

        const assignUpdate: Record<string, any> = {
          assignedTo: assignTo,
          assignedAt: new Date(),
          updatedAt: new Date(),
        };

        // Add internal note if provided
        if (internalNote?.trim()) {
          assignUpdate.$push = {
            replies: {
              content: internalNote,
              authorType: 'admin',
              authorId: user.id,
              isInternal: true,
              createdAt: new Date(),
            }
          };
        }

        await TicketModel.updateMany(
          { _id: { $in: ticketIds } },
          assignUpdate
        );

        // Fetch updated tickets
        const assignedTickets = await TicketModel.find({ _id: { $in: ticketIds } })
          .populate('user', 'firstName lastName email')
          .populate('assignedTo', 'firstName lastName email')
          .lean();

        updatedTickets.push(...assignedTickets);
        break;

      case 'update_status':
        if (!status) {
          return NextResponse.json({ error: 'Status is required' }, { status: 400 });
        }

        const statusLabels: Record<string, string> = {
          'open': 'Open',
          'in_progress': 'In Progress',
          'waiting_user': 'Waiting for Customer',
          'waiting_admin': 'Waiting for Support',
          'resolved': 'Resolved',
          'closed': 'Closed'
        };

        const statusUpdate = {
          status,
          updatedAt: new Date(),
          $push: {
            replies: {
              content: `🔄 Support team changed status to "${statusLabels[status] || status}".`,
              authorType: 'admin',
              authorId: user.id,
              isInternal: false,
              createdAt: new Date(),
            }
          }
        };

        // Add additional internal note if provided
        if (internalNote?.trim()) {
          // For bulk operations, we'll add both the visible system message above
          // and an internal note if admin provided additional context
          await TicketModel.updateMany(
            { _id: { $in: ticketIds } },
            {
              ...statusUpdate,
              $push: {
                replies: {
                  $each: [
                    {
                      content: `🔄 Support team changed status to "${statusLabels[status] || status}".`,
                      authorType: 'admin',
                      authorId: user.id,
                      isInternal: false,
                      createdAt: new Date(),
                    },
                    {
                      content: `Status changed to ${status}: ${internalNote}`,
                      authorType: 'admin',
                      authorId: user.id,
                      isInternal: true,
                      createdAt: new Date(),
                    }
                  ]
                }
              }
            }
          );
        } else {
          await TicketModel.updateMany(
            { _id: { $in: ticketIds } },
            statusUpdate
          );
        }

        // Fetch updated tickets
        const statusUpdatedTickets = await TicketModel.find({ _id: { $in: ticketIds } })
          .populate('user', 'firstName lastName email')
          .populate('assignedTo', 'firstName lastName email')
          .lean();

        updatedTickets.push(...statusUpdatedTickets);
        break;

      case 'update_priority':
        if (!priority) {
          return NextResponse.json({ error: 'Priority is required' }, { status: 400 });
        }

        const priorityLabels: Record<string, string> = {
          'low': 'Low',
          'medium': 'Medium',
          'high': 'High',
          'urgent': 'Urgent'
        };

        const priorityUpdate = {
          priority,
          updatedAt: new Date(),
          $push: {
            replies: {
              content: `⚡ Support team changed priority to "${priorityLabels[priority] || priority}".`,
              authorType: 'admin',
              authorId: user.id,
              isInternal: false,
              createdAt: new Date(),
            }
          }
        };

        // Add additional internal note if provided
        if (internalNote?.trim()) {
          await TicketModel.updateMany(
            { _id: { $in: ticketIds } },
            {
              ...priorityUpdate,
              $push: {
                replies: {
                  $each: [
                    {
                      content: `⚡ Support team changed priority to "${priorityLabels[priority] || priority}".`,
                      authorType: 'admin',
                      authorId: user.id,
                      isInternal: false,
                      createdAt: new Date(),
                    },
                    {
                      content: `Priority changed to ${priority}: ${internalNote}`,
                      authorType: 'admin',
                      authorId: user.id,
                      isInternal: true,
                      createdAt: new Date(),
                    }
                  ]
                }
              }
            }
          );
        } else {
          await TicketModel.updateMany(
            { _id: { $in: ticketIds } },
            priorityUpdate
          );
        }

        // Fetch updated tickets
        const priorityUpdatedTickets = await TicketModel.find({ _id: { $in: ticketIds } })
          .populate('user', 'firstName lastName email')
          .populate('assignedTo', 'firstName lastName email')
          .lean();

        updatedTickets.push(...priorityUpdatedTickets);
        break;

      case 'delete':
        await TicketModel.deleteMany({ _id: { $in: ticketIds } });
        
        return NextResponse.json({
          message: `Successfully deleted ${ticketIds.length} ticket${ticketIds.length === 1 ? '' : 's'}`,
          deletedCount: ticketIds.length
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      message: `Successfully updated ${ticketIds.length} ticket${ticketIds.length === 1 ? '' : 's'}`,
      updatedTickets: (updatedTickets as TicketWithPopulatedFields[]).map((ticket) => ({
        ...ticket,
        _id: ticket._id.toString(),
        user: ticket.user ? {
          ...ticket.user,
          _id: ticket.user._id.toString()
        } : null,
        assignedTo: ticket.assignedTo ? {
          ...ticket.assignedTo,
          _id: ticket.assignedTo._id.toString()
        } : null,
      }))
    });

  } catch (error) {
    console.error('Error in bulk ticket update:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 