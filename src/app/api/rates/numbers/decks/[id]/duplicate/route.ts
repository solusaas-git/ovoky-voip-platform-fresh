import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import NumberRateDeck from '@/models/NumberRateDeck';
import { connectToDatabase } from '@/lib/db';

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
    
    // Connect to the database
    await connectToDatabase();

    // Find the rate deck to duplicate
    const originalDeck = await NumberRateDeck.findById(id);
    if (!originalDeck) {
      return NextResponse.json(
        { error: 'Number rate deck not found' },
        { status: 404 }
      );
    }

    // Generate a unique name for the duplicate
    let duplicateName = `${originalDeck.name} (Copy)`;
    let counter = 1;
    
    // Check if the name already exists and increment counter if needed
    while (await NumberRateDeck.findOne({ name: duplicateName })) {
      counter++;
      duplicateName = `${originalDeck.name} (Copy ${counter})`;
    }

    // Create a duplicate with a new name
    const duplicatedDeck = await NumberRateDeck.create({
      name: duplicateName,
      description: originalDeck.description,
      currency: originalDeck.currency,
      isActive: originalDeck.isActive,
      isDefault: false, // Duplicates are never default
      rateCount: originalDeck.rateCount,
      assignedUsers: 0, // Start with no assigned users
      createdBy: user.name || user.email,
    });

    // Transform the response to match frontend structure
    const transformedDeck = {
      id: (duplicatedDeck._id as { toString(): string }).toString(),
      name: duplicatedDeck.name,
      description: duplicatedDeck.description,
      currency: duplicatedDeck.currency,
      isActive: duplicatedDeck.isActive,
      isDefault: duplicatedDeck.isDefault,
      rateCount: duplicatedDeck.rateCount,
      assignedUsers: duplicatedDeck.assignedUsers,
      createdBy: duplicatedDeck.createdBy,
      createdAt: duplicatedDeck.createdAt.toISOString(),
      updatedAt: duplicatedDeck.updatedAt.toISOString(),
    };
    
    return NextResponse.json(transformedDeck, { status: 201 });
  } catch (error) {
    console.error('Error duplicating number rate deck:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate number rate deck' },
      { status: 500 }
    );
  }
} 