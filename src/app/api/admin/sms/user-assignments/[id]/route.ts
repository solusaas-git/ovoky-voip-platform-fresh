import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import SmsUserProviderAssignment from '@/models/SmsUserProviderAssignment';
import mongoose from 'mongoose';

// GET - Get specific user provider assignment
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();

    const assignment = await SmsUserProviderAssignment.findById(id)
      .populate('userId', 'name email role isActive')
      .populate('providerId', 'name displayName type provider isActive supportedCountries')
      .populate('assignedBy', 'name email')
      .populate('unassignedBy', 'name email');

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      assignment
    });
  } catch (error) {
    console.error('Failed to fetch user provider assignment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update user provider assignment
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getCurrentUser();
    
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      isActive,
      priority,
      dailyLimit,
      monthlyLimit,
      notes
    } = body;

    await connectToDatabase();

    const assignment = await SmsUserProviderAssignment.findById(id);
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Update assignment
    const updateData: any = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (priority !== undefined) updateData.priority = priority;
    if (dailyLimit !== undefined) updateData.dailyLimit = dailyLimit;
    if (monthlyLimit !== undefined) updateData.monthlyLimit = monthlyLimit;
    if (notes !== undefined) updateData.notes = notes;

    // If deactivating, set unassigned fields
    if (isActive === false && assignment.isActive === true) {
      updateData.unassignedAt = new Date();
      updateData.unassignedBy = new mongoose.Types.ObjectId(admin.id);
    }

    // If reactivating, clear unassigned fields
    if (isActive === true && assignment.isActive === false) {
      updateData.unassignedAt = undefined;
      updateData.unassignedBy = undefined;
    }

    const updatedAssignment = await SmsUserProviderAssignment.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
      .populate('userId', 'name email role isActive')
      .populate('providerId', 'name displayName type provider isActive supportedCountries')
      .populate('assignedBy', 'name email')
      .populate('unassignedBy', 'name email');

    return NextResponse.json({
      success: true,
      assignment: updatedAssignment
    });
  } catch (error) {
    console.error('Failed to update user provider assignment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete user provider assignment
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getCurrentUser();
    
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();

    const assignment = await SmsUserProviderAssignment.findById(id);
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Instead of hard delete, we'll soft delete by deactivating
    console.log('Deactivating assignment:', id);
    const result = await SmsUserProviderAssignment.findByIdAndUpdate(id, {
      isActive: false,
      unassignedAt: new Date(),
      unassignedBy: new mongoose.Types.ObjectId(admin.id)
    });
    console.log('Assignment deactivated:', result);

    return NextResponse.json({
      success: true,
      message: 'Assignment deactivated successfully'
    });
  } catch (error) {
    console.error('Failed to delete user provider assignment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 