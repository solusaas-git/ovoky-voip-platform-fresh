import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import BackorderRequest from '@/models/BackorderRequest';
import PhoneNumber from '@/models/PhoneNumber';
import User from '@/models/User';
import UserOnboarding from '@/models/UserOnboarding';
import mongoose from 'mongoose';
import { z } from 'zod';
import { sendAdminBackorderRequestNotification } from '@/lib/adminNotifications';

// TypeScript interfaces for populated data
interface PopulatedPhoneNumber {
  _id: mongoose.Types.ObjectId;
  number: string;
  country: string;
  countryCode: string;
  numberType: string;
  provider: string;
  monthlyRate?: number;
  setupFee?: number;
  currency: string;
  capabilities: string[];
}

interface PopulatedUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
}

interface PopulatedBackorderRequest {
  _id: mongoose.Types.ObjectId;
  phoneNumberId: PopulatedPhoneNumber;
  userId: PopulatedUser;
  requestNumber: string;
  userEmail: string;
  status: string;
  priority: string;
  reason?: string;
  businessJustification?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface BackorderFilter {
  userId?: mongoose.Types.ObjectId;
  status?: string;
  priority?: string;
  $or?: Array<{
    requestNumber?: { $regex: string; $options: string };
    userEmail?: { $regex: string; $options: string };
    reason?: { $regex: string; $options: string };
    businessJustification?: { $regex: string; $options: string };
  }>;
}

// Validation schema for creating backorder requests
const createBackorderRequestSchema = z.object({
  phoneNumberId: z.string().min(1, 'Phone number ID is required'),
  reason: z.string().max(500, 'Reason cannot exceed 500 characters').optional(),
  businessJustification: z.string().max(1000, 'Business justification cannot exceed 1000 characters').optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

// GET - List backorder requests (with filters and pagination)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;
    
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    // Build filter object
    const filter: BackorderFilter = {};
    
    // Non-admins can only see their own requests
    if (user.role !== 'admin') {
      filter.userId = new mongoose.Types.ObjectId(user.id);
    } else {
      // Admins can filter by userId if specified
      const userId = searchParams.get('userId');
      if (userId) {
        filter.userId = new mongoose.Types.ObjectId(userId);
      }
    }

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (search) {
      filter.$or = [
        { requestNumber: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
        { reason: { $regex: search, $options: 'i' } },
        { businessJustification: { $regex: search, $options: 'i' } },
      ];
    }

    // Get total count
    const total = await BackorderRequest.countDocuments(filter);

    // Get requests with populated data
    const requests = await BackorderRequest.find(filter)
      .populate({
        path: 'phoneNumberId',
        select: 'number country countryCode numberType provider monthlyRate setupFee currency capabilities',
      })
      .populate({
        path: 'userId',
        select: 'name email',
      })
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean() as unknown as PopulatedBackorderRequest[];

    // Get onboarding data for users if needed
    const userIds = requests.map((request: PopulatedBackorderRequest) => request.userId._id);
    const onboardingData = await UserOnboarding.find({ userId: { $in: userIds } }).lean();
    const onboardingMap = new Map(onboardingData.map(ob => [ob.userId.toString(), ob]));

    // Format the response
    const formattedRequests = requests.map((request: PopulatedBackorderRequest) => {
      const onboarding = onboardingMap.get(request.userId._id.toString());
      return {
        ...request,
        _id: request._id.toString(),
        phoneNumberId: request.phoneNumberId._id.toString(),
        userId: request.userId._id.toString(),
        phoneNumber: request.phoneNumberId ? {
          ...request.phoneNumberId,
          _id: request.phoneNumberId._id.toString(),
        } : undefined,
        user: request.userId ? {
          ...request.userId,
          _id: request.userId._id.toString(),
          company: onboarding?.companyName,
          onboarding: onboarding,
        } : undefined,
      };
    });

    return NextResponse.json({
      requests: formattedRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching backorder requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch backorder requests' },
      { status: 500 }
    );
  }
}

// POST - Create a new backorder request
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    
    // Validate the request body
    const validatedData = createBackorderRequestSchema.parse(body);

    // Verify the phone number exists and is backorder-only
    const phoneNumber = await PhoneNumber.findById(validatedData.phoneNumberId);
    
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number not found' },
        { status: 404 }
      );
    }

    if (!phoneNumber.backorderOnly) {
      return NextResponse.json(
        { error: 'This phone number is available for direct purchase, not backorder' },
        { status: 400 }
      );
    }

    // Check if user already has a pending request for this number
    const existingRequest = await BackorderRequest.findOne({
      phoneNumberId: validatedData.phoneNumberId,
      userId: new mongoose.Types.ObjectId(user.id),
      status: { $in: ['pending', 'approved'] },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending or approved backorder request for this phone number' },
        { status: 400 }
      );
    }

    // Create the backorder request
    const backorderRequest = new BackorderRequest({
      phoneNumberId: validatedData.phoneNumberId,
      userId: new mongoose.Types.ObjectId(user.id),
      userEmail: user.email,
      status: 'pending',
      priority: validatedData.priority,
      reason: validatedData.reason,
      businessJustification: validatedData.businessJustification,
      // Set expiration to 30 days from now
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    await backorderRequest.save();

    console.log(`📋 New backorder request created: ${backorderRequest.requestNumber} for number ${phoneNumber.number} by user ${user.email}`);

    // Populate the response data
    const populatedRequest = await BackorderRequest.findById(backorderRequest._id)
      .populate({
        path: 'phoneNumberId',
        select: 'number country countryCode numberType provider monthlyRate setupFee currency capabilities',
      })
      .populate({
        path: 'userId',
        select: 'name email',
      })
      .lean();

    // Get onboarding data for the user
    const onboarding = await UserOnboarding.findOne({ userId: new mongoose.Types.ObjectId(user.id) }).lean();

    // Format the response
    const formattedRequest = {
      ...populatedRequest,
      _id: populatedRequest!._id.toString(),
      phoneNumberId: populatedRequest!.phoneNumberId._id.toString(),
      userId: populatedRequest!.userId._id.toString(),
      phoneNumber: {
        ...populatedRequest!.phoneNumberId,
        _id: populatedRequest!.phoneNumberId._id.toString(),
      },
      user: {
        ...populatedRequest!.userId,
        _id: populatedRequest!.userId._id.toString(),
        company: onboarding?.companyName,
        onboarding: onboarding,
      },
    };

    // Send admin notification
    await sendAdminBackorderRequestNotification({
      phoneNumber: {
        number: phoneNumber.number,
        country: phoneNumber.country,
        numberType: phoneNumber.numberType,
        monthlyRate: phoneNumber.monthlyRate || 0,
        setupFee: phoneNumber.setupFee || 0,
        currency: phoneNumber.currency,
        capabilities: phoneNumber.capabilities || []
      },
      user: {
        name: user.name || user.email,
        email: user.email,
        company: onboarding?.companyName
      },
      request: {
        requestNumber: backorderRequest.requestNumber,
        submittedAt: backorderRequest.createdAt.toISOString(),
        reason: validatedData.reason,
        businessJustification: validatedData.businessJustification
      },
      requestType: 'single'
    });

    return NextResponse.json({
      message: 'Backorder request created successfully',
      request: formattedRequest,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating backorder request:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create backorder request' },
      { status: 500 }
    );
  }
} 