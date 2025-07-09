import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import Trunk from '@/models/Trunk';
import UserOnboarding from '@/models/UserOnboarding';
import mongoose from 'mongoose';
import { z } from 'zod';
import { DEFAULT_CODECS } from '@/types/trunk';

// TypeScript interfaces for populated documents
interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
  company?: string;
}

interface PopulatedTrunk {
  _id: mongoose.Types.ObjectId;
  name: string;
  username: string;
  domain: string;
  ipAddress: string;
  assignedTo?: PopulatedUser;
  createdAt: Date;
  updatedAt: Date;
  assignedAt?: Date;
}

interface TrunkQuery {
  $or?: Array<{
    name?: { $regex: string; $options: string };
    username?: { $regex: string; $options: string };
    domain?: { $regex: string; $options: string };
    ipAddress?: { $regex: string; $options: string };
    description?: { $regex: string; $options: string };
  }>;
  assignedTo?: mongoose.Types.ObjectId;
  codecs?: { $in: string[] };
}

interface SortObject {
  [key: string]: 1 | -1;
}

// Validation schema for creating trunks
const createTrunkSchema = z.object({
  name: z.string().min(1, 'Trunk name is required').max(100, 'Name too long'),
  username: z.string().min(1, 'Username is required').max(50, 'Username too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password too long'),
  domain: z.string().min(1, 'Domain is required').max(100, 'Domain too long'),
  ipAddress: z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 'Invalid IP address format').optional(),
  ipAddresses: z.array(z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 'Invalid IP address format')).min(1, 'At least one IP address is required'),
  port: z.number().min(1).max(65535).optional().default(5060),
  assignedTo: z.string().min(1, 'User assignment is required'),
  codecs: z.array(z.enum(['G729', 'G711a', 'G711u', 'G722', 'iLBC', 'GSM', 'Speex'])).min(1, 'At least one codec is required').default(DEFAULT_CODECS),
  description: z.string().max(500).optional(),
  registrationRequired: z.boolean().default(true),
  authType: z.enum(['password', 'ip', 'both']).default('password'),
  notes: z.string().max(1000).optional(),
  maxSessions: z.string().optional(),
  maxCPS: z.string().optional(),
});

