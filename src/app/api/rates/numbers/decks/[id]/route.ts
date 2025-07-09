import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import NumberRateDeck from '@/models/NumberRateDeck';
import { connectToDatabase } from '@/lib/db';

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

    const { id } = await params;
    
    // Connect to the database
    await connectToDatabase();

    // Find the rate deck
    const rateDeck = await NumberRateDeck.findById(id);
    if (!rateDeck) {
      return NextResponse.json(
        { error: 'Number rate deck not found' },
        { status: 404 }
      );
    }

    // Transform the response to match frontend structure
    const transformedDeck = {
      id: (rateDeck._id as { toString(): string }).toString(),
      name: rateDeck.name,
      description: rateDeck.description,
      currency: rateDeck.currency,
      isActive: rateDeck.isActive,
      isDefault: rateDeck.isDefault,
      rateCount: rateDeck.rateCount,
      assignedUsers: rateDeck.assignedUsers,
      createdBy: rateDeck.createdBy,
      createdAt: rateDeck.createdAt.toISOString(),
      updatedAt: rateDeck.updatedAt.toISOString(),
    };
    
    return NextResponse.json(transformedDeck);
  } catch (error) {
    console.error('Error fetching number rate deck:', error);
    return NextResponse.json(
      { error: 'Failed to fetch number rate deck' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    
    const { name, description, currency, isActive, isDefault } = body;
    
    if (!name || !currency) {
      return NextResponse.json(
        { error: 'Name and currency are required' },
        { status: 400 }
      );
    }

    // Connect to the database
    await connectToDatabase();

    // Find the rate deck
    const existingDeck = await NumberRateDeck.findById(id);
    if (!existingDeck) {
      return NextResponse.json(
        { error: 'Number rate deck not found' },
        { status: 404 }
      );
    }

    // Check if name is being changed and if it conflicts with another deck
    if (name !== existingDeck.name) {
      const nameConflict = await NumberRateDeck.findOne({ 
        name, 
        _id: { $ne: id } 
      });
      if (nameConflict) {
        return NextResponse.json(
          { error: 'A rate deck with this name already exists' },
          { status: 400 }
        );
      }
    }

    // Update the rate deck
    const updatedDeck = await NumberRateDeck.findByIdAndUpdate(
      id,
      {
        name,
        description: description || '',
        currency: currency.toUpperCase(),
        isActive: isActive !== undefined ? isActive : existingDeck.isActive,
        isDefault: isDefault !== undefined ? isDefault : existingDeck.isDefault,
      },
      { new: true, runValidators: true }
    );

    if (!updatedDeck) {
      return NextResponse.json(
        { error: 'Failed to update rate deck' },
        { status: 500 }
      );
    }

    // Transform the response to match frontend structure
    const transformedDeck = {
      id: (updatedDeck._id as { toString(): string }).toString(),
      name: updatedDeck.name,
      description: updatedDeck.description,
      currency: updatedDeck.currency,
      isActive: updatedDeck.isActive,
      isDefault: updatedDeck.isDefault,
      rateCount: updatedDeck.rateCount,
      assignedUsers: updatedDeck.assignedUsers,
      createdBy: updatedDeck.createdBy,
      createdAt: updatedDeck.createdAt.toISOString(),
      updatedAt: updatedDeck.updatedAt.toISOString(),
    };
    
    return NextResponse.json(transformedDeck);
  } catch (error) {
    console.error('Error updating number rate deck:', error);
    return NextResponse.json(
      { error: 'Failed to update number rate deck' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    
    // Connect to the database
    await connectToDatabase();

    // Find the rate deck
    const existingDeck = await NumberRateDeck.findById(id);
    if (!existingDeck) {
      return NextResponse.json(
        { error: 'Number rate deck not found' },
        { status: 404 }
      );
    }

    // Check if it's the default deck
    if (existingDeck.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete the default rate deck' },
        { status: 400 }
      );
    }

    // Check if it has assigned users (optional safety check)
    if (existingDeck.assignedUsers > 0) {
      return NextResponse.json(
        { error: 'Cannot delete rate deck with assigned users. Please reassign users first.' },
        { status: 400 }
      );
    }

    // Remove the rate deck
    await NumberRateDeck.findByIdAndDelete(id);
    
    return NextResponse.json({ 
      success: true,
      message: 'Number rate deck deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting number rate deck:', error);
    return NextResponse.json(
      { error: 'Failed to delete number rate deck' },
      { status: 500 }
    );
  }
} 