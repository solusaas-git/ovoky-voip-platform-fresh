import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify the user is authenticated and is an admin
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectToDatabase();

    const { id } = await params;

    // Find and update the user
    const user = await User.findByIdAndUpdate(
      id,
      {
        isSuspended: false,
        suspendedAt: undefined,
        suspensionReason: undefined,
        suspendedBy: undefined,
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`User unsuspended: ${user.email} by ${currentUser.email}`);
    
    return NextResponse.json({
      success: true,
      message: 'User unsuspended successfully',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        isSuspended: user.isSuspended
      }
    });

  } catch (error) {
    console.error('Error unsuspending user:', error);
    return NextResponse.json(
      { error: 'Failed to unsuspend user' },
      { status: 500 }
    );
  }
} 