// GET - List trunks with filtering and pagination
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
    const assignedTo = searchParams.get('assignedTo');
    const codecs = searchParams.get('codecs')?.split(',').filter(Boolean);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    const query: TrunkQuery = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { domain: { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }



    if (assignedTo) {
      query.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }

    if (codecs && codecs.length > 0) {
      query.codecs = { $in: codecs };
    }

    // Build sort object
    const sort: SortObject = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [trunks, total] = await Promise.all([
      Trunk.find(query)
        .populate('assignedTo', 'name email company sippyAccountId')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Trunk.countDocuments(query)
    ]);

    // Get onboarding data for assigned users
    const assignedUserIds = trunks
      .filter(trunk => trunk.assignedTo)
      .map(trunk => (trunk.assignedTo as unknown as PopulatedUser)._id);
    
    const onboardingData = assignedUserIds.length > 0 ? await UserOnboarding.find({
      userId: { $in: assignedUserIds }
    }).lean() : [];

    // Transform the response
    const transformedTrunks = trunks.map((trunk: any) => {
      const typedTrunk = trunk as unknown as PopulatedTrunk;
      
      // Get onboarding data for this user
      const userOnboarding = typedTrunk.assignedTo ? 
        onboardingData.find(ob => ob.userId.toString() === typedTrunk.assignedTo!._id.toString()) : null;

      return {
        ...trunk,
        _id: typedTrunk._id.toString(),
        assignedTo: typedTrunk.assignedTo ? typedTrunk.assignedTo._id.toString() : undefined,
        assignedToUser: typedTrunk.assignedTo ? {
          _id: typedTrunk.assignedTo._id.toString(),
          name: typedTrunk.assignedTo.name,
          email: typedTrunk.assignedTo.email,
          company: typedTrunk.assignedTo.company,
          sippyAccountId: (typedTrunk.assignedTo as any).sippyAccountId,
          onboarding: userOnboarding ? {
            companyName: userOnboarding.companyName,
          } : undefined,
        } : undefined,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      trunks: transformedTrunks,
      total,
      page,
      limit,
      totalPages,
    });

  } catch (error) {
    console.error('Error fetching trunks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new trunk
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createTrunkSchema.parse(body);

    // Check if assigned user exists
    const assignedUser = await mongoose.model('User').findById(validatedData.assignedTo);
    if (!assignedUser) {
      return NextResponse.json(
        { error: 'Assigned user not found' },
        { status: 400 }
      );
    }

    // Check for duplicate trunk name
    const existingTrunk = await Trunk.findOne({ 
      name: validatedData.name 
    });
    
    if (existingTrunk) {
      return NextResponse.json(
        { error: 'Trunk with this name already exists' },
        { status: 400 }
      );
    }

    // Check for duplicate username + domain combination
    const existingTrunkByCredentials = await Trunk.findOne({
      username: validatedData.username,
      domain: validatedData.domain
    });

    if (existingTrunkByCredentials) {
      return NextResponse.json(
        { error: 'Trunk with this username and domain combination already exists' },
        { status: 400 }
      );
    }

    // Create the trunk
    const trunkData = {
      ...validatedData,
      assignedBy: user.id,
      assignedAt: new Date().toISOString(),
      createdBy: user.id,
    };

    const trunk = new Trunk(trunkData);
    await trunk.save();

    // If capacity fields are provided and user has Sippy account, update it
    if ((validatedData.maxSessions || validatedData.maxCPS) && (assignedUser as any).sippyAccountId) {
      try {
        const { SippyClient } = await import('@/lib/sippyClient');
        const { getSippyApiCredentials } = await import('@/lib/sippyClientConfig');
        
        const credentials = await getSippyApiCredentials();
        if (!credentials) {
          throw new Error('Sippy API not configured');
        }
        
        const sippyClient = new SippyClient(credentials);
        
        const updateData: any = {
          i_account: (assignedUser as any).sippyAccountId,
        };
        
        if (validatedData.maxSessions) {
          if (validatedData.maxSessions.toLowerCase() === 'unlimited') {
            updateData.max_sessions = -1;
          } else {
            const sessionValue = parseInt(validatedData.maxSessions);
            if (!isNaN(sessionValue) && sessionValue > 0) {
              updateData.max_sessions = sessionValue;
            }
          }
        }
        
        if (validatedData.maxCPS) {
          if (validatedData.maxCPS.toLowerCase() !== 'unlimited') {
            const cpsValue = parseFloat(validatedData.maxCPS);
            if (!isNaN(cpsValue) && cpsValue >= 0.1) {
              updateData.max_calls_per_second = cpsValue;
            }
          }
          // For unlimited CPS, we don't send the parameter (omit it)
        }
        
        if (Object.keys(updateData).length > 1) { // More than just i_account
          await sippyClient.updateAccount(updateData);
        }
      } catch (sippyError) {

        // Don't fail trunk creation if Sippy update fails
      }
    }

    // Populate the response
    await trunk.populate('assignedTo', 'name email company');

    // Get onboarding data for the assigned user
    const userOnboarding = await UserOnboarding.findOne({
      userId: validatedData.assignedTo
    }).lean();

    const response = {
      ...trunk.toObject(),
      _id: trunk._id.toString(),
      assignedTo: trunk.assignedTo ? trunk.assignedTo._id.toString() : undefined,
      assignedToUser: trunk.assignedTo ? {
        _id: trunk.assignedTo._id.toString(),
        name: (trunk.assignedTo as any).name,
        email: (trunk.assignedTo as any).email,
        company: (trunk.assignedTo as any).company,
        onboarding: userOnboarding ? {
          companyName: userOnboarding.companyName,
        } : undefined,
      } : undefined,
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Error creating trunk:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 