import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import Trunk from '@/models/Trunk';
import UserOnboarding from '@/models/UserOnboarding';
import mongoose from 'mongoose';

// GET - Get a specific trunk (user can only see their own)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify the user is authenticated
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to the database
    await connectToDatabase();

    // Await params before accessing properties
    const { id } = await params;

    // Validate the trunk ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid trunk ID' }, { status: 400 });
    }

    // Find the trunk (only if assigned to this user)
    const trunk = await Trunk.findOne({
      _id: id,
      assignedTo: user.id
    }).lean() as any;

    if (!trunk) {
      return NextResponse.json({ error: 'Trunk not found or access denied' }, { status: 404 });
    }

    // Get user onboarding data
    const userOnboarding = await UserOnboarding.findOne({
      userId: user.id
    }).lean();

    // Transform the response - include password for trunk configuration
    const response = {
      _id: trunk._id.toString(),
      name: trunk.name,
      username: trunk.username,
      password: trunk.password, // Include password for users to configure their PBX
      domain: trunk.domain,
      ipAddress: trunk.ipAddress, // Keep for backward compatibility
      ipAddresses: trunk.ipAddresses || [], // Include unified IP addresses array
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
      // Note: sensitive admin fields like notes are still excluded
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching trunk:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 