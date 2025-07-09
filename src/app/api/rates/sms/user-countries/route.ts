import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import RateDeckAssignment from '@/models/RateDeckAssignment';
import SmsRate from '@/models/SmsRate';
import mongoose from 'mongoose';

// GET - Get unique countries from user's assigned SMS rate decks
export async function GET(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to the database
    await connectToDatabase();

    // Get user's assigned SMS rate decks
    const assignments = await RateDeckAssignment
      .find({
        userId: new mongoose.Types.ObjectId(user.id),
        rateDeckType: 'sms',
        isActive: true,
      })
      .lean();

    if (assignments.length === 0) {
      return NextResponse.json({
        countries: [],
      });
    }

    const assignedRateDeckIds = assignments.map(assignment => assignment.rateDeckId);

    // Get unique countries from all assigned rate decks
    const countries = await SmsRate.aggregate([
      {
        $match: {
          rateDeckId: { $in: assignedRateDeckIds }
        }
      },
      {
        $group: {
          _id: '$country',
          country: { $first: '$country' },
          prefix: { $first: '$prefix' }
        }
      },
      {
        $sort: { country: 1 }
      },
      {
        $project: {
          _id: 0,
          name: '$country',
          phoneCode: '$prefix'
        }
      }
    ]);

    return NextResponse.json({
      countries: countries,
    });
  } catch (error) {
    console.error('Error fetching user SMS countries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available countries' },
      { status: 500 }
    );
  }
} 