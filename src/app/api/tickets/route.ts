import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import TicketModel from '@/models/Ticket';
import UserModel from '@/models/User';
import UserOnboardingModel from '@/models/UserOnboarding';
import TicketNotificationService from '@/services/TicketNotificationService';
import { Types } from 'mongoose';

interface TicketFilter {
  userId: string;
  status?: string;
  service?: string;
  priority?: string;
  $or?: Array<{
    title?: { $regex: string; $options: string };
    ticketNumber?: { $regex: string; $options: string };
    description?: { $regex: string; $options: string };
  }>;
}

interface TicketStatResult {
  _id: string;
  count: number;
}

// GET /api/tickets - List tickets for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const service = searchParams.get('service');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');

    // Build filter query
    const filter: TicketFilter = { userId: user.id };
    
    if (status) filter.status = status;
    if (service) filter.service = service;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { ticketNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [tickets, total, stats] = await Promise.all([
      TicketModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TicketModel.countDocuments(filter),
      // Calculate stats for the current user
      TicketModel.aggregate([
        { $match: { userId: user.id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Process stats into the expected format
    const statsObject = {
      total: 0,
      open: 0,
      in_progress: 0,
      waiting_admin: 0,
      resolved: 0,
      closed: 0
    };

    stats.forEach((stat: TicketStatResult) => {
      if (stat._id in statsObject) {
        statsObject[stat._id as keyof typeof statsObject] = stat.count;
        statsObject.total += stat.count;
      }
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages
      },
      stats: statsObject
    });

  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tickets - Create a new ticket
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { 
      title, 
      description, 
      service, 
      priority,
      country,
      outboundCallData,
      assignedNumbers,
      selectedPhoneNumbers,
      attachments 
    } = body;

    // Validation
    if (!title || !description || !service || !priority) {
      return NextResponse.json(
        { error: 'Title, description, service, and priority are required' },
        { status: 400 }
      );
    }

    // Get user details for the ticket
    const currentUser = await UserModel.findById(user.id).lean();
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate ticket number
    const ticketCount = await TicketModel.countDocuments({});
    const ticketNumber = `TKT-${(ticketCount + 1).toString().padStart(6, '0')}`;

    // Create ticket
    const ticket = new TicketModel({
      ticketNumber,
      title: title.trim(),
      description: description.trim(),
      service,
      priority,
      userId: user.id,
      userEmail: currentUser.email,
      status: 'open',
      attachments: attachments || [],
      replies: [],
      country,
      outboundCallData,
      assignedNumbers,
      selectedPhoneNumbers,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await ticket.save();

    // Get the created ticket with populated user data for notifications
    const populatedTicket = await TicketModel.findById(ticket._id).lean();
    
    // Get user details and onboarding data
    const userDetails = await UserModel.findById(user.id).lean();
    const userOnboarding = await UserOnboardingModel.findOne({ userId: user.id }).lean();

    // Add user information to ticket for notifications
    const ticketWithUser = {
      ...populatedTicket,
      _id: populatedTicket?._id?.toString(),
      user: userDetails ? {
        _id: userDetails._id.toString(),
        email: userDetails.email,
        name: userDetails.name,
        company: userOnboarding?.companyName
      } : null
    } as any;

    // Send notification asynchronously (don't wait for it to complete)
    process.nextTick(async () => {
      try {
        const notificationService = TicketNotificationService.getInstance();
        await notificationService.notifyTicketCreated(ticketWithUser);
      } catch (error) {
        console.error('Error sending ticket creation notification:', error);
      }
    });

    return NextResponse.json({
      message: 'Ticket created successfully',
      ticket: {
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        service: ticket.service,
        createdAt: ticket.createdAt
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 