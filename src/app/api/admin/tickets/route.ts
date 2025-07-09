import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import TicketModel from '@/models/Ticket';
import UserModel from '@/models/User';
import UserOnboardingModel from '@/models/UserOnboarding';

// Interfaces for type safety
interface TicketFilter {
  [key: string]: unknown;
  status?: string;
  service?: string;
  priority?: string;
  assignedTo?: string;
  userId?: string;
  $or?: Array<{
    title?: { $regex: string; $options: string };
    ticketNumber?: { $regex: string; $options: string };
    description?: { $regex: string; $options: string };
    userEmail?: { $regex: string; $options: string };
  }>;
}

interface SortQuery {
  [key: string]: 1 | -1;
}

interface UserData {
  _id: { toString(): string };
  email: string;
  name?: string;
  role?: string;
}

interface OnboardingData {
  userId: string;
  companyName?: string;
}

// GET /api/admin/tickets - List all tickets for admin
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const service = searchParams.get('service');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo');
    const userId = searchParams.get('userId');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter query
    const filter: TicketFilter = {};
    
    if (status) filter.status = status;
    if (service) filter.service = service;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (userId) filter.userId = userId;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { ticketNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const sort: SortQuery = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [tickets, total] = await Promise.all([
      TicketModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      TicketModel.countDocuments(filter)
    ]);

    // Get user details for tickets
    const userIds = [...new Set(tickets.map(ticket => ticket.userId))];
    
    // Separate ObjectIds and emails for assignedTo
    const assignedToValues = [...new Set(
      tickets
        .map(ticket => ticket.assignedTo)
        .filter(Boolean)
    )];
    
    const assignedUserIds = assignedToValues.filter(id => 
      typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)
    );
    
    const assignedUserEmails = assignedToValues.filter(id => 
      typeof id === 'string' && id.includes('@')
    );
    
    const [users, assignedUsersById, assignedUsersByEmail, userOnboardings] = await Promise.all([
      UserModel.find({ _id: { $in: userIds } })
        .select('_id email name')
        .lean(),
      assignedUserIds.length > 0 ? UserModel.find({ _id: { $in: assignedUserIds } })
        .select('_id email name role')
        .lean() : Promise.resolve([]),
      assignedUserEmails.length > 0 ? UserModel.find({ email: { $in: assignedUserEmails } })
        .select('_id email name role')
        .lean() : Promise.resolve([]),
      UserOnboardingModel.find({ userId: { $in: userIds.map(id => id.toString()) } })
        .select('userId companyName')
        .lean()
    ]);

    const userMap = users.reduce((acc, user) => {
      acc[user._id.toString()] = user;
      return acc;
    }, {} as Record<string, UserData>);

    // Create maps for both ObjectId and email-based assignments
    const assignedUserMap = [...assignedUsersById, ...assignedUsersByEmail].reduce((acc, user) => {
      acc[user._id.toString()] = user; // Map by ObjectId
      acc[user.email] = user; // Map by email
      return acc;
    }, {} as Record<string, UserData>);

    const onboardingMap = userOnboardings.reduce((acc, onboarding) => {
      acc[onboarding.userId] = onboarding;
      return acc;
    }, {} as Record<string, OnboardingData>);

    // Add user details to tickets
    const ticketsWithUserInfo = tickets.map(ticket => ({
      ...ticket,
      user: userMap[ticket.userId] || null,
      userOnboarding: onboardingMap[ticket.userId] || null,
      assignedTo: ticket.assignedTo ? assignedUserMap[ticket.assignedTo] || ticket.assignedTo : null,
      replyCount: ticket.replies.length,
      lastReplyAt: ticket.replies.length > 0 
        ? ticket.replies[ticket.replies.length - 1].createdAt 
        : null
    }));

    const totalPages = Math.ceil(total / limit);

    // Get statistics
    const stats = await TicketModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusStats = stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      tickets: ticketsWithUserInfo,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages
      },
      stats: {
        total,
        ...statusStats
      }
    });

  } catch (error) {
    console.error('Error fetching admin tickets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 