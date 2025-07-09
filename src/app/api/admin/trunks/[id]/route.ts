import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import Trunk from '@/models/Trunk';
import UserOnboarding from '@/models/UserOnboarding';
import mongoose from 'mongoose';
import { z } from 'zod';

// Validation schema for updating trunks
const updateTrunkSchema = z.object({
  name: z.string().min(1, 'Trunk name is required').max(100, 'Name too long').optional(),
  username: z.string().min(1, 'Username is required').max(50, 'Username too long').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password too long').optional(),
  domain: z.string().min(1, 'Domain is required').max(100, 'Domain too long').optional(),
  ipAddress: z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 'Invalid IP address format').optional(),
  ipAddresses: z.array(z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 'Invalid IP address format')).min(1, 'At least one IP address is required').optional(),
  port: z.number().min(1).max(65535).optional(),

  assignedTo: z.string().min(1, 'User assignment is required').optional(),
  codecs: z.array(z.enum(['G729', 'G711a', 'G711u', 'G722', 'iLBC', 'GSM', 'Speex'])).min(1, 'At least one codec is required').optional(),
  description: z.string().max(500).optional(),
  registrationRequired: z.boolean().optional(),
  authType: z.enum(['password', 'ip', 'both']).optional(),
  notes: z.string().max(1000).optional(),
});

// GET - Get a specific trunk
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Await params before accessing properties
    const { id } = await params;

    // Validate the trunk ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid trunk ID' }, { status: 400 });
    }

    // Find the trunk
    const trunk = await Trunk.findById(id)
      .populate('assignedTo', 'name email company sippyAccountId')
      .lean() as any;

    if (!trunk) {
      return NextResponse.json({ error: 'Trunk not found' }, { status: 404 });
    }

    // Get onboarding data for the assigned user
    const userOnboarding = trunk.assignedTo ? await UserOnboarding.findOne({
      userId: trunk.assignedTo._id
    }).lean() : null;

    // Transform the response
    const response = {
      ...trunk,
      _id: trunk._id.toString(),
      assignedTo: trunk.assignedTo ? trunk.assignedTo._id.toString() : undefined,
      assignedToUser: trunk.assignedTo ? {
        _id: trunk.assignedTo._id.toString(),
        name: trunk.assignedTo.name,
        email: trunk.assignedTo.email,
        company: trunk.assignedTo.company,
        sippyAccountId: trunk.assignedTo.sippyAccountId,
        onboarding: userOnboarding ? {
          companyName: userOnboarding.companyName,
        } : undefined,
      } : undefined,
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

// PUT - Update a trunk
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Await params before accessing properties
    const { id } = await params;

    // Validate the trunk ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid trunk ID' }, { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateTrunkSchema.parse(body);

    // Check if trunk exists
    const existingTrunk = await Trunk.findById(id);
    if (!existingTrunk) {
      return NextResponse.json({ error: 'Trunk not found' }, { status: 404 });
    }

    // Check if assigned user exists when assignedTo is being updated
    if (validatedData.assignedTo) {
      const assignedUser = await mongoose.model('User').findById(validatedData.assignedTo);
      if (!assignedUser) {
        return NextResponse.json(
          { error: 'Assigned user not found' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate name if name is being updated
    if (validatedData.name && validatedData.name !== existingTrunk.name) {
      const duplicateName = await Trunk.findOne({ 
        name: validatedData.name,
        _id: { $ne: id }
      });
      
      if (duplicateName) {
        return NextResponse.json(
          { error: 'Trunk with this name already exists' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate username + domain combination if either is being updated
    if (validatedData.username || validatedData.domain) {
      const usernameToCheck = validatedData.username || existingTrunk.username;
      const domainToCheck = validatedData.domain || existingTrunk.domain;
      
      const duplicateCredentials = await Trunk.findOne({
        username: usernameToCheck,
        domain: domainToCheck,
        _id: { $ne: id }
      });

      if (duplicateCredentials) {
        return NextResponse.json(
          { error: 'Trunk with this username and domain combination already exists' },
          { status: 400 }
        );
      }
    }

    // Update the trunk
    const updatedTrunk = await Trunk.findByIdAndUpdate(
      id,
      validatedData,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email company sippyAccountId');

    if (!updatedTrunk) {
      return NextResponse.json({ error: 'Trunk not found' }, { status: 404 });
    }

    // Get onboarding data for the assigned user
    const userOnboarding = updatedTrunk.assignedTo ? await UserOnboarding.findOne({
      userId: (updatedTrunk.assignedTo as any)._id
    }).lean() : null;

    // Transform the response
    const response = {
      ...updatedTrunk.toObject(),
      _id: updatedTrunk._id.toString(),
      assignedTo: updatedTrunk.assignedTo ? (updatedTrunk.assignedTo as any)._id.toString() : undefined,
      assignedToUser: updatedTrunk.assignedTo ? {
        _id: (updatedTrunk.assignedTo as any)._id.toString(),
        name: (updatedTrunk.assignedTo as any).name,
        email: (updatedTrunk.assignedTo as any).email,
        company: (updatedTrunk.assignedTo as any).company,
        sippyAccountId: (updatedTrunk.assignedTo as any).sippyAccountId,
        onboarding: userOnboarding ? {
          companyName: userOnboarding.companyName,
        } : undefined,
      } : undefined,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error updating trunk:', error);
    
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

// DELETE - Delete a trunk (soft delete by setting status to 'deleted')
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Await params before accessing properties
    const { id } = await params;

    // Validate the trunk ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid trunk ID' }, { status: 400 });
    }

    // Find and soft delete the trunk
    const trunk = await Trunk.findByIdAndUpdate(
      id,
      { status: 'deleted' },
      { new: true }
    );

    if (!trunk) {
      return NextResponse.json({ error: 'Trunk not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Trunk deleted successfully',
      id: trunk._id.toString()
    });

  } catch (error) {
    console.error('Error deleting trunk:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 