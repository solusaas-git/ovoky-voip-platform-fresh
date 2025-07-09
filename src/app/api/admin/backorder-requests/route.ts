import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import BackorderRequest from '@/models/BackorderRequest';
import PhoneNumber from '@/models/PhoneNumber';
import PhoneNumberAssignment from '@/models/PhoneNumberAssignment';
import PhoneNumberBilling from '@/models/PhoneNumberBilling';
import User from '@/models/User';
import UserOnboarding from '@/models/UserOnboarding';
import NumberRate from '@/models/NumberRate';
import RateDeckAssignment from '@/models/RateDeckAssignment';
import BrandingSettings from '@/models/BrandingSettings';
import mongoose from 'mongoose';
import { z } from 'zod';
import { generateBackorderNotificationTemplate } from '@/lib/emailTemplates/phoneNumberNotifications';
import { logAndSendEmail } from '@/lib/emailLogger';
import SmtpService from '@/services/SmtpService';

// Validation schema for updating backorder requests
const updateBackorderRequestSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'completed', 'cancelled', 'expired']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  reviewNotes: z.string().max(1000, 'Review notes cannot exceed 1000 characters').optional(),
  processingNotes: z.string().max(1000, 'Processing notes cannot exceed 1000 characters').optional(),
  expiresAt: z.string().optional(), // ISO date string
});

interface PhoneNumberForRate {
  number: string;
  country: string;
  numberType: string;
}

interface PhoneNumberForAssignment extends PhoneNumberForRate {
  _id: string | mongoose.Types.ObjectId;
  rateDeckId?: string | mongoose.Types.ObjectId;
  setupFee?: number;
  currency: string;
  billingCycle: string;
}

interface UserForAssignment {
  _id?: string | mongoose.Types.ObjectId;
  id?: string;
  name?: string;
  email: string;
}

// Helper function to find matching rate for a phone number (same as purchase logic)
const findMatchingRate = async (phoneNumber: PhoneNumberForRate, rateDeckId: string) => {
  if (!rateDeckId) return null;
  
  // Find all rates for this rate deck
  const rates = await NumberRate.find({
    rateDeckId: new mongoose.Types.ObjectId(rateDeckId),
  }).lean();
  
  // Normalize phone number for prefix matching (remove + and any spaces)
  const normalizedNumber = phoneNumber.number.replace(/^\+/, '').replace(/\s/g, '');
  
  // First, try to find rates matching country and type
  const countryTypeRates = rates.filter(rate => 
    rate.country.toLowerCase() === phoneNumber.country.toLowerCase() && 
    rate.type === phoneNumber.numberType
  );
  
  if (countryTypeRates.length > 0) {
    // Among matching country/type rates, find the one with longest matching prefix
    let bestMatch = null;
    let longestMatch = 0;
    
    for (const rate of countryTypeRates) {
      const normalizedPrefix = rate.prefix.replace(/^\+/, '').replace(/\s/g, '');
      const matches = normalizedNumber.startsWith(normalizedPrefix);
      
      if (matches && normalizedPrefix.length > longestMatch) {
        bestMatch = rate;
        longestMatch = normalizedPrefix.length;
      }
    }
    
    if (bestMatch) {
      return bestMatch;
    }
  }
  
  // Fallback: try prefix matching only
  let bestMatch = null;
  let longestMatch = 0;
  
  for (const rate of rates) {
    const normalizedPrefix = rate.prefix.replace(/^\+/, '').replace(/\s/g, '');
    const matches = normalizedNumber.startsWith(normalizedPrefix);
    
    if (matches && normalizedPrefix.length > longestMatch) {
      bestMatch = rate;
      longestMatch = normalizedPrefix.length;
    }
  }
  
  return bestMatch;
};

// Helper function to get user's assigned rate deck
const getUserAssignedRateDeck = async (userId: string) => {
  try {
    const assignment = await RateDeckAssignment.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      rateDeckType: 'number', // Only number rate decks
      isActive: true
    }).populate('rateDeckId').lean();

    if (assignment && assignment.rateDeckId) {
      return assignment.rateDeckId as any; // Populated rate deck
    }
    return null;
  } catch (error) {
    console.error('Error getting user assigned rate deck:', error);
    return null;
  }
};

