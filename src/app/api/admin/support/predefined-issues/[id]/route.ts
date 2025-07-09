import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import mongoose, { Schema } from 'mongoose';

// Predefined Issue Schema (same as parent route)
const predefinedIssueSchema = new Schema({
  service: {
    type: String,
    required: true,
    enum: ['outbound_calls', 'inbound_calls', 'did_numbers', 'sms', 'emailing', 'whatsapp_business', 'billing', 'technical', 'other'],
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  suggestedSolution: {
    type: String,
    maxlength: 2000,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  keywords: [{
    type: String,
    trim: true,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
  collection: 'predefined_issues',
});

const PredefinedIssue = mongoose.models.PredefinedIssue || 
  mongoose.model('PredefinedIssue', predefinedIssueSchema);

// PUT - Update predefined issue
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
    const { service, title, description, suggestedSolution, priority, keywords, isActive } = body;

    // Validation
    if (!service || !title || !description) {
      return NextResponse.json(
        { error: 'Service, title, and description are required' },
        { status: 400 }
      );
    }

    const updateData = {
      service,
      title: title.trim(),
      description: description.trim(),
      suggestedSolution: suggestedSolution?.trim() || '',
      priority: priority || 'medium',
      keywords: keywords || [],
      isActive: isActive !== false,
    };

    const issue = await PredefinedIssue.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Predefined issue updated successfully',
      issue,
    });

  } catch (error) {
    console.error('Error updating predefined issue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete predefined issue
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

    const issue = await PredefinedIssue.findByIdAndDelete(id);

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Predefined issue deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting predefined issue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 