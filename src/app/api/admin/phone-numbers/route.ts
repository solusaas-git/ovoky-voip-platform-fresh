import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';
// NumberRateDeck import removed - rate decks are now assigned to users, not phone numbers
import RateDeckAssignment from '@/models/RateDeckAssignment';
import NumberRate from '@/models/NumberRate';
import UserOnboarding from '@/models/UserOnboarding';
import mongoose from 'mongoose';
import { z } from 'zod';
import NumberRateDeck from '@/models/NumberRateDeck';

// TypeScript interfaces for populated documents
interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
  company?: string;
}

interface PopulatedRateDeck {
  _id: string;
  name: string;
  description: string;
  currency: string;
}

interface PopulatedPhoneNumber {
  _id: mongoose.Types.ObjectId;
  number: string;
  country: string;
  provider: string;
  description?: string;
  status: string;
  numberType: string;
  assignedTo?: PopulatedUser;
  // rateDeckId removed - rate decks are now assigned to users, not phone numbers
  createdAt: Date;
  updatedAt: Date;
  assignedAt?: Date;
  unassignedAt?: Date;
  nextBillingDate?: Date;
  lastBilledDate?: Date;
}

interface PhoneNumberQuery {
  $or?: Array<{
    number?: { $regex: string; $options: string };
    country?: { $regex: string; $options: string };
    provider?: { $regex: string; $options: string };
    description?: { $regex: string; $options: string };
  }>;
  status?: string;
  country?: string;
  numberType?: string;
  assignedTo?: mongoose.Types.ObjectId;
  // rateDeckId removed - rate decks are now assigned to users, not phone numbers
}

interface SortObject {
  [key: string]: 1 | -1;
}

// Validation schema for creating phone numbers
const createPhoneNumberSchema = z.object({
  number: z.string().min(1, 'Phone number is required'),
  country: z.string().min(1, 'Country is required'),
  countryCode: z.string().min(1, 'Country code is required'),
  numberType: z.enum(['Geographic/Local', 'Mobile', 'National', 'Toll-free', 'Shared Cost', 'NPV (Verified Numbers)', 'Premium']),
  provider: z.string().min(1, 'Provider is required'),
  backorderOnly: z.boolean().default(false),
  // rateDeckId: z.string().optional(), // Removed: Rate decks are now assigned to users, not phone numbers
  monthlyRate: z.number().min(0).optional(),
  setupFee: z.number().min(0).optional().default(0),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  billingDayOfMonth: z.number().min(1).max(28).default(1),
  description: z.string().max(500).optional(),
  capabilities: z.array(z.enum(['voice', 'sms', 'fax'])).default(['voice']),
  region: z.string().max(100).optional(),
  timeZone: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  // Technical connection parameters
  connectionType: z.enum(['ip_routing', 'credentials']).optional(),
  // For IP routing
  ipAddress: z.string().optional(),
  port: z.number().optional(),
  // For credentials
  login: z.string().optional(),
  password: z.string().optional(),
  domain: z.string().optional(), // Can be IP or domain name
  credentialsPort: z.number().optional(),
});

