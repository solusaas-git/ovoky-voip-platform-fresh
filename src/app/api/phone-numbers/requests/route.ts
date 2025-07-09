import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';
import PhoneNumberRequest from '@/models/PhoneNumberRequest';
import mongoose from 'mongoose';
import { z } from 'zod';
import { sendAdminCancellationRequestNotification } from '@/lib/adminNotifications';
import UserOnboarding from '@/models/UserOnboarding';

// Type definitions for populated documents
interface PopulatedPhoneNumber {
  _id: mongoose.Types.ObjectId;
  number: string;
  country: string;
  numberType: string;
  status: string;
}

interface PopulatedPhoneNumberRequest {
  _id: mongoose.Types.ObjectId;
  phoneNumberId: PopulatedPhoneNumber;
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  requestType: string;
  reason: string;
  description?: string;
  status: string;
  priority: string;
  requestNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  processedAt?: Date;
  scheduledDate?: Date;
  effectiveDate?: Date;
}

// Type definitions for query parameters
interface RequestQuery {
  userId: mongoose.Types.ObjectId;
  status?: string;
  requestType?: string;
  $or?: Array<{
    requestNumber?: { $regex: string; $options: string };
    reason?: { $regex: string; $options: string };
    description?: { $regex: string; $options: string };
  }>;
}

interface SortObject {
  [key: string]: 1 | -1;
}

