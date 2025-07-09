import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import Trunk from '@/models/Trunk';
import UserOnboarding from '@/models/UserOnboarding';
import mongoose from 'mongoose';

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
  ipAddress?: string; // Optional for backward compatibility
  ipAddresses?: string[]; // Unified IP addresses array
  assignedTo?: PopulatedUser;
  createdAt: Date;
  updatedAt: Date;
  assignedAt?: Date;
}

interface TrunkQuery {
  assignedTo: mongoose.Types.ObjectId;
  $or?: Array<{
    name?: { $regex: string; $options: string };
    username?: { $regex: string; $options: string };
    domain?: { $regex: string; $options: string };
    ipAddress?: { $regex: string; $options: string };
    description?: { $regex: string; $options: string };
  }>;
}

interface SortObject {
  [key: string]: 1 | -1;
}

// GET - List user's assigned trunks
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
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query - only show trunks assigned to this user
    const query: TrunkQuery = {
      assignedTo: new mongoose.Types.ObjectId(user.id)
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { domain: { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Build sort object
    const sort: SortObject = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [trunks, total] = await Promise.all([
      Trunk.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Trunk.countDocuments(query)
    ]);

    // Get user onboarding data
    const userOnboarding = await UserOnboarding.findOne({
      userId: user.id
    }).lean();

    // Transform the response - hide sensitive data for users
    const transformedTrunks = trunks.map((trunk: any) => {
      const typedTrunk = trunk as unknown as PopulatedTrunk;

      return {
        _id: typedTrunk._id.toString(),
        name: trunk.name,
        username: trunk.username,
        domain: trunk.domain,
        ipAddress: trunk.ipAddress,
        ipAddresses: trunk.ipAddresses || [],
        port: trunk.port,
        codecs: trunk.codecs,
        description: trunk.description,
        registrationRequired: trunk.registrationRequired,
        authType: trunk.authType,
        assignedAt: trunk.assignedAt,
        createdAt: trunk.createdAt,
        updatedAt: trunk.updatedAt,
        // Include user info
        assignedToUser: {
          _id: user.id,
          name: user.name,
          email: user.email,
          company: userOnboarding?.companyName,
          sippyAccountId: user.sippyAccountId,
          onboarding: userOnboarding ? {
            companyName: userOnboarding.companyName,
          } : undefined,
        },
        // Note: password and sensitive admin fields are excluded for security
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
    console.error('Error fetching user trunks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 