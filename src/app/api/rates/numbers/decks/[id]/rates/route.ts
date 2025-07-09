import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import NumberRate from '@/models/NumberRate';
import NumberRateDeck from '@/models/NumberRateDeck';
import mongoose from 'mongoose';

// TypeScript interface
interface RateFilter {
  rateDeckId: mongoose.Types.ObjectId;
  prefix?: { $regex: string; $options: string };
  country?: { $regex: string; $options: string };
  description?: { $regex: string; $options: string };
  rate?: { $gte?: number; $lte?: number };
  type?: string;
}

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

    const { id: rateDeckId } = await params;
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    const prefix = searchParams.get('prefix') || '';
    const country = searchParams.get('country') || '';
    const type = searchParams.get('type') || '';
    const minRate = searchParams.get('minRate') ? parseFloat(searchParams.get('minRate')!) : null;
    const maxRate = searchParams.get('maxRate') ? parseFloat(searchParams.get('maxRate')!) : null;
    
    // Connect to the database
    await connectToDatabase();

    // Build filter query
    const filter: RateFilter = { rateDeckId: new mongoose.Types.ObjectId(rateDeckId) };
    
    if (prefix) {
      filter.prefix = { $regex: prefix, $options: 'i' };
    }
    
    if (country) {
      filter.country = { $regex: country, $options: 'i' };
    }
    
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    if (minRate !== null || maxRate !== null) {
      filter.rate = {};
      if (minRate !== null) filter.rate.$gte = minRate;
      if (maxRate !== null) filter.rate.$lte = maxRate;
    }

    // Get total count for pagination
    const total = await NumberRate.countDocuments(filter);

    // Get rates with pagination
    const rates = await NumberRate
      .find(filter)
      .sort({ prefix: 1, country: 1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // Transform the response to match frontend structure
    const transformedRates = rates.map(rate => ({
      id: rate._id.toString(),
      prefix: rate.prefix,
      country: rate.country,
      description: rate.description,
      rate: rate.rate,
      setupFee: rate.setupFee,
      type: rate.type,
      effectiveDate: rate.effectiveDate.toISOString().split('T')[0],
      createdAt: rate.createdAt.toISOString(),
      updatedAt: rate.updatedAt.toISOString(),
    }));
    
    return NextResponse.json({
      rates: transformedRates,
      total,
    });
  } catch (error) {
    console.error('Error fetching number rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch number rates' },
      { status: 500 }
    );
  }
}

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

    const { id: rateDeckId } = await params;
    const body = await request.json();
    
    const { prefix, country, description, rate, setupFee, type, effectiveDate } = body;
    
    if (!prefix || !country || rate === undefined || !type || !effectiveDate) {
      return NextResponse.json(
        { error: 'Prefix, country, rate, type, and effective date are required' },
        { status: 400 }
      );
    }

    // Validate rate is a positive number
    if (typeof rate !== 'number' || rate < 0) {
      return NextResponse.json(
        { error: 'Rate must be a positive number' },
        { status: 400 }
      );
    }

    // Validate setupFee if provided
    if (setupFee !== undefined && (typeof setupFee !== 'number' || setupFee < 0)) {
      return NextResponse.json(
        { error: 'Setup fee must be a positive number' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['Geographic/Local', 'Mobile', 'National', 'Toll-free', 'Shared Cost', 'NPV (Verified Numbers)'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid rate type' },
        { status: 400 }
      );
    }

    // Connect to the database
    await connectToDatabase();

    // Check if a rate with the same prefix already exists for this rate deck
    const existingRate = await NumberRate.findOne({
      rateDeckId: new mongoose.Types.ObjectId(rateDeckId),
      prefix: prefix.trim(),
    });

    if (existingRate) {
      return NextResponse.json(
        { error: 'A rate with this prefix already exists in this rate deck' },
        { status: 400 }
      );
    }

    // Create the new rate
    const newRate = new NumberRate({
      rateDeckId: new mongoose.Types.ObjectId(rateDeckId),
      prefix: prefix.trim(),
      country: country.trim(),
      description: description?.trim() || '',
      rate: rate,
      setupFee: setupFee || 0,
      type: type,
      effectiveDate: new Date(effectiveDate),
      createdBy: user.email,
    });

    const savedRate = await newRate.save();

    if (!savedRate) {
      return NextResponse.json(
        { error: 'Failed to create number rate' },
        { status: 500 }
      );
    }

    // Update the rate deck's rate count
    await NumberRateDeck.findByIdAndUpdate(
      rateDeckId,
      { 
        $inc: { rateCount: 1 },
        $set: { updatedAt: new Date() }
      }
    );

    // Transform the response to match frontend structure
    const transformedRate = {
              id: (savedRate._id as { toString(): string }).toString(),
      prefix: savedRate.prefix,
      country: savedRate.country,
      description: savedRate.description,
      rate: savedRate.rate,
      setupFee: savedRate.setupFee,
      type: savedRate.type,
      effectiveDate: savedRate.effectiveDate.toISOString().split('T')[0],
      createdAt: savedRate.createdAt.toISOString(),
      updatedAt: savedRate.updatedAt.toISOString(),
    };
    
    return NextResponse.json(transformedRate, { status: 201 });
  } catch (error) {
    console.error('Error creating number rate:', error);
    return NextResponse.json(
      { error: 'Failed to create number rate' },
      { status: 500 }
    );
  }
} 