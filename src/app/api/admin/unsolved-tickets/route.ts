import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import TicketModel from '@/models/Ticket';
import User from '@/models/User';
import UserOnboardingModel from '@/models/UserOnboarding';

interface UserData {
  _id: { toString(): string };
  name: string;
  email: string;
}

interface TicketData {
  _id: { toString(): string };
  ticketNumber?: string;
  title: string;
  service?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  assignedTo?: string;
  replies?: Array<{ createdAt: Date }>;
}

interface UnsolvedTicket {
  id: string;
  ticketNumber: string;
  title: string;
  service: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: string; // Can be any status from the database
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    companyName?: string; // Company name from onboarding
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  daysOpen: number;
  lastReplyAt?: Date;
  replyCount: number;
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    if (limit > 50) {
      return NextResponse.json(
        { error: 'Limit cannot exceed 50' }, 
        { status: 400 }
      );
    }

    // Fetch unsolved tickets (excluding 'closed' and 'resolved' statuses)
    const tickets = await TicketModel.find({
      status: { $nin: ['closed', 'resolved'] }
    })
    .sort({ createdAt: -1 }) // Latest first
    .limit(limit)
    .lean();

    console.log(`🎫 Found ${tickets.length} unsolved tickets`);
    if (tickets.length === 0) {
      console.log('❗ No unsolved tickets found in database');
      return NextResponse.json({
        tickets: [],
        stats: {
          total: 0,
          byPriority: { urgent: 0, high: 0, medium: 0, low: 0 },
          byStatus: { open: 0, in_progress: 0, waiting_user: 0, waiting_admin: 0 },
          oldestTicket: 0,
          averageDaysOpen: 0,
        },
        limit,
        timestamp: new Date().toISOString()
      });
    }

    // Get unique user IDs from tickets
    const userIds = [...new Set(tickets.map(ticket => ticket.userId).filter(Boolean))];
    
    console.log('🎫 Raw tickets sample:', tickets.slice(0, 2).map(t => ({ 
      _id: t._id, 
      userId: t.userId, 
      userIdType: typeof t.userId,
      title: t.title 
    })));
    
    // Manually fetch user data since userId is stored as string, not ObjectId reference
    const users = await User.find({
      _id: { $in: userIds }
    }).lean();
    
    console.log('👥 Raw users data:', users.map(u => ({ 
      _id: u._id, 
      _idType: typeof u._id,
      _idString: u._id.toString(),
      name: u.name, 
      email: u.email 
    })));
    
    // Create a map of userId to user data (using object like admin tickets route)
    const userMap = users.reduce((acc, user) => {
      const userId = user._id.toString();
      acc[userId] = user;
      console.log('🗂️ Adding to userMap:', userId, '→', { name: user.name, email: user.email });
      return acc;
    }, {} as Record<string, UserData>);
    
    console.log('📋 Total users fetched:', users.length);
    console.log('🗂️ UserMap keys:', Object.keys(userMap));
    console.log('🗂️ UserMap contents:', userMap);
    console.log('🎫 Ticket userIds:', userIds);

    // Fetch onboarding data for all users
    const onboardingData = await UserOnboardingModel.find({
      userId: { $in: userIds }
    }).lean();

    // Create a map of userId to company name
    const onboardingMap = onboardingData.reduce((acc, onboarding) => {
      acc[onboarding.userId] = onboarding.companyName;
      return acc;
    }, {} as Record<string, string>);

    // Transform tickets data
    const unsolvedTickets: UnsolvedTicket[] = (tickets as TicketData[]).map((ticket) => {
      const now = new Date();
      const createdAt = new Date(ticket.createdAt);
      const daysOpen = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      // Count replies (assuming replies are stored in a replies array)
      const replyCount = ticket.replies?.length || 0;
      
      // Get last reply date
      const lastReplyAt = ticket.replies && ticket.replies.length > 0 
        ? new Date(ticket.replies[ticket.replies.length - 1].createdAt)
        : undefined;

      // Get user data from userMap
      const userData = userMap[ticket.userId];
      
      // Better debugging
      console.log(`🔍 Processing ticket ${ticket.ticketNumber}:`);
      console.log(`   - Ticket userId: "${ticket.userId}" (${typeof ticket.userId})`);
      console.log(`   - UserMap has key: ${userMap.hasOwnProperty(ticket.userId)}`);
      console.log(`   - UserData found:`, userData ? { name: userData.name, email: userData.email } : 'null');
      
      const userName = userData?.name || `Unknown User (${ticket.userId})`;
      const userEmail = userData?.email || '';

      return {
        id: ticket._id.toString(),
        ticketNumber: ticket.ticketNumber || `TKT-${ticket._id.toString().slice(-6)}`,
        title: ticket.title,
        service: ticket.service || 'General',
        priority: ticket.priority || 'medium',
        status: ticket.status,
        createdAt: new Date(ticket.createdAt),
        updatedAt: new Date(ticket.updatedAt),
        user: {
          id: ticket.userId || '',
          name: userName,
          email: userEmail,
          companyName: onboardingMap[ticket.userId] || undefined
        },
        assignedTo: ticket.assignedTo ? {
          id: ticket.assignedTo,
          name: 'Admin User', // We'd need to fetch admin users separately if needed
          email: '',
        } : undefined,
        daysOpen,
        lastReplyAt,
        replyCount,
      };
    });

    // Calculate statistics
    const stats = {
      total: unsolvedTickets.length,
      byPriority: {
        urgent: unsolvedTickets.filter(t => t.priority === 'urgent').length,
        high: unsolvedTickets.filter(t => t.priority === 'high').length,
        medium: unsolvedTickets.filter(t => t.priority === 'medium').length,
        low: unsolvedTickets.filter(t => t.priority === 'low').length,
      },
      byStatus: {
        open: unsolvedTickets.filter(t => t.status === 'open').length,
        in_progress: unsolvedTickets.filter(t => t.status === 'in_progress').length,
        waiting_user: unsolvedTickets.filter(t => t.status === 'waiting_user').length,
        waiting_admin: unsolvedTickets.filter(t => t.status === 'waiting_admin').length,
      },
      oldestTicket: unsolvedTickets.length > 0 
        ? Math.max(...unsolvedTickets.map(t => t.daysOpen))
        : 0,
      averageDaysOpen: unsolvedTickets.length > 0
        ? Math.round(unsolvedTickets.reduce((sum, t) => sum + t.daysOpen, 0) / unsolvedTickets.length)
        : 0,
    };

    const responseData = {
      tickets: unsolvedTickets,
      stats,
      limit,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error fetching unsolved tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unsolved tickets' },
      { status: 500 }
    );
  }
} 