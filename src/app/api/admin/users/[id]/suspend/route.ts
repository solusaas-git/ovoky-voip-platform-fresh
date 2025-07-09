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

    const { reason } = await request.json();

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json(
        { error: 'Suspension reason is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const { id } = await params;

    // Prevent admin from suspending themselves
    if (currentUser.id === id) {
      return NextResponse.json(
        { error: 'You cannot suspend your own account' },
        { status: 400 }
      );
    }

    // Find and update the user
    const user = await User.findByIdAndUpdate(
      id,
      {
        isSuspended: true,
        suspendedAt: new Date(),
        suspensionReason: reason.trim(),
        suspendedBy: currentUser.name || currentUser.email,
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`User suspended: ${user.email} by ${currentUser.email}`);
    
    return NextResponse.json({
      success: true,
      message: 'User suspended successfully',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        isSuspended: user.isSuspended,
        suspendedAt: user.suspendedAt?.toISOString(),
        suspensionReason: user.suspensionReason,
        suspendedBy: user.suspendedBy
      }
    });

  } catch (error) {
    console.error('Error suspending user:', error);
    return NextResponse.json(
      { error: 'Failed to suspend user' },
      { status: 500 }
    );
  }
} 