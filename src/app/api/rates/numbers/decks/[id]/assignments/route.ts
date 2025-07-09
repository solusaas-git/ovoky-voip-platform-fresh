import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import RateDeckAssignment from '@/models/RateDeckAssignment';
import User from '@/models/User';
import NumberRateDeck from '@/models/NumberRateDeck';
import mongoose from 'mongoose';

// GET - List users assigned to a number rate deck
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

    const { id: rateDeckId } = await params;
    
    // Connect to the database
    await connectToDatabase();

    // Verify the rate deck exists
    const rateDeck = await NumberRateDeck.findById(rateDeckId);
    if (!rateDeck) {
      return NextResponse.json({ error: 'Rate deck not found' }, { status: 404 });
    }

    // Get all assignments for this rate deck
    const assignments = await RateDeckAssignment
      .find({
        rateDeckId: new mongoose.Types.ObjectId(rateDeckId),
        rateDeckType: 'number',
        isActive: true,
      })
      .populate('userId', 'name email role sippyAccountId')
      .sort({ assignedAt: -1 })
      .lean();

    // Clean up orphaned assignments (assignments with deleted users) in the background
    const orphanedAssignments = assignments.filter(assignment => assignment.userId === null);
    if (orphanedAssignments.length > 0) {
      // Run cleanup in background without blocking the response
      setImmediate(async () => {
        try {
          const orphanedIds = orphanedAssignments.map(a => a._id);
          await RateDeckAssignment.deleteMany({ _id: { $in: orphanedIds } });
          console.log(`Cleaned up ${orphanedIds.length} orphaned number rate deck assignments for rate deck ${rateDeckId}`);
        } catch (cleanupError) {
          console.error('Error cleaning up orphaned assignments:', cleanupError);
        }
      });
    }

    // Transform the response, filtering out assignments with deleted users
    const assignedUsers = assignments
      .filter(assignment => assignment.userId !== null) // Filter out assignments with deleted users
      .map(assignment => {
        const user = assignment.userId as unknown as { _id: { toString(): string }; name: string; email: string; role: string; sippyAccountId?: number };
        return {
          id: assignment._id.toString(),
          userId: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          sippyAccountId: user.sippyAccountId,
          assignedBy: assignment.assignedBy,
          assignedAt: assignment.assignedAt.toISOString(),
        };
      });
    
    return NextResponse.json({
      rateDeck: {
        id: (rateDeck._id as { toString(): string }).toString(),
        name: rateDeck.name,
        description: rateDeck.description,
      },
      assignedUsers,
      total: assignedUsers.length,
    });
  } catch (error) {
    console.error('Error fetching rate deck assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rate deck assignments' },
      { status: 500 }
    );
  }
}

// POST - Assign users to a number rate deck
export async function POST(
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

    const { id: rateDeckId } = await params;
    const body = await request.json();
    
    const { userIds } = body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'User IDs array is required' },
        { status: 400 }
      );
    }

    // Connect to the database
    await connectToDatabase();

    // Verify the rate deck exists
    const rateDeck = await NumberRateDeck.findById(rateDeckId);
    if (!rateDeck) {
      return NextResponse.json({ error: 'Rate deck not found' }, { status: 404 });
    }

    // Verify all users exist
    const users = await User.find({ _id: { $in: userIds.map(id => new mongoose.Types.ObjectId(id)) } });
    if (users.length !== userIds.length) {
      return NextResponse.json({ error: 'One or more users not found' }, { status: 404 });
    }

    const results: {
      assigned: Array<{ userId: string; name?: string; email?: string }>;
      alreadyAssigned: Array<{ userId: string; name?: string; email?: string }>;
      errors: Array<{ userId: string; name?: string; email?: string; error: string }>;
    } = {
      assigned: [],
      alreadyAssigned: [],
      errors: [],
    };

    // Process each user assignment
    for (const userId of userIds) {
      try {
        // Check if user is already assigned to this rate deck
        const existingAssignment = await RateDeckAssignment.findOne({
          userId: new mongoose.Types.ObjectId(userId),
          rateDeckId: new mongoose.Types.ObjectId(rateDeckId),
          rateDeckType: 'number',
        });

        if (existingAssignment) {
          if (existingAssignment.isActive) {
            const userData = users.find(u => u._id.toString() === userId);
            results.alreadyAssigned.push({
              userId,
              name: userData?.name,
              email: userData?.email,
            });
          } else {
            // Check if user is assigned to any other number rate deck
            const otherNumberAssignment = await RateDeckAssignment.findOne({
              userId: new mongoose.Types.ObjectId(userId),
              rateDeckType: 'number',
              isActive: true,
              rateDeckId: { $ne: new mongoose.Types.ObjectId(rateDeckId) },
            }).populate('rateDeckId', 'name');

            if (otherNumberAssignment) {
              const userData = users.find(u => u._id.toString() === userId);
              results.errors.push({
                userId,
                name: userData?.name,
                email: userData?.email,
                error: `User is already assigned to another number rate deck: ${(otherNumberAssignment.rateDeckId as unknown as { name: string }).name}`,
              });
            } else {
              // Reactivate the assignment
              existingAssignment.isActive = true;
              existingAssignment.assignedBy = user.email;
              existingAssignment.assignedAt = new Date();
              await existingAssignment.save();

              const userData = users.find(u => u._id.toString() === userId);
              results.assigned.push({
                userId,
                name: userData?.name,
                email: userData?.email,
              });
            }
          }
        } else {
          // Check if user is already assigned to any other number rate deck
          const otherNumberAssignment = await RateDeckAssignment.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            rateDeckType: 'number',
            isActive: true,
          }).populate('rateDeckId', 'name');

          if (otherNumberAssignment) {
            const userData = users.find(u => u._id.toString() === userId);
            results.errors.push({
              userId,
              name: userData?.name,
              email: userData?.email,
              error: `User is already assigned to another number rate deck: ${(otherNumberAssignment.rateDeckId as unknown as { name: string }).name}`,
            });
          } else {
            // Create new assignment
            const newAssignment = new RateDeckAssignment({
              userId: new mongoose.Types.ObjectId(userId),
              rateDeckId: new mongoose.Types.ObjectId(rateDeckId),
              rateDeckType: 'number',
              assignedBy: user.email,
            });

            await newAssignment.save();

            const userData = users.find(u => u._id.toString() === userId);
            results.assigned.push({
              userId,
              name: userData?.name,
              email: userData?.email,
            });
          }
        }
      } catch (error) {
        console.error(`Error assigning user ${userId}:`, error);
        const userData = users.find(u => u._id.toString() === userId);
        results.errors.push({
          userId,
          name: userData?.name,
          email: userData?.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Update the rate deck's assigned users count
    const totalAssigned = await RateDeckAssignment.countDocuments({
      rateDeckId: new mongoose.Types.ObjectId(rateDeckId),
      rateDeckType: 'number',
      isActive: true,
    });

    await NumberRateDeck.findByIdAndUpdate(
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
      message: `Assignment completed. ${results.assigned.length} users assigned, ${results.alreadyAssigned.length} already assigned, ${results.errors.length} errors.`,
      results,
    });
  } catch (error) {
    console.error('Error assigning users to rate deck:', error);
    return NextResponse.json(
      { error: 'Failed to assign users to rate deck' },
      { status: 500 }
    );
  }
} 