import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';
import PhoneNumberBilling from '@/models/PhoneNumberBilling';
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

// Validation schema for suspending phone numbers
const suspendPhoneNumberSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason must be 500 characters or less'),
  suspendBilling: z.boolean().default(true),
  autoResumeDate: z.union([z.string().datetime(), z.literal('')]).optional(),
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
    const validatedData = suspendPhoneNumberSchema.parse(body);

    // Connect to the database
    await connectToDatabase();

    // Find the phone number
    const phoneNumber = await PhoneNumber.findById(id);
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    // Check if phone number can be suspended (cannot suspend already suspended or cancelled)
    if (phoneNumber.status === 'suspended') {
      return NextResponse.json(
        { error: 'Phone number is already suspended' },
        { status: 400 }
      );
    }

    if (phoneNumber.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot suspend a cancelled phone number' },
        { status: 400 }
      );
    }

    // Store previous status for potential restoration
    const previousStatus = phoneNumber.status;

    // Suspend billing if requested
    if (validatedData.suspendBilling) {
      await PhoneNumberBilling.updateMany(
        { 
          phoneNumberId: phoneNumber._id,
          status: 'pending'
        },
        {
          $set: {
            status: 'suspended',
            notes: `Suspended: ${validatedData.reason}`
          }
        }
      );
    }

    // Create admin note with suspension details
    const suspensionNote = `SUSPENDED by ${user.name || user.email} on ${new Date().toISOString()}\nPrevious status: ${previousStatus}\nReason: ${validatedData.reason}${validatedData.suspendBilling ? '\nBilling suspended' : ''}${validatedData.autoResumeDate && validatedData.autoResumeDate !== '' ? `\nAuto-resume date: ${validatedData.autoResumeDate}` : ''}${validatedData.notes ? `\nNotes: ${validatedData.notes}` : ''}`;
    const existingNotes = phoneNumber.notes || '';
    const updatedNotes = existingNotes ? `${existingNotes}\n\n${suspensionNote}` : suspensionNote;

    // Update the phone number
    const updatedPhoneNumber = await PhoneNumber.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'suspended',
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
      message: 'Phone number suspended successfully',
      phoneNumber: response,
      billingUpdated: validatedData.suspendBilling
    });
  } catch (error) {
    console.error('Error suspending phone number:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to suspend phone number' },
      { status: 500 }
    );
  }
} 