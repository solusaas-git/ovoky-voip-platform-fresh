import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import SmsRateDeck from '@/models/SmsRateDeck';
import RateDeckAssignment from '@/models/RateDeckAssignment';
import { connectToDatabase } from '@/lib/db';
import mongoose from 'mongoose';

// TypeScript interfaces
interface SmsRateDeckDocument {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  currency: string;
  isActive: boolean;
  isDefault: boolean;
  rateCount: number;
  assignedUsers: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RateDeckQuery {
  name?: { $regex: string; $options: string };
  isActive?: boolean;
  isDefault?: boolean;
  _id?: { $in: mongoose.Types.ObjectId[] };
}

export async function GET(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    const name = searchParams.get('name') || '';
    const isActive = searchParams.get('isActive');
    const isDefault = searchParams.get('isDefault');

    // Connect to the database
    await connectToDatabase();

    let rateDecks: SmsRateDeckDocument[] = [];
    let total = 0;

    if (user.role === 'admin') {
      // Admin can see all rate decks
      const query: RateDeckQuery = {};
      
      if (name) {
        query.name = { $regex: name, $options: 'i' };
      }
      
      if (isActive && isActive !== 'all') {
        query.isActive = isActive === 'true';
      }
      
      if (isDefault && isDefault !== 'all') {
        query.isDefault = isDefault === 'true';
      }

      // Get total count for pagination
      total = await SmsRateDeck.countDocuments(query);

      // Fetch rate decks with pagination
      rateDecks = await SmsRateDeck.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean() as unknown as SmsRateDeckDocument[];
    } else {
      // Regular users can only see their assigned rate decks
      const assignments = await RateDeckAssignment
        .find({
          userId: new mongoose.Types.ObjectId(user.id),
          rateDeckType: 'sms',
          isActive: true,
        })
        .lean();

      const assignedRateDeckIds = assignments.map(assignment => assignment.rateDeckId);

      if (assignedRateDeckIds.length > 0) {
        const query: RateDeckQuery = {
          _id: { $in: assignedRateDeckIds }
        };
        
        if (name) {
          query.name = { $regex: name, $options: 'i' };
        }
        
        if (isActive && isActive !== 'all') {
          query.isActive = isActive === 'true';
        }
        
        if (isDefault && isDefault !== 'all') {
          query.isDefault = isDefault === 'true';
        }

        // Get total count for pagination
        total = await SmsRateDeck.countDocuments(query);

        // Fetch rate decks with pagination
        rateDecks = await SmsRateDeck.find(query)
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .lean() as unknown as SmsRateDeckDocument[];
      }
    }

    // Transform the data to match frontend structure
    const transformedRateDecks = rateDecks.map(deck => ({
      id: deck._id.toString(),
      name: deck.name,
      description: deck.description,
      currency: deck.currency,
      isActive: deck.isActive,
      isDefault: deck.isDefault,
      rateCount: deck.rateCount,
      assignedUsers: deck.assignedUsers,
      createdBy: deck.createdBy,
      createdAt: deck.createdAt.toISOString(),
      updatedAt: deck.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      rateDecks: transformedRateDecks,
      total
    });
  } catch (error) {
    console.error('Error fetching SMS rate decks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SMS rate decks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated and is an admin
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate the request body
    const { name, description, currency, isActive, isDefault } = body;
    
    if (!name || !currency) {
      return NextResponse.json(
        { error: 'Name and currency are required' },
        { status: 400 }
      );
    }

    // Connect to the database
    await connectToDatabase();

    // Check if a rate deck with this name already exists
    const existingDeck = await SmsRateDeck.findOne({ name });
    if (existingDeck) {
      return NextResponse.json(
        { error: 'A rate deck with this name already exists' },
        { status: 400 }
      );
    }

    // Create new SMS rate deck
    const newRateDeck = await SmsRateDeck.create({
      name,
      description: description || '',
      currency: currency.toUpperCase(),
      isActive: isActive !== undefined ? isActive : true,
      isDefault: isDefault || false,
      rateCount: 0,
      assignedUsers: 0,
      createdBy: user.name || user.email,
    });

    // Transform the response to match frontend structure
    const transformedRateDeck = {
      id: (newRateDeck._id as mongoose.Types.ObjectId).toString(),
      name: newRateDeck.name,
      description: newRateDeck.description,
      currency: newRateDeck.currency,
      isActive: newRateDeck.isActive,
      isDefault: newRateDeck.isDefault,
      rateCount: newRateDeck.rateCount,
      assignedUsers: newRateDeck.assignedUsers,
      createdBy: newRateDeck.createdBy,
      createdAt: newRateDeck.createdAt.toISOString(),
      updatedAt: newRateDeck.updatedAt.toISOString(),
    };
    
    return NextResponse.json(transformedRateDeck, { status: 201 });
  } catch (error) {
    console.error('Error creating SMS rate deck:', error);
    return NextResponse.json(
      { error: 'Failed to create SMS rate deck' },
      { status: 500 }
    );
  }
} 