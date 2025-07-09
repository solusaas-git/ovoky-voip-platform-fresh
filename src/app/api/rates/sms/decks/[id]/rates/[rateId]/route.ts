import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import SmsRate from '@/models/SmsRate';
import SmsRateDeck from '@/models/SmsRateDeck';
import mongoose from 'mongoose';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; rateId: string }> }
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

    const { id: rateDeckId, rateId } = await params;
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

    // Find the existing rate
    const existingRate = await SmsRate.findOne({
      _id: new mongoose.Types.ObjectId(rateId),
      rateDeckId: new mongoose.Types.ObjectId(rateDeckId),
    });

    if (!existingRate) {
      return NextResponse.json(
        { error: 'SMS rate not found' },
        { status: 404 }
      );
    }

    // Check if prefix is being changed and if it conflicts with another rate
    if (prefix.trim() !== existingRate.prefix) {
      const prefixConflict = await SmsRate.findOne({
        rateDeckId: new mongoose.Types.ObjectId(rateDeckId),
        prefix: prefix.trim(),
        _id: { $ne: new mongoose.Types.ObjectId(rateId) },
      });

      if (prefixConflict) {
        return NextResponse.json(
          { error: 'A rate with this prefix already exists in this rate deck' },
          { status: 400 }
        );
      }
    }

    // Update the rate
    const updatedRate = await SmsRate.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(rateId),
        rateDeckId: new mongoose.Types.ObjectId(rateDeckId),
      },
      {
        $set: {
          prefix: prefix.trim(),
          country: country.trim(),
          description: description?.trim() || '',
          rate: rate,
          effectiveDate: new Date(effectiveDate),
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedRate) {
      return NextResponse.json(
        { error: 'Failed to update SMS rate' },
        { status: 500 }
      );
    }

    // Transform the response to match frontend structure
    const transformedRate = {
      id: (updatedRate._id as { toString(): string }).toString(),
      prefix: updatedRate.prefix,
      country: updatedRate.country,
      description: updatedRate.description,
      rate: updatedRate.rate,
      effectiveDate: updatedRate.effectiveDate.toISOString().split('T')[0],
      createdAt: updatedRate.createdAt.toISOString(),
      updatedAt: updatedRate.updatedAt.toISOString(),
    };
    
    return NextResponse.json(transformedRate);
  } catch (error) {
    console.error('Error updating SMS rate:', error);
    return NextResponse.json(
      { error: 'Failed to update SMS rate' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; rateId: string }> }
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

    const { id: rateDeckId, rateId } = await params;
    
    // Connect to the database
    await connectToDatabase();

    // Find and delete the rate
    const deletedRate = await SmsRate.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(rateId),
      rateDeckId: new mongoose.Types.ObjectId(rateDeckId),
    });

    if (!deletedRate) {
      return NextResponse.json(
        { error: 'SMS rate not found' },
        { status: 404 }
      );
    }

    // Update the rate deck's rate count
    await SmsRateDeck.findByIdAndUpdate(
      rateDeckId,
      { 
        $inc: { rateCount: -1 },
        $set: { updatedAt: new Date() }
      }
    );
    
    return NextResponse.json({ 
      success: true,
      message: 'SMS rate deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting SMS rate:', error);
    return NextResponse.json(
      { error: 'Failed to delete SMS rate' },
      { status: 500 }
    );
  }
} 