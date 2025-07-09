import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';
import { z } from 'zod';

// Type definitions for populated documents
interface PopulatedRateDeck {
  _id: { toString(): string };
  name: string;
  description: string;
  currency: string;
}

interface PopulatedUser {
  _id: { toString(): string };
  name: string;
  email: string;
  company?: string;
}

// Validation schema for unreserving phone numbers
const unreservePhoneNumberSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason must be 500 characters or less'),
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
    const validatedData = unreservePhoneNumberSchema.parse(body);

    // Connect to the database
    await connectToDatabase();

    // Find the phone number
    const phoneNumber = await PhoneNumber.findById(id);
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    // Check if phone number can be unreserved (must be reserved)
    if (phoneNumber.status !== 'reserved') {
      return NextResponse.json(
        { error: `Cannot unreserve phone number with status: ${phoneNumber.status}. Only reserved numbers can be unreserved.` },
        { status: 400 }
      );
    }

    // Create admin note with unreservation details
    const unreservationNote = `UNRESERVED by ${user.name || user.email} on ${new Date().toISOString()}\nReason: ${validatedData.reason}${validatedData.notes ? `\nNotes: ${validatedData.notes}` : ''}`;
    const existingNotes = phoneNumber.notes || '';
    const updatedNotes = existingNotes ? `${existingNotes}\n\n${unreservationNote}` : unreservationNote;

    // Update the phone number status back to available
    const updatedPhoneNumber = await PhoneNumber.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'available',
          notes: updatedNotes,
          updatedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'name email company')
      .lean();

    // Transform the response
    const response = {
      ...updatedPhoneNumber,
      _id: updatedPhoneNumber!._id.toString(),
      // rateDeckId removed - rate decks are now assigned to users, not phone numbers
      assignedTo: updatedPhoneNumber!.assignedTo ? (updatedPhoneNumber!.assignedTo as unknown as PopulatedUser)._id.toString() : undefined,
      createdAt: updatedPhoneNumber!.createdAt.toISOString(),
      updatedAt: updatedPhoneNumber!.updatedAt.toISOString(),
    };

    return NextResponse.json({
      message: 'Phone number unreserved successfully',
      phoneNumber: response
    });
  } catch (error) {
    console.error('Error unreserving phone number:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to unreserve phone number' },
      { status: 500 }
    );
  }
} 