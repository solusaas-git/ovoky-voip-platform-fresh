import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import RateDeckAssignment from '@/models/RateDeckAssignment';
import SmsRateDeck from '@/models/SmsRateDeck';
import SmsRate from '@/models/SmsRate';
import mongoose from 'mongoose';

// TypeScript interfaces
interface RateQuery {
  rateDeckId: { $in: mongoose.Types.ObjectId[] } | mongoose.Types.ObjectId;
  prefix?: { $regex: string; $options: string };
  country?: { $regex: string; $options: string };
  description?: { $regex: string; $options: string };
  type?: string;
  rate?: { $gte?: number; $lte?: number };
}

// GET - Get SMS rates for the current user from their assigned rate decks
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
    const prefix = searchParams.get('prefix') || '';
    const country = searchParams.get('country') || '';
    const type = searchParams.get('type');
    const rateDeckId = searchParams.get('rateDeckId');
    const minRate = searchParams.get('minRate');
    const maxRate = searchParams.get('maxRate');

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
        rates: [],
        total: 0,
        rateDecks: [],
      });
    }

    const assignedRateDeckIds = assignments.map(assignment => assignment.rateDeckId);

    // Get rate deck information for the filter dropdown
    const rateDecks = await SmsRateDeck
      .find({ _id: { $in: assignedRateDeckIds } })
      .select('name currency')
      .lean();

    // Build query for rates
    let rateDeckFilter: RateQuery = { rateDeckId: { $in: assignedRateDeckIds } };
    
    // If specific rate deck is requested, filter to that one
    if (rateDeckId && rateDeckId !== 'all') {
      rateDeckFilter.rateDeckId = new mongoose.Types.ObjectId(rateDeckId);
    }

    const rateQuery: RateQuery = rateDeckFilter;
    
    if (prefix) {
      rateQuery.prefix = { $regex: prefix, $options: 'i' };
    }
    
    if (country) {
      rateQuery.country = { $regex: country, $options: 'i' };
    }
    
    if (type && type !== 'all') {
      rateQuery.type = type;
    }
    
    if (minRate) {
      rateQuery.rate = { ...rateQuery.rate, $gte: parseFloat(minRate) };
    }
    
    if (maxRate) {
      rateQuery.rate = { ...rateQuery.rate, $lte: parseFloat(maxRate) };
    }

    // Get total count for pagination
    const total = await SmsRate.countDocuments(rateQuery);

    // Fetch rates with pagination
    const rates = await SmsRate
      .find(rateQuery)
      .sort({ prefix: 1, country: 1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // Create a map of rate deck info for quick lookup
    const rateDeckMap = new Map();
    for (const deck of rateDecks) {
      rateDeckMap.set(deck._id.toString(), deck);
    }

    // Transform the rates to include rate deck information
    const transformedRates = rates.map(rate => {
      const rateDeck = rateDeckMap.get(rate.rateDeckId.toString());
      return {
        id: rate._id.toString(),
        prefix: rate.prefix,
        country: rate.country,
        description: rate.description,
        rate: rate.rate,
        type: (rate as unknown as { type: string }).type,
        effectiveDate: rate.effectiveDate?.toISOString() || null,
        rateDeckId: rate.rateDeckId.toString(),
        rateDeckName: rateDeck?.name || 'Unknown Rate Deck',
        currency: rateDeck?.currency || 'USD',
      };
    });

    // Transform rate decks for the response
    const transformedRateDecks = rateDecks.map(deck => ({
      id: deck._id.toString(),
      name: deck.name,
      currency: deck.currency,
    }));

    return NextResponse.json({
      rates: transformedRates,
      total,
      rateDecks: transformedRateDecks,
    });
  } catch (error) {
    console.error('Error fetching user SMS rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch your SMS rates' },
      { status: 500 }
    );
  }
} 