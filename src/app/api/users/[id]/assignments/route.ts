import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import RateDeckAssignment from '@/models/RateDeckAssignment';
import NumberRateDeck from '@/models/NumberRateDeck';
import SmsRateDeck from '@/models/SmsRateDeck';
import mongoose from 'mongoose';

// GET - List rate deck assignments for a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify the user is authenticated and is an admin
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: userId } = await params;
    
    // Connect to the database
    await connectToDatabase();

    // Get all active assignments for this user
    const assignments = await RateDeckAssignment
      .find({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      })
      .sort({ assignedAt: -1 })
      .lean();

    // Fetch rate deck details for each assignment
    const assignmentDetails = await Promise.all(
      assignments.map(async (assignment) => {
        let rateDeck = null;
        
        if (assignment.rateDeckType === 'number') {
          rateDeck = await NumberRateDeck.findById(assignment.rateDeckId).select('name description').lean();
        } else if (assignment.rateDeckType === 'sms') {
          rateDeck = await SmsRateDeck.findById(assignment.rateDeckId).select('name description').lean();
        }
        
        return {
          id: assignment._id.toString(),
          rateDeckId: assignment.rateDeckId.toString(),
          rateDeckType: assignment.rateDeckType,
          rateDeckName: rateDeck?.name || 'Unknown Rate Deck',
          rateDeckDescription: rateDeck?.description || '',
          assignedBy: assignment.assignedBy,
          assignedAt: assignment.assignedAt.toISOString(),
        };
      })
    );
    
    return NextResponse.json({
      assignments: assignmentDetails,
      total: assignmentDetails.length,
    });
  } catch (error) {
    console.error('Error fetching user assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user assignments' },
      { status: 500 }
    );
  }
} 