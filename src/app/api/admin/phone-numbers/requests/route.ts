import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';
import PhoneNumberRequest from '@/models/PhoneNumberRequest';
import PhoneNumberAssignment from '@/models/PhoneNumberAssignment';
import UserOnboarding from '@/models/UserOnboarding';
import BrandingSettings from '@/models/BrandingSettings';
import { z } from 'zod';
import { generateCancellationNotificationTemplate } from '@/lib/emailTemplates/phoneNumberNotifications';
import { logAndSendEmail } from '@/lib/emailLogger';
import SmtpService from '@/services/SmtpService';

// TypeScript interfaces for populated documents
interface PopulatedPhoneNumber {
  _id: string;
  number: string;
  country: string;
  numberType: string;
  status: string;
  monthlyRate?: number;
  setupFee?: number;
  currency: string;
  capabilities?: string[];
}

interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
  company?: string;
  sippyAccountId?: number;
}

interface PopulatedPhoneNumberRequest {
  _id: string;
  phoneNumberId: PopulatedPhoneNumber;
  userId: PopulatedUser;
  requestNumber: string;
  requestType: string;
  status: string;
  reason: string;
  reviewNotes?: string;
  processingNotes?: string;
  reviewedBy?: string;
  processedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  processedAt?: Date;
  scheduledDate?: Date;
  effectiveDate?: Date;
}

interface RequestQuery {
  $or?: Array<{
    requestNumber?: { $regex: string; $options: string };
    reason?: { $regex: string; $options: string };
    userEmail?: { $regex: string; $options: string };
  }>;
  status?: string;
  requestType?: string;
  priority?: string;
}

interface SortObject {
  [key: string]: 1 | -1;
}

// Validation schema for updating request status
const updateRequestSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reviewNotes: z.string().max(1000).optional(),
  processingNotes: z.string().max(1000).optional(),
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

// Helper function to send cancellation notification emails
const sendCancellationNotification = async (
  status: 'approved' | 'rejected',
  phoneNumberRequest: PopulatedPhoneNumberRequest,
  phoneNumber: PopulatedPhoneNumber,
  requestUser: PopulatedUser,
  reviewedBy: string
) => {
  try {
    // Get branding settings
    let brandingSettings;
    try {
      brandingSettings = await BrandingSettings.findOne();
    } catch (error) {
      console.error('Error fetching branding settings:', error);
      brandingSettings = null;
    }

    // Default branding if none found
    const defaultBranding = {
      companyName: 'Your VoIP Company',
      companySlogan: 'Connecting the world',
      primaryColor: '#3b82f6',
      fontFamily: 'Inter'
    };

    const branding = {
      companyName: brandingSettings?.companyName || defaultBranding.companyName,
      companySlogan: brandingSettings?.companySlogan || defaultBranding.companySlogan,
      primaryColor: brandingSettings?.primaryColor || defaultBranding.primaryColor,
      fontFamily: brandingSettings?.fontFamily || defaultBranding.fontFamily
    };

    // Prepare notification data
    const cancellationData = {
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
        name: requestUser.name || requestUser.email,
        email: requestUser.email
      },
      request: {
        requestId: phoneNumberRequest.requestNumber,
        status: status,
        reason: phoneNumberRequest.reason || '',
        adminNotes: phoneNumberRequest.reviewNotes || '',
        submittedAt: phoneNumberRequest.createdAt.toISOString(),
        reviewedAt: new Date().toISOString(),
        reviewedBy: reviewedBy
      },
      branding
    };

    const emailTemplate = generateCancellationNotificationTemplate(cancellationData);

    // Send the email using logAndSendEmail
    await logAndSendEmail(
      {
        userId: requestUser._id,
        userEmail: requestUser.email,
        userName: requestUser.name || requestUser.email,
        sippyAccountId: requestUser.sippyAccountId,
        notificationType: status === 'approved' ? 'cancellation_approved' : 'cancellation_rejected',
        emailSubject: emailTemplate.subject,
        emailBody: emailTemplate.html
      },
      async () => {
        const smtpService = SmtpService.getInstance();
        const result = await smtpService.sendSupportEmail({
          to: requestUser.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text
        });
        return result as any; // Cast to match expected EmailResult type
      }
    );

    console.log(`📧 Cancellation ${status} notification email sent to ${requestUser.email}`);
  } catch (emailError) {
    console.error(`Failed to send cancellation ${status} notification email:`, emailError);
    // Don't fail the request if email fails
  }
};

