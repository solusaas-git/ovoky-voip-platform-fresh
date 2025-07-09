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

// PUT - Update canned response
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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

    const updateData = {
      title: title.trim(),
      content: content.trim(),
      category: category.trim(),
      services: services || [],
      keywords: keywords || [],
      isActive: isActive !== false,
    };

    const response = await CannedResponse.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!response) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Canned response updated successfully',
      response,
    });

  } catch (error) {
    console.error('Error updating canned response:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete canned response
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const response = await CannedResponse.findByIdAndDelete(id);

    if (!response) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Canned response deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting canned response:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 