import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import RateDeckAssignment from '@/models/RateDeckAssignment';
import SmsRateDeck from '@/models/SmsRateDeck';
import mongoose from 'mongoose';

// DELETE - Remove a user assignment from an SMS rate deck
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
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

    const { id: rateDeckId, userId } = await params;
    
    // Connect to the database
    await connectToDatabase();

    // Find and deactivate the assignment
    const assignment = await RateDeckAssignment.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        rateDeckId: new mongoose.Types.ObjectId(rateDeckId),
        rateDeckType: 'sms',
        isActive: true,
      },
      {
        $set: {
          isActive: false,
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found or already removed' },
        { status: 404 }
      );
    }

    // Update the rate deck's assigned users count
    const totalAssigned = await RateDeckAssignment.countDocuments({
      rateDeckId: new mongoose.Types.ObjectId(rateDeckId),
      rateDeckType: 'sms',
      isActive: true,
    });

    await SmsRateDeck.findByIdAndUpdate(
      rateDeckId,
      { 
        $set: { 
          assignedUsers: totalAssigned,
          updatedAt: new Date(),
        }
      }
    );
    
    return NextResponse.json({ 
      success: true,
      message: 'User assignment removed successfully' 
    });
  } catch (error) {
    console.error('Error removing user assignment:', error);
    return NextResponse.json(
      { error: 'Failed to remove user assignment' },
      { status: 500 }
    );
  }
} 