// GET - List all phone number requests (admin only)
export async function GET(request: NextRequest) {
  try {
    // Verify the user is authenticated and is an admin
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Connect to the database
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const requestType = searchParams.get('requestType');
    const priority = searchParams.get('priority');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    const query: RequestQuery = {};

    if (search) {
      query.$or = [
        { requestNumber: { $regex: search, $options: 'i' } },
        { reason: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (requestType) {
      query.requestType = requestType;
    }

    if (priority) {
      query.priority = priority;
    }

    // Build sort object
    const sort: SortObject = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [requests, total] = await Promise.all([
      PhoneNumberRequest.find(query)
        .populate('phoneNumberId', 'number country numberType status')
        .populate('userId', 'name email company')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      PhoneNumberRequest.countDocuments(query)
    ]);

    // Get user onboarding data for requests (filter out null userIds)
    const validRequests = requests.filter(req => req.userId && (req.userId as unknown as PopulatedUser)?._id);
    const userIds = validRequests.map(req => (req.userId as unknown as PopulatedUser)._id);
    const userOnboardingData = userIds.length > 0 ? await UserOnboarding.find({
      userId: { $in: userIds }
    }).lean() : [];

    // Transform the response (filter out requests with null userId)
    const transformedRequests = requests
      .filter(req => {
        const typedReq = req as unknown as PopulatedPhoneNumberRequest;
        return typedReq.userId && typedReq.userId._id && typedReq.phoneNumberId && typedReq.phoneNumberId._id;
      })
      .map(req => {
        const typedReq = req as unknown as PopulatedPhoneNumberRequest;
        const userOnboarding = userOnboardingData.find(ob => 
          ob.userId.toString() === typedReq.userId._id.toString()
        );

        return {
          ...req,
          _id: typedReq._id.toString(),
          phoneNumberId: typedReq.phoneNumberId._id.toString(),
          phoneNumber: {
            _id: typedReq.phoneNumberId._id.toString(),
            number: typedReq.phoneNumberId.number,
            country: typedReq.phoneNumberId.country,
            numberType: typedReq.phoneNumberId.numberType,
            status: typedReq.phoneNumberId.status,
          },
          userId: typedReq.userId._id.toString(),
          user: {
            _id: typedReq.userId._id.toString(),
            name: typedReq.userId.name,
            email: typedReq.userId.email,
            company: userOnboarding?.companyName || typedReq.userId.company,
            onboarding: {
              companyName: userOnboarding?.companyName || null,
            },
          },
          reason: getReasonDisplayText(req.reason),
          createdAt: req.createdAt.toISOString(),
          updatedAt: req.updatedAt.toISOString(),
          reviewedAt: req.reviewedAt?.toISOString(),
          processedAt: req.processedAt?.toISOString(),
          scheduledDate: req.scheduledDate?.toISOString(),
          effectiveDate: req.effectiveDate?.toISOString(),
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
    console.error('Error fetching admin phone number requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch phone number requests' },
      { status: 500 }
    );
  }
}

// PUT - Update request status (approve/reject)
export async function PUT(request: NextRequest) {
  try {
    // Verify the user is authenticated and is an admin
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Connect to the database
    await connectToDatabase();

    const body = await request.json();
    const { requestId, ...updateData } = body;
    
    // Validate the request body
    const validatedData = updateRequestSchema.parse(updateData);

    // Find the request
    const phoneNumberRequest = await PhoneNumberRequest.findById(requestId)
      .populate('phoneNumberId')
      .populate('userId');

    if (!phoneNumberRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Check if request is in pending status
    if (phoneNumberRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending requests can be processed' },
        { status: 400 }
      );
    }

    const now = new Date();
    
    if (validatedData.action === 'approve') {
      // Update request status to approved
      await PhoneNumberRequest.findByIdAndUpdate(
        requestId,
        {
          $set: {
            status: 'approved',
            reviewedBy: user.email,
            reviewedAt: now,
            reviewNotes: validatedData.reviewNotes,
          }
        }
      );

      // If it's a cancel request, process the cancellation
      if (phoneNumberRequest.requestType === 'cancel') {
        try {
          const phoneNumber = phoneNumberRequest.phoneNumberId as unknown as PopulatedPhoneNumber;
          
          // Update phone number status
          await PhoneNumber.findByIdAndUpdate(
            phoneNumber._id,
            {
              $set: {
                status: 'available',
                assignedTo: null,
                assignedBy: null,
                assignedAt: null,
                unassignedAt: now,
                unassignedBy: user.email,
                unassignedReason: `Cancelled via request ${phoneNumberRequest.requestNumber}`,
              }
            }
          );

          // End the current assignment
          await PhoneNumberAssignment.findOneAndUpdate(
            {
              phoneNumberId: phoneNumber._id,
              userId: phoneNumberRequest.userId,
              status: 'active'
            },
            {
              $set: {
                status: 'ended',
                unassignedAt: now,
                unassignedBy: user.email,
                unassignedReason: `Cancelled via request ${phoneNumberRequest.requestNumber}`,
                billingEndDate: now,
              }
            }
          );

          // Update request to completed
          await PhoneNumberRequest.findByIdAndUpdate(
            requestId,
            {
              $set: {
                status: 'completed',
                processedBy: user.email,
                processedAt: now,
                processingNotes: validatedData.processingNotes || 'Phone number successfully cancelled and made available',
                effectiveDate: now,
              }
            }
          );

          console.log(`✅ Successfully cancelled phone number ${phoneNumber.number} via request ${phoneNumberRequest.requestNumber}`);

          // Send cancellation notification
          await sendCancellationNotification(
            'approved', 
            phoneNumberRequest as unknown as PopulatedPhoneNumberRequest, 
            phoneNumber as unknown as PopulatedPhoneNumber, 
            phoneNumberRequest.userId as unknown as PopulatedUser, 
            user.email
          );

        } catch (processingError) {
          console.error('Error processing cancellation:', processingError);
          
          // Revert request status to approved but not completed
          await PhoneNumberRequest.findByIdAndUpdate(
            requestId,
            {
              $set: {
                processingNotes: `Error processing cancellation: ${(processingError as Error).message}`,
              }
            }
          );
          
          return NextResponse.json(
            { error: 'Request approved but failed to process cancellation. Please try again.' },
            { status: 500 }
          );
        }
      }

    } else if (validatedData.action === 'reject') {
      // Update request status to rejected
      await PhoneNumberRequest.findByIdAndUpdate(
        requestId,
        {
          $set: {
            status: 'rejected',
            reviewedBy: user.email,
            reviewedAt: now,
            reviewNotes: validatedData.reviewNotes,
          }
        }
      );

      // Send cancellation notification
      await sendCancellationNotification(
        'rejected', 
        phoneNumberRequest as unknown as PopulatedPhoneNumberRequest, 
        phoneNumberRequest.phoneNumberId as unknown as PopulatedPhoneNumber, 
        phoneNumberRequest.userId as unknown as PopulatedUser, 
        user.email
      );
    }

    // Fetch the updated request
    const updatedRequest = await PhoneNumberRequest.findById(requestId)
      .populate('phoneNumberId', 'number country numberType status')
      .populate('userId', 'name email company')
      .lean();

    const typedUpdatedRequest = updatedRequest as unknown as PopulatedPhoneNumberRequest;
    
    const response = {
      ...updatedRequest,
      _id: typedUpdatedRequest._id.toString(),
      phoneNumberId: typedUpdatedRequest.phoneNumberId._id.toString(),
      phoneNumber: {
        _id: typedUpdatedRequest.phoneNumberId._id.toString(),
        number: typedUpdatedRequest.phoneNumberId.number,
        country: typedUpdatedRequest.phoneNumberId.country,
        numberType: typedUpdatedRequest.phoneNumberId.numberType,
        status: typedUpdatedRequest.phoneNumberId.status,
      },
      userId: typedUpdatedRequest.userId._id.toString(),
      user: {
        _id: typedUpdatedRequest.userId._id.toString(),
        name: typedUpdatedRequest.userId.name,
        email: typedUpdatedRequest.userId.email,
        company: typedUpdatedRequest.userId.company,
      },
      reason: getReasonDisplayText(typedUpdatedRequest.reason),
      createdAt: typedUpdatedRequest.createdAt.toISOString(),
      updatedAt: typedUpdatedRequest.updatedAt.toISOString(),
      reviewedAt: typedUpdatedRequest.reviewedAt?.toISOString(),
      processedAt: typedUpdatedRequest.processedAt?.toISOString(),
      scheduledDate: typedUpdatedRequest.scheduledDate?.toISOString(),
      effectiveDate: typedUpdatedRequest.effectiveDate?.toISOString(),
    };

    return NextResponse.json({
      message: `Request ${validatedData.action}d successfully`,
      request: response,
    });

  } catch (error) {
    console.error('Error updating phone number request:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update phone number request' },
      { status: 500 }
    );
  }
} 