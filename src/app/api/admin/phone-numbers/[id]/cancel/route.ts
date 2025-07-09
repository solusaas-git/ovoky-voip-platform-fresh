import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';
import PhoneNumberAssignment from '@/models/PhoneNumberAssignment';
import PhoneNumberBilling from '@/models/PhoneNumberBilling';
import { z } from 'zod';
import mongoose from 'mongoose';

// Type definitions for populated documents
interface PopulatedRateDeck {
  _id: { toString(): string };
  name: string;
  description: string;
  currency: string;
}

// Validation schema for cancelling phone numbers
const cancelPhoneNumberSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason must be 500 characters or less'),
  cancelBilling: z.boolean().default(true),
  createRefund: z.boolean().default(false),
  refundAmount: z.number().min(0).optional(),
  gracePeriodDays: z.number().min(0).max(365).default(30),
  notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional(),
});

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

    const { id } = await params;
    const body = await request.json();
    
    // Validate the request body
    const validatedData = cancelPhoneNumberSchema.parse(body);

    // Connect to the database
    await connectToDatabase();

    // Find the phone number
    const phoneNumber = await PhoneNumber.findById(id);
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    // Check if phone number can be cancelled
    if (phoneNumber.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Phone number is already cancelled' },
        { status: 400 }
      );
    }

    // Store previous status for audit trail
    const previousStatus = phoneNumber.status;
    const currentDate = new Date();
    const permanentDeleteDate = new Date(currentDate.getTime() + (validatedData.gracePeriodDays * 24 * 60 * 60 * 1000));

    // If phone number is currently assigned, unassign it first
    if (phoneNumber.status === 'assigned' && phoneNumber.assignedTo) {
      // Update the current assignment to end it
      await PhoneNumberAssignment.findOneAndUpdate(
        {
          phoneNumberId: new mongoose.Types.ObjectId(id),
          status: 'active'
        },
        {
          $set: {
            status: 'unassigned',
            unassignedAt: currentDate,
            unassignedBy: user.id,
            unassignedReason: `Phone number cancelled: ${validatedData.reason}`
          }
        }
      );
    }

    // Cancel billing if requested
    if (validatedData.cancelBilling) {
      await PhoneNumberBilling.updateMany(
        { 
          phoneNumberId: phoneNumber._id,
          status: { $in: ['pending', 'scheduled'] }
        },
        {
          $set: {
            status: 'cancelled',
            notes: `Cancelled: ${validatedData.reason}`
          }
        }
      );

      // Create refund record if requested
      if (validatedData.createRefund && validatedData.refundAmount && validatedData.refundAmount > 0) {
        await PhoneNumberBilling.create({
          phoneNumberId: phoneNumber._id,
          userId: phoneNumber.assignedTo,
          type: 'refund',
          amount: -Math.abs(validatedData.refundAmount), // Negative amount for refund
          currency: phoneNumber.currency || 'USD',
          status: 'pending',
          dueDate: currentDate,
          description: `Refund for cancelled phone number: ${phoneNumber.number}`,
          createdBy: user.id,
          notes: `Cancellation refund: ${validatedData.reason}`
        });
      }
    }

    // Create admin note with cancellation details
    const cancellationNote = `CANCELLED by ${user.name || user.email} on ${currentDate.toISOString()}\nPrevious status: ${previousStatus}\nReason: ${validatedData.reason}\nGrace period: ${validatedData.gracePeriodDays} days\nPermanent deletion: ${permanentDeleteDate.toISOString()}${validatedData.cancelBilling ? '\nBilling cancelled' : ''}${validatedData.createRefund && validatedData.refundAmount ? `\nRefund created: ${validatedData.refundAmount}` : ''}${validatedData.notes ? `\nNotes: ${validatedData.notes}` : ''}`;
    const existingNotes = phoneNumber.notes || '';
    const updatedNotes = existingNotes ? `${existingNotes}\n\n${cancellationNote}` : cancellationNote;

    // Update the phone number status
    const updatedPhoneNumber = await PhoneNumber.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'cancelled',
          assignedTo: null, // Clear assignment
          assignedAt: null,
          notes: updatedNotes,
          updatedAt: currentDate
        }
      },
      { new: true, runValidators: true }
    )
      // .populate('rateDeckId') removed - rate decks are now assigned to users, not phone numbers
      .lean();

    // Transform the response
    const response = {
      ...updatedPhoneNumber,
      _id: updatedPhoneNumber!._id.toString(),
      // rateDeckId removed - rate decks are now assigned to users, not phone numbers
      createdAt: updatedPhoneNumber!.createdAt.toISOString(),
      updatedAt: updatedPhoneNumber!.updatedAt.toISOString(),
    };

    return NextResponse.json({
      message: 'Phone number cancelled successfully',
      phoneNumber: response,
      gracePeriodDays: validatedData.gracePeriodDays,
      permanentDeleteDate: permanentDeleteDate.toISOString(),
      billingCancelled: validatedData.cancelBilling,
      refundCreated: validatedData.createRefund && validatedData.refundAmount && validatedData.refundAmount > 0
    });
  } catch (error) {
    console.error('Error cancelling phone number:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to cancel phone number' },
      { status: 500 }
    );
  }
} 