// Helper function to find matching rate in a specific rate deck
const findMatchingRateInDeck = async (phoneNumber: PhoneNumberForRate, rateDeckId: string) => {
  if (!rateDeckId) return null;
  
  console.log(`[Rate Matching] Looking for rates for backorder number: ${phoneNumber.number}, country: ${phoneNumber.country}, type: ${phoneNumber.numberType}, rateDeckId: ${rateDeckId}`);
  
  // Find all rates for this rate deck
  const rates = await NumberRate.find({
    rateDeckId: new mongoose.Types.ObjectId(rateDeckId),
  }).lean();
  
  console.log(`[Rate Matching] Found ${rates.length} rates in deck ${rateDeckId}`);
  
  // Normalize phone number for prefix matching (remove + and any spaces)
  const normalizedNumber = phoneNumber.number.replace(/^\+/, '').replace(/\s/g, '');
  console.log(`[Rate Matching] Normalized phone number: ${normalizedNumber} (from ${phoneNumber.number})`);
  
  // First, try to find rates matching country and type
  const countryTypeRates = rates.filter(rate => 
    rate.country.toLowerCase() === phoneNumber.country.toLowerCase() && 
    rate.type === phoneNumber.numberType
  );
  
  console.log(`[Rate Matching] Found ${countryTypeRates.length} rates matching country and type`);
  
  if (countryTypeRates.length > 0) {
    // Among matching country/type rates, find the one with longest matching prefix
    let bestMatch = null;
    let longestMatch = 0;
    
    for (const rate of countryTypeRates) {
      // Normalize rate prefix for comparison (remove + and spaces)
      const normalizedPrefix = rate.prefix.replace(/^\+/, '').replace(/\s/g, '');
      const matches = normalizedNumber.startsWith(normalizedPrefix);
      
      console.log(`[Rate Matching] Checking prefix ${rate.prefix} (normalized: ${normalizedPrefix}) against ${normalizedNumber}: ${matches}`);
      
      if (matches && normalizedPrefix.length > longestMatch) {
        bestMatch = rate;
        longestMatch = normalizedPrefix.length;
      }
    }
    
    if (bestMatch) {
      console.log(`[Rate Matching] Best match: prefix=${bestMatch.prefix}, rate=${bestMatch.rate}, setupFee=${bestMatch.setupFee}`);
      return bestMatch;
    }
  }
  
  // Fallback: try prefix matching only
  console.log(`[Rate Matching] No country/type match, trying prefix-only matching`);
  let bestMatch = null;
  let longestMatch = 0;
  
  for (const rate of rates) {
    // Normalize rate prefix for comparison (remove + and spaces)
    const normalizedPrefix = rate.prefix.replace(/^\+/, '').replace(/\s/g, '');
    const matches = normalizedNumber.startsWith(normalizedPrefix);
    
    if (matches && normalizedPrefix.length > longestMatch) {
      bestMatch = rate;
      longestMatch = normalizedPrefix.length;
    }
  }
  
  if (bestMatch) {
    console.log(`[Rate Matching] Fallback match: prefix=${bestMatch.prefix}, rate=${bestMatch.rate}, country=${bestMatch.country}, type=${bestMatch.type}`);
  } else {
    console.log(`[Rate Matching] No matching rate found for ${phoneNumber.number}`);
  }
  
  return bestMatch;
};

// Helper function to assign phone number to user (same as purchase logic)
const assignPhoneNumberToUser = async (phoneNumber: PhoneNumberForAssignment, user: UserForAssignment, adminEmail: string) => {
  const now = new Date();
  
  // Get user's assigned rate deck
  const userRateDeck = await getUserAssignedRateDeck(user.id || user._id?.toString() || '');
  
  if (!userRateDeck) {
    throw new Error('User does not have an assigned rate deck');
  }
  
  // Find the matching rate for this phone number using user's rate deck
  const rate = await findMatchingRateInDeck(phoneNumber, userRateDeck._id.toString());
  
  if (!rate) {
    throw new Error('No matching rate found for this phone number in user\'s assigned rate deck');
  }

  const monthlyRate = rate.rate;
  const setupFee = rate.setupFee || phoneNumber.setupFee || 0;

  // Calculate next billing date
  const nextBillingDate = new Date(now);
  if (phoneNumber.billingCycle === 'yearly') {
    nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
  } else {
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
  }

  // Update phone number status and assignment
  await PhoneNumber.findByIdAndUpdate(
    phoneNumber._id,
    {
      $set: {
        status: 'assigned',
        assignedTo: new mongoose.Types.ObjectId(user.id || user._id),
        assignedBy: adminEmail,
        assignedAt: now,
        nextBillingDate,
        lastBilledDate: now,
        monthlyRate: monthlyRate,
        setupFee: setupFee,
        backorderOnly: false, // Remove backorder restriction once assigned
        unassignedAt: null,
        unassignedBy: null,
        unassignedReason: null,
      }
    }
  );

  // Create assignment record
  const assignment = new PhoneNumberAssignment({
    phoneNumberId: phoneNumber._id,
    userId: new mongoose.Types.ObjectId(user.id || user._id),
    assignedBy: adminEmail,
    assignedAt: now,
    status: 'active',
    billingStartDate: now,
    monthlyRate: monthlyRate,
    setupFee: setupFee,
    currency: phoneNumber.currency,
    billingCycle: phoneNumber.billingCycle,
  });
  await assignment.save();

  // Create initial billing record if there's a monthly rate
  if (monthlyRate && monthlyRate > 0) {
    const billing = new PhoneNumberBilling({
      phoneNumberId: phoneNumber._id,
      userId: new mongoose.Types.ObjectId(user.id || user._id),
      assignmentId: assignment._id,
      amount: monthlyRate,
      currency: phoneNumber.currency,
      billingDate: now,
      billingPeriodStart: now,
      billingPeriodEnd: new Date(nextBillingDate.getTime() - 24 * 60 * 60 * 1000),
      description: `Monthly charge for ${phoneNumber.number}`,
      transactionType: 'monthly_fee',
      status: 'pending',
    });
    await billing.save();
  }

  // Create setup fee billing if applicable
  if (setupFee && setupFee > 0) {
    const setupBilling = new PhoneNumberBilling({
      phoneNumberId: phoneNumber._id,
      userId: new mongoose.Types.ObjectId(user.id || user._id),
      assignmentId: assignment._id,
      amount: setupFee,
      currency: phoneNumber.currency,
      billingDate: now,
      billingPeriodStart: now,
      billingPeriodEnd: now,
      description: `Setup fee for ${phoneNumber.number}`,
      transactionType: 'setup_fee',
      status: 'pending',
    });
    await setupBilling.save();
  }

  return { monthlyRate, setupFee, assignment };
};

// Helper function to send backorder notification emails
interface BackorderRequestData {
  requestNumber: string;
  reason?: string;
  reviewNotes?: string;
  createdAt: Date;
  _id: mongoose.Types.ObjectId;
}

interface PhoneNumberData {
  number: string;
  country: string;
  numberType: string;
  monthlyRate?: number;
  setupFee?: number;
  currency: string;
  capabilities?: string[];
}

interface RequestUserData {
  _id: mongoose.Types.ObjectId;
  name?: string;
  email: string;
  sippyAccountId?: string | number;
}

const sendBackorderNotification = async (
  status: 'approved' | 'rejected',
  backorderRequest: BackorderRequestData,
  phoneNumber: PhoneNumberData,
  requestUser: RequestUserData,
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
    const backorderData = {
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
        requestNumber: backorderRequest.requestNumber,
        status: status,
        reason: backorderRequest.reason || '',
        reviewNotes: backorderRequest.reviewNotes || '',
        submittedAt: backorderRequest.createdAt.toISOString(),
        reviewedAt: new Date().toISOString(),
        reviewedBy: reviewedBy
      },
      branding
    };

    const emailTemplate = generateBackorderNotificationTemplate(backorderData);

    // Send the email using logAndSendEmail
    await logAndSendEmail(
      {
        userId: requestUser._id.toString(),
        userEmail: requestUser.email,
        userName: requestUser.name || requestUser.email,
        sippyAccountId: requestUser.sippyAccountId ? Number(requestUser.sippyAccountId) : undefined,
        notificationType: status === 'approved' ? 'backorder_approved' : 'backorder_rejected',
        emailSubject: emailTemplate.subject,
        emailBody: emailTemplate.html,
        alertData: {
          alertType: 'backorder_status',
          value: 1,
          threshold: 0,
          severity: 'info',
          phoneNumber: phoneNumber.number,
          requestNumber: backorderRequest.requestNumber,
          status: status,
          reviewedBy: reviewedBy
        }
      },
      async () => {
        const smtpService = SmtpService.getInstance();
        return await smtpService.sendSupportEmail({
          to: requestUser.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text
        }) as { success: boolean; error?: string; messageId?: string };
      }
    );

    console.log(`📧 Backorder ${status} notification email sent to ${requestUser.email}`);
  } catch (emailError) {
    console.error(`Failed to send backorder ${status} notification email:`, emailError);
    // Don't fail the request if email fails
  }
};

// GET - List all backorder requests (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;
    
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const userId = searchParams.get('userId');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    // Build filter object
    const filter: Record<string, unknown> = {};

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (userId) {
      filter.userId = new mongoose.Types.ObjectId(userId);
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
      .lean();

    // Get onboarding data for users if needed
    interface PopulatedRequest {
      _id: mongoose.Types.ObjectId;
      userId: { _id: mongoose.Types.ObjectId };
      phoneNumberId: { _id: mongoose.Types.ObjectId };
      requestNumber: string;
      status: string;
      priority: string;
      reason?: string;
      businessJustification?: string;
      createdAt: Date;
      updatedAt: Date;
    }
    
    // Filter out requests with null userId and get valid userIds
    const validRequests = (requests as PopulatedRequest[]).filter(request => request.userId && request.userId._id);
    const userIds = validRequests.map((request) => request.userId._id);
    const onboardingData = userIds.length > 0 ? await UserOnboarding.find({ userId: { $in: userIds } }).lean() : [];
    const onboardingMap = new Map(onboardingData.map(ob => [ob.userId.toString(), ob]));

    // Format the response (filter out requests with null userId)
    const formattedRequests = (requests as PopulatedRequest[])
      .filter(request => request.userId && request.userId._id && request.phoneNumberId && request.phoneNumberId._id)
      .map((request) => {
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

// PUT - Update backorder request status (admin only)
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { requestId, ...updateData } = body;
    
    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Validate the update data
    const validatedData = updateBackorderRequestSchema.parse(updateData);

    // Find the backorder request
    const backorderRequest = await BackorderRequest.findById(requestId);
    
    if (!backorderRequest) {
      return NextResponse.json(
        { error: 'Backorder request not found' },
        { status: 404 }
      );
    }

    // Prepare update object
    const updateObj: Record<string, unknown> = {};
    
    if (validatedData.status) {
      updateObj.status = validatedData.status;
    }
    
    if (validatedData.priority) {
      updateObj.priority = validatedData.priority;
    }
    
    if (validatedData.reviewNotes !== undefined) {
      updateObj.reviewNotes = validatedData.reviewNotes;
      updateObj.reviewedBy = user.email;
      updateObj.reviewedAt = new Date();
    }
    
    if (validatedData.processingNotes !== undefined) {
      updateObj.processingNotes = validatedData.processingNotes;
      updateObj.processedBy = user.email;
      updateObj.processedAt = new Date();
    }
    
    if (validatedData.expiresAt) {
      updateObj.expiresAt = new Date(validatedData.expiresAt);
    }

    // Handle status-specific logic
    if (validatedData.status === 'approved') {
      // When approving, automatically assign the phone number to the user
      const phoneNumber = await PhoneNumber.findById(backorderRequest.phoneNumberId);
      const requestUser = await User.findById(backorderRequest.userId);
      
      if (!phoneNumber || !requestUser) {
        return NextResponse.json(
          { error: 'Phone number or user not found' },
          { status: 404 }
        );
      }

      try {
        const assignmentResult = await assignPhoneNumberToUser(phoneNumber, requestUser, user.email);
        
        updateObj.reviewedBy = user.email;
        updateObj.reviewedAt = new Date();
        updateObj.processedBy = user.email;
        updateObj.processedAt = new Date();
        
        console.log(`✅ Backorder request ${backorderRequest.requestNumber} approved and completed - ${phoneNumber.number} assigned to ${requestUser.email}`);

        // Send approval notification email with correct rates from user's assigned rate deck
        const phoneNumberWithCorrectRates = {
          ...phoneNumber,
          monthlyRate: assignmentResult.monthlyRate,
          setupFee: assignmentResult.setupFee
        };
        await sendBackorderNotification('approved', backorderRequest, phoneNumberWithCorrectRates, requestUser, user.email);
      } catch (assignmentError) {
        console.error('Error assigning phone number:', assignmentError);
        return NextResponse.json(
          { error: `Failed to assign phone number: ${assignmentError instanceof Error ? assignmentError.message : 'Unknown error'}` },
          { status: 400 }
        );
      }
    } else if (validatedData.status === 'completed') {
      // Legacy path - in case any existing approved requests need to be completed
      const phoneNumber = await PhoneNumber.findById(backorderRequest.phoneNumberId);
      const requestUser = await User.findById(backorderRequest.userId);
      
      if (!phoneNumber || !requestUser) {
        return NextResponse.json(
          { error: 'Phone number or user not found' },
          { status: 404 }
        );
      }

      try {
        const assignmentResult = await assignPhoneNumberToUser(phoneNumber, requestUser, user.email);
        
        updateObj.processedBy = user.email;
        updateObj.processedAt = new Date();
        
        console.log(`✅ Backorder request ${backorderRequest.requestNumber} completed - ${phoneNumber.number} assigned to ${requestUser.email}`);

        // Send approval notification email for completed requests with correct rates
        const phoneNumberWithCorrectRates = {
          ...phoneNumber,
          monthlyRate: assignmentResult.monthlyRate,
          setupFee: assignmentResult.setupFee
        };
        await sendBackorderNotification('approved', backorderRequest, phoneNumberWithCorrectRates, requestUser, user.email);
      } catch (assignmentError) {
        console.error('Error assigning phone number:', assignmentError);
        return NextResponse.json(
          { error: `Failed to assign phone number: ${assignmentError instanceof Error ? assignmentError.message : 'Unknown error'}` },
          { status: 400 }
        );
      }
    } else if (validatedData.status === 'rejected') {
      updateObj.reviewedBy = user.email;
      updateObj.reviewedAt = new Date();

      // Send rejection notification email
      const phoneNumber = await PhoneNumber.findById(backorderRequest.phoneNumberId);
      const requestUser = await User.findById(backorderRequest.userId);
      
      if (phoneNumber && requestUser) {
        await sendBackorderNotification('rejected', backorderRequest, phoneNumber, requestUser, user.email);
      }
    }

    // Update the request
    const updatedRequest = await BackorderRequest.findByIdAndUpdate(
      requestId,
      { $set: updateObj },
      { new: true }
    ).populate({
      path: 'phoneNumberId',
      select: 'number country countryCode numberType provider monthlyRate setupFee currency capabilities',
    }).populate({
      path: 'userId',
      select: 'name email',
    });

    if (!updatedRequest) {
      return NextResponse.json(
        { error: 'Failed to update backorder request' },
        { status: 500 }
      );
    }

    // Get onboarding data for users if needed
    const userIds = [updatedRequest.userId._id];
    const onboardingData = await UserOnboarding.find({ userId: { $in: userIds } }).lean();
    const onboardingMap = new Map(onboardingData.map(ob => [ob.userId.toString(), ob]));

    // Format the response
    const formattedRequest = {
      ...updatedRequest.toObject(),
      _id: updatedRequest._id.toString(),
      phoneNumberId: updatedRequest.phoneNumberId._id.toString(),
      userId: updatedRequest.userId._id.toString(),
      phoneNumber: {
        ...(updatedRequest.phoneNumberId as unknown as { toObject(): any }).toObject(),
        _id: (updatedRequest.phoneNumberId as unknown as { _id: { toString(): string } })._id.toString(),
      },
      user: {
        ...(updatedRequest.userId as unknown as { toObject(): any }).toObject(),
        _id: (updatedRequest.userId as unknown as { _id: { toString(): string } })._id.toString(),
        company: onboardingMap.get((updatedRequest.userId as unknown as { _id: { toString(): string } })._id.toString())?.companyName,
        onboarding: onboardingMap.get((updatedRequest.userId as unknown as { _id: { toString(): string } })._id.toString()),
      },
    };

    return NextResponse.json({
      message: 'Backorder request updated successfully',
      request: formattedRequest,
    });

  } catch (error) {
    console.error('Error updating backorder request:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update backorder request' },
      { status: 500 }
    );
  }
} 