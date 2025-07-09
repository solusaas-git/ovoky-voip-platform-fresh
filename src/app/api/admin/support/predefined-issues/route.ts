import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import mongoose, { Schema } from 'mongoose';

// Type definitions for predefined issue filters
interface PredefinedIssueFilter {
  service?: string;
  isActive?: boolean;
  $or?: Array<{
    title?: { $regex: string; $options: string };
    description?: { $regex: string; $options: string };
    keywords?: { $in: RegExp[] };
  }>;
}

// Predefined Issue Schema
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

// GET - List predefined issues
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service');
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');

    // Build filter
    const filter: PredefinedIssueFilter = {};
    if (service) filter.service = service;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { keywords: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    if (isActive !== null) filter.isActive = isActive === 'true';

    const issues = await PredefinedIssue.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      issues,
      total: issues.length,
    });

  } catch (error) {
    console.error('Error fetching predefined issues:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create predefined issue
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const issueData = {
      service,
      title: title.trim(),
      description: description.trim(),
      suggestedSolution: suggestedSolution?.trim() || '',
      priority: priority || 'medium',
      keywords: keywords || [],
      isActive: isActive !== false,
      createdBy: user.email,
    };

    const issue = new PredefinedIssue(issueData);
    await issue.save();

    return NextResponse.json({
      message: 'Predefined issue created successfully',
      issue,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating predefined issue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 