import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import mongoose, { Schema } from 'mongoose';

// Canned Response Schema (same as parent route)
const cannedResponseSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  category: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  services: [{
    type: String,
    enum: ['outbound_calls', 'inbound_calls', 'did_numbers', 'sms', 'emailing', 'whatsapp_business', 'billing', 'technical', 'other'],
  }],
  keywords: [{
    type: String,
    trim: true,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
  collection: 'canned_responses',
});

const CannedResponse = mongoose.models.CannedResponse || 
  mongoose.model('CannedResponse', cannedResponseSchema);

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST - Increment usage count
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Await params before accessing properties (Next.js 15 requirement)
    const { id } = await params;

    // Increment usage count
    const response = await CannedResponse.findByIdAndUpdate(
      id,
      { $inc: { usageCount: 1 } },
      { new: true }
    );

    if (!response) {
      return NextResponse.json(
        { error: 'Canned response not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Usage count updated',
      usageCount: response.usageCount,
    });

  } catch (error) {
    console.error('Error updating usage count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 