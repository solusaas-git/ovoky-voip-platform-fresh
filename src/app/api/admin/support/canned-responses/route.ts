import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import mongoose, { Schema } from 'mongoose';

// Type definitions for canned response filters
interface CannedResponseFilter {
  category?: string;
  services?: { $in: string[] };
  isActive?: boolean;
  $or?: Array<{
    title?: { $regex: string; $options: string };
    content?: { $regex: string; $options: string };
    category?: { $regex: string; $options: string };
    keywords?: { $in: RegExp[] };
  }>;
}

// Canned Response Schema
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

// GET - List canned responses
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const service = searchParams.get('service');
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');

    // Build filter
    const filter: CannedResponseFilter = {};
    if (category) filter.category = category;
    if (service) filter.services = { $in: [service] };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { keywords: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    if (isActive !== null) filter.isActive = isActive === 'true';

    const responses = await CannedResponse.find(filter)
      .sort({ category: 1, usageCount: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      responses,
      total: responses.length,
    });

  } catch (error) {
    console.error('Error fetching canned responses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create canned response
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { title, content, category, services, keywords, isActive } = body;

    // Validation
    if (!title || !content || !category) {
      return NextResponse.json(
        { error: 'Title, content, and category are required' },
        { status: 400 }
      );
    }

    const responseData = {
      title: title.trim(),
      content: content.trim(),
      category: category.trim(),
      services: services || [],
      keywords: keywords || [],
      isActive: isActive !== false,
      usageCount: 0,
      createdBy: user.email,
    };

    const response = new CannedResponse(responseData);
    await response.save();

    return NextResponse.json({
      message: 'Canned response created successfully',
      response,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating canned response:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 