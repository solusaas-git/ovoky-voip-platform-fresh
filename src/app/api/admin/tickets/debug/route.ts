import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import TicketModel from '@/models/Ticket';
import UserModel from '@/models/User';
import UserOnboardingModel from '@/models/UserOnboarding';

// Debug endpoint to see what data we're getting
export async function GET() {
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

    // Get first ticket only for debugging
    const tickets = await TicketModel.find({}).limit(1).lean();
    
    if (tickets.length === 0) {
      return NextResponse.json({ message: 'No tickets found' });
    }

    const ticket = tickets[0];

    // Get user details
    const userDetails = await UserModel.findById(ticket.userId)
      .select('_id email name')
      .lean();

    // Get onboarding details
    const onboardingDetails = await UserOnboardingModel.findOne({ userId: ticket.userId })
      .select('userId companyName')
      .lean();

    // Get all onboarding records to see what's available
    const allOnboardings = await UserOnboardingModel.find({})
      .select('userId companyName')
      .lean();

    return NextResponse.json({
      ticket: {
        _id: ticket._id,
        userId: ticket.userId,
        title: ticket.title,
        userEmail: ticket.userEmail
      },
      userDetails,
      onboardingDetails,
      allOnboardings: allOnboardings.slice(0, 5), // First 5 onboarding records
      totalOnboardings: allOnboardings.length
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 