// Validation schema for creating phone number requests
const createRequestSchema = z.object({
  phoneNumberId: z.string().min(1, 'Phone number ID is required'),
  requestType: z.enum(['cancel', 'transfer', 'suspend', 'modify']),
  reason: z.string().min(1, 'Reason is required').max(200, 'Reason cannot exceed 200 characters'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  scheduledDate: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

// Helper function to convert reason codes to user-friendly text
const getReasonDisplayText = (reason: string) => {
  switch (reason) {
    case 'no_longer_needed': return 'No longer needed';
    case 'cost_reduction': return 'Cost reduction';
    case 'service_issues': return 'Service issues';
    case 'business_closure': return 'Business closure';
    case 'other': return 'Other';
    default: return reason;
  }
};

// GET - List user's phone number requests
export async function GET(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to the database
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const requestType = searchParams.get('requestType');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query for user's requests
    const query: RequestQuery = {
      userId: new mongoose.Types.ObjectId(user.id),
    };

    if (search) {
      query.$or = [
        { requestNumber: { $regex: search, $options: 'i' } },
        { reason: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (requestType) {
      query.requestType = requestType;
    }

    // Build sort object
    const sort: SortObject = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [requests, total] = await Promise.all([
      PhoneNumberRequest.find(query)
        .populate('phoneNumberId', 'number country numberType status')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      PhoneNumberRequest.countDocuments(query)
    ]);

    // Transform the response
    const transformedRequests = requests.map(req => {
      const populatedReq = req as unknown as PopulatedPhoneNumberRequest;
      return {
        ...populatedReq,
        _id: populatedReq._id.toString(),
        phoneNumberId: populatedReq.phoneNumberId._id.toString(),
        phoneNumber: {
          _id: populatedReq.phoneNumberId._id.toString(),
          number: populatedReq.phoneNumberId.number,
          country: populatedReq.phoneNumberId.country,
          numberType: populatedReq.phoneNumberId.numberType,
          status: populatedReq.phoneNumberId.status,
        },
        userId: populatedReq.userId.toString(),
        reason: getReasonDisplayText(populatedReq.reason),
        createdAt: populatedReq.createdAt.toISOString(),
        updatedAt: populatedReq.updatedAt.toISOString(),
        reviewedAt: populatedReq.reviewedAt?.toISOString(),
        processedAt: populatedReq.processedAt?.toISOString(),
        scheduledDate: populatedReq.scheduledDate?.toISOString(),
        effectiveDate: populatedReq.effectiveDate?.toISOString(),
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      requests: transformedRequests,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching phone number requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch phone number requests' },
      { status: 500 }
    );
  }
}

// POST - Create a new phone number request
export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to the database
    await connectToDatabase();

    const body = await request.json();
    
    // Validate the request body
    const validatedData = createRequestSchema.parse(body);

    // Find the phone number and verify it belongs to the user
    const phoneNumber = await PhoneNumber.findOne({
      _id: new mongoose.Types.ObjectId(validatedData.phoneNumberId),
      assignedTo: new mongoose.Types.ObjectId(user.id),
      status: 'assigned',
    });

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number not found or not assigned to you' },
        { status: 404 }
      );
    }

    // Check if there's already a pending request for this phone number
    const existingRequest = await PhoneNumberRequest.findOne({
      phoneNumberId: new mongoose.Types.ObjectId(validatedData.phoneNumberId),
      userId: new mongoose.Types.ObjectId(user.id),
      status: { $in: ['pending', 'approved'] },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: `There is already a ${existingRequest.status} ${existingRequest.requestType} request for this phone number` },
        { status: 400 }
      );
    }

    // Parse scheduled date if provided
    const scheduledDate = validatedData.scheduledDate ? 
      new Date(validatedData.scheduledDate) : 
      undefined;

    // Create the request
    const phoneNumberRequest = new PhoneNumberRequest({
      phoneNumberId: new mongoose.Types.ObjectId(validatedData.phoneNumberId),
      userId: new mongoose.Types.ObjectId(user.id),
      userEmail: user.email,
      requestType: validatedData.requestType,
      reason: validatedData.reason,
      description: validatedData.description,
      scheduledDate,
      priority: validatedData.priority,
    });

    await phoneNumberRequest.save();

    // Populate the response
    const populatedRequest = await PhoneNumberRequest.findById(phoneNumberRequest._id)
      .populate('phoneNumberId', 'number country numberType status')
      .lean();

    const populatedReq = populatedRequest as unknown as PopulatedPhoneNumberRequest;
    const response = {
      ...populatedReq,
      _id: populatedReq._id.toString(),
      phoneNumberId: populatedReq.phoneNumberId._id.toString(),
      phoneNumber: {
        _id: populatedReq.phoneNumberId._id.toString(),
        number: populatedReq.phoneNumberId.number,
        country: populatedReq.phoneNumberId.country,
        numberType: populatedReq.phoneNumberId.numberType,
        status: populatedReq.phoneNumberId.status,
      },
      userId: populatedReq.userId.toString(),
      createdAt: populatedReq.createdAt.toISOString(),
      updatedAt: populatedReq.updatedAt.toISOString(),
      scheduledDate: populatedReq.scheduledDate?.toISOString(),
    };

    // Send admin notification if this is a cancellation request
    if (validatedData.requestType === 'cancel') {
      try {
        // Get user's company information from onboarding data
        let userCompany;
        try {
          const userOnboarding = await UserOnboarding.findOne({ userId: new mongoose.Types.ObjectId(user.id) }).lean();
          userCompany = userOnboarding?.companyName;
        } catch (error) {
          console.error('Error fetching user onboarding data:', error);
        }

        await sendAdminCancellationRequestNotification({
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
            company: userCompany
          },
          request: {
            requestId: phoneNumberRequest.requestNumber,
            submittedAt: phoneNumberRequest.createdAt.toISOString(),
            reason: validatedData.reason,
            businessJustification: validatedData.description
          }
        });
      } catch (emailError) {
        console.error('Failed to send admin cancellation notification:', emailError);
        // Don't fail the request if admin email fails
      }
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating phone number request:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create phone number request' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel/withdraw a pending phone number request
export async function DELETE(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to the database
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Find the request and verify it belongs to the user
    const phoneNumberRequest = await PhoneNumberRequest.findOne({
      _id: new mongoose.Types.ObjectId(requestId),
      userId: new mongoose.Types.ObjectId(user.id),
    });

    if (!phoneNumberRequest) {
      return NextResponse.json(
        { error: 'Request not found or does not belong to you' },
        { status: 404 }
      );
    }

    // Check if request can be cancelled (only pending requests)
    if (phoneNumberRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot cancel a ${phoneNumberRequest.status} request. Only pending requests can be cancelled.` },
        { status: 400 }
      );
    }

    // Update request status to cancelled
    await PhoneNumberRequest.findByIdAndUpdate(
      requestId,
      {
        $set: {
          status: 'cancelled',
          processedAt: new Date(),
          processingNotes: 'Cancelled by user',
        }
      }
    );

    return NextResponse.json({
      message: 'Cancellation request withdrawn successfully',
      requestNumber: phoneNumberRequest.requestNumber,
    });

  } catch (error) {
    console.error('Error cancelling phone number request:', error);
    return NextResponse.json(
      { error: 'Failed to cancel request' },
      { status: 500 }
    );
  }
} 