// GET - List phone numbers with filtering and pagination
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
    const country = searchParams.get('country');
    const numberType = searchParams.get('numberType');
    const assignedTo = searchParams.get('assignedTo');
    // rateDeckId parameter removed - rate decks are now assigned to users, not phone numbers
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    const query: PhoneNumberQuery = {};

    if (search) {
      query.$or = [
        { number: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
        { provider: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (country) {
      query.country = country;
    }

    if (numberType) {
      query.numberType = numberType;
    }

    if (assignedTo) {
      query.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }

    // rateDeckId filter removed - rate decks are now assigned to users, not phone numbers

    // Build sort object
    const sort: SortObject = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [phoneNumbers, total] = await Promise.all([
      PhoneNumber.find(query)
        .populate('assignedTo', 'name email company')
        // .populate('rateDeckId') removed - rate decks are now assigned to users, not phone numbers
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      PhoneNumber.countDocuments(query)
    ]);

    // Get onboarding data for assigned users
    const assignedUserIds = phoneNumbers
      .filter(pn => pn.assignedTo)
      .map(pn => (pn.assignedTo as unknown as PopulatedUser)._id);
    
    const onboardingData = assignedUserIds.length > 0 ? await UserOnboarding.find({
      userId: { $in: assignedUserIds }
    }).lean() : [];

    // Get rate deck assignments for assigned users
    const rateDeckAssignments = assignedUserIds.length > 0 ? await RateDeckAssignment.find({
      userId: { $in: assignedUserIds.map(id => new mongoose.Types.ObjectId(id)) },
      rateDeckType: 'number',
      isActive: true,
    }).lean() : [];

    // Get actual rate deck data for assignments
    const rateDeckIds = rateDeckAssignments.map(assignment => assignment.rateDeckId);
    const rateDecks = rateDeckIds.length > 0 ? await NumberRateDeck.find({
      _id: { $in: rateDeckIds }
    }).lean() : [];

    // Transform the response
    const transformedPhoneNumbers = phoneNumbers.map(phoneNumber => {
      const typedPhoneNumber = phoneNumber as unknown as PopulatedPhoneNumber;
      
      // Get onboarding data for this user
      const userOnboarding = typedPhoneNumber.assignedTo ? 
        onboardingData.find(ob => ob.userId.toString() === typedPhoneNumber.assignedTo!._id.toString()) : null;

      // Get rate deck assignment for this user (if assigned)
      const userRateDeckAssignment = typedPhoneNumber.assignedTo ? 
        rateDeckAssignments.find(assignment => assignment.userId.toString() === typedPhoneNumber.assignedTo!._id.toString()) : null;
      
      // Get the actual rate deck data for this assignment
      const userRateDeck = userRateDeckAssignment ? 
        rateDecks.find(deck => deck._id.toString() === userRateDeckAssignment.rateDeckId.toString()) : null;

      return {
        ...phoneNumber,
        _id: typedPhoneNumber._id.toString(),
        // Use user's assigned rate deck instead of phone number's rateDeckId
        rateDeckId: userRateDeck ? userRateDeck._id.toString() : undefined,
        rateDeck: userRateDeck ? {
          _id: userRateDeck._id.toString(),
          name: userRateDeck.name,
          description: userRateDeck.description,
          currency: userRateDeck.currency,
        } : undefined,
        assignedTo: typedPhoneNumber.assignedTo ? typedPhoneNumber.assignedTo._id.toString() : undefined,
        assignedToUser: typedPhoneNumber.assignedTo ? {
          _id: typedPhoneNumber.assignedTo._id.toString(),
          name: typedPhoneNumber.assignedTo.name,
          email: typedPhoneNumber.assignedTo.email,
          company: userOnboarding?.companyName || typedPhoneNumber.assignedTo.company,
          onboarding: {
            companyName: userOnboarding?.companyName || null,
          },
        } : undefined,
        createdAt: typedPhoneNumber.createdAt.toISOString(),
        updatedAt: typedPhoneNumber.updatedAt.toISOString(),
        assignedAt: typedPhoneNumber.assignedAt?.toISOString(),
        unassignedAt: typedPhoneNumber.unassignedAt?.toISOString(),
        nextBillingDate: typedPhoneNumber.nextBillingDate?.toISOString(),
        lastBilledDate: typedPhoneNumber.lastBilledDate?.toISOString(),
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      phoneNumbers: transformedPhoneNumbers,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch phone numbers' },
      { status: 500 }
    );
  }
}

// POST - Create a new phone number
export async function POST(request: NextRequest) {
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
    
    // Validate the request body
    const validatedData = createPhoneNumberSchema.parse(body);

    // Check if phone number already exists
    const existingNumber = await PhoneNumber.findOne({ number: validatedData.number });
    if (existingNumber) {
      return NextResponse.json(
        { error: 'Phone number already exists' },
        { status: 400 }
      );
    }

    // Note: Rate decks are now assigned to users, not phone numbers directly

    // Calculate next billing date
    let nextBillingDate = null;
    if (validatedData.monthlyRate && validatedData.monthlyRate > 0) {
      const now = new Date();
      nextBillingDate = new Date(now.getFullYear(), now.getMonth() + 1, validatedData.billingDayOfMonth);
      
      // If the billing day has already passed this month, set it for next month
      if (now.getDate() >= validatedData.billingDayOfMonth) {
        nextBillingDate = new Date(now.getFullYear(), now.getMonth() + 2, validatedData.billingDayOfMonth);
      }
    }

    // Create the phone number
    const phoneNumber = new PhoneNumber({
      ...validatedData,
      // rateDeckId is no longer stored on phone numbers
      nextBillingDate,
      createdBy: user.email,
    });

    await phoneNumber.save();

    // Get the created phone number
    const createdPhoneNumber = await PhoneNumber.findById(phoneNumber._id).lean();
    
    const response = {
      ...createdPhoneNumber,
      _id: createdPhoneNumber!._id.toString(),
      // Rate deck information is no longer stored on phone numbers
      rateDeckId: undefined,
      rateDeckName: undefined,
      rateDeck: undefined,
      createdAt: createdPhoneNumber!.createdAt.toISOString(),
      updatedAt: createdPhoneNumber!.updatedAt.toISOString(),
      nextBillingDate: createdPhoneNumber!.nextBillingDate?.toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating phone number:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create phone number' },
      { status: 500 }
    );
  }
} 