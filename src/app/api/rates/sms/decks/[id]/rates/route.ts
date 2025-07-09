import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import SmsRate from '@/models/SmsRate';
import SmsRateDeck from '@/models/SmsRateDeck';
import mongoose from 'mongoose';

// TypeScript interface
interface RateFilter {
  rateDeckId: mongoose.Types.ObjectId;
  prefix?: { $regex: string; $options: string };
  country?: { $regex: string; $options: string };
  description?: { $regex: string; $options: string };
  rate?: { $gte?: number; $lte?: number };
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
    
    if (minRate !== null || maxRate !== null) {
      filter.rate = {};
      if (minRate !== null) filter.rate.$gte = minRate;
      if (maxRate !== null) filter.rate.$lte = maxRate;
    }

    // Get total count for pagination
    const total = await SmsRate.countDocuments(filter);

    // Get rates with pagination
    const rates = await SmsRate
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
      effectiveDate: rate.effectiveDate.toISOString().split('T')[0],
      createdAt: rate.createdAt.toISOString(),
      updatedAt: rate.updatedAt.toISOString(),
    }));
    
    return NextResponse.json({
      rates: transformedRates,
      total,
    });
  } catch (error) {
    console.error('Error fetching SMS rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SMS rates' },
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
    
    const { prefix, country, description, rate, effectiveDate } = body;
    
    if (!prefix || !country || rate === undefined || !effectiveDate) {
      return NextResponse.json(
        { error: 'Prefix, country, rate, and effective date are required' },
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

    // Connect to the database
    await connectToDatabase();

    // Check if a rate with the same prefix already exists for this rate deck
    const existingRate = await SmsRate.findOne({
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
    const newRate = new SmsRate({
      rateDeckId: new mongoose.Types.ObjectId(rateDeckId),
      prefix: prefix.trim(),
      country: country.trim(),
      description: description?.trim() || '',
      rate: rate,
      effectiveDate: new Date(effectiveDate),
      createdBy: user.email,
    });

    const savedRate = await newRate.save();

    if (!savedRate) {
      return NextResponse.json(
        { error: 'Failed to create SMS rate' },
        { status: 500 }
      );
    }

    // Update the rate deck's rate count
    await SmsRateDeck.findByIdAndUpdate(
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
      effectiveDate: savedRate.effectiveDate.toISOString().split('T')[0],
      createdAt: savedRate.createdAt.toISOString(),
      updatedAt: savedRate.updatedAt.toISOString(),
    };
    
    return NextResponse.json(transformedRate, { status: 201 });
  } catch (error) {
    console.error('Error creating SMS rate:', error);
    return NextResponse.json(
      { error: 'Failed to create SMS rate' },
      { status: 500 }
    );
  }
} 