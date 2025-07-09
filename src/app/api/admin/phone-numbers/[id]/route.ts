import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';
import PhoneNumberAssignment from '@/models/PhoneNumberAssignment';
import PhoneNumberBilling from '@/models/PhoneNumberBilling';
// NumberRateDeck import removed - rate decks are now assigned to users, not phone numbers
import mongoose from 'mongoose';
import { z } from 'zod';
import UserOnboarding from '@/models/UserOnboarding';

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
  status: string;
  assignedTo?: PopulatedUser;
  // rateDeckId removed - rate decks are now assigned to users, not phone numbers
  monthlyRate?: number;
  setupFee?: number;
  billingDayOfMonth?: number;
  createdAt: Date;
  updatedAt: Date;
  assignedAt?: Date;
  unassignedAt?: Date;
  nextBillingDate?: Date;
  lastBilledDate?: Date;
}

interface PopulatedAssignment {
  _id: mongoose.Types.ObjectId;
  phoneNumberId: mongoose.Types.ObjectId;
  userId: PopulatedUser | null;
  status: string;
  assignedAt: Date;
  unassignedAt?: Date;
  billingStartDate: Date;
  billingEndDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface UpdateData {
  [key: string]: unknown;
  // rateDeckId removed - rate decks are now assigned to users, not phone numbers
  monthlyRate?: number;
  billingDayOfMonth?: number;
  nextBillingDate?: Date | null;
}

// Validation schema for updating phone numbers
const updatePhoneNumberSchema = z.object({
  // Core phone number fields (all updatable)
  number: z.string().optional(),
  country: z.string().optional(),
  countryCode: z.string().optional(),
  numberType: z.string().optional(),
  currency: z.string().optional(),
  
  // Additional updatable fields
  provider: z.string().min(1).optional(),
  status: z.enum(['available', 'assigned', 'reserved', 'suspended', 'cancelled']).optional(),
  backorderOnly: z.boolean().optional(),
  rateDeckId: z.string().optional(),
  monthlyRate: z.number().min(0).optional(),
  setupFee: z.number().min(0).optional(),
  billingCycle: z.enum(['monthly', 'yearly']).optional(),
  billingDayOfMonth: z.number().min(1).max(28).optional(),
  description: z.string().max(500).optional(),
  capabilities: z.array(z.enum(['voice', 'sms', 'fax', 'data'])).optional(),
  region: z.string().max(100).optional(),
  timeZone: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  // Technical connection parameters
  connectionType: z.enum(['none', 'ip_routing', 'credentials']).optional(),
  // For IP routing
  ipAddress: z.string().optional(),
  port: z.number().optional(),
  // For credentials
  login: z.string().optional(),
  password: z.string().optional(),
  domain: z.string().optional(), // Can be IP or domain name
  credentialsPort: z.number().optional(),
});

// GET - Get phone number details
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

    const { id } = await params;
    
    // Connect to the database
    await connectToDatabase();

    // Find the phone number
    const phoneNumber = await PhoneNumber.findById(id)
      .populate('assignedTo', 'name email company')
      .lean();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    // Get assignment history
    const assignmentHistory = await PhoneNumberAssignment.find({
      phoneNumberId: new mongoose.Types.ObjectId(id)
    })
      .populate('userId', 'name email company')
      .sort({ assignedAt: -1 })
      .lean();

    // Debug: Log assignment history for troubleshooting
    console.log(`📋 Phone number ${phoneNumber.number} has ${assignmentHistory.length} assignment records:`);
    assignmentHistory.forEach((assignment, index) => {
      const typedAssignment = assignment as unknown as PopulatedAssignment;
      const userEmail = typedAssignment.userId ? typedAssignment.userId.email : 'Unknown User';
      console.log(`   ${index + 1}. ID: ${assignment._id}, Status: ${assignment.status}, User: ${userEmail}, Assigned: ${assignment.assignedAt}, Unassigned: ${assignment.unassignedAt || 'N/A'}`);
    });

    // Get onboarding data for current assigned user (if any)
    const typedPhoneNumber = phoneNumber as unknown as PopulatedPhoneNumber;
    const currentUserOnboarding = typedPhoneNumber.assignedTo ? await UserOnboarding.findOne({
      userId: typedPhoneNumber.assignedTo._id
    }).lean() : null;

    // Get onboarding data for users in assignment history
    const assignmentUserIds = assignmentHistory
      .map(assignment => (assignment.userId as unknown as PopulatedUser))
      .filter(user => user && user._id)
      .map(user => user._id);
    const assignmentOnboardingData = assignmentUserIds.length > 0 ? await UserOnboarding.find({
      userId: { $in: assignmentUserIds }
    }).lean() : [];

    // Get current assignment billing info (for assigned numbers only)
    let currentAssignmentBilling = null;
    if (typedPhoneNumber.assignedTo && assignmentHistory.length > 0) {
      const currentAssignment = assignmentHistory.find(assignment => 
        assignment.status === 'active'
      );
      if (currentAssignment) {
        currentAssignmentBilling = {
          monthlyRate: currentAssignment.monthlyRate,
          setupFee: currentAssignment.setupFee,
          currency: currentAssignment.currency,
        };
      }
    }

    // Transform the response
    const response = {
      ...phoneNumber,
      _id: typedPhoneNumber._id.toString(),
      // rateDeckId and rateDeck removed - rate decks are now assigned to users, not phone numbers
      assignedTo: typedPhoneNumber.assignedTo ? typedPhoneNumber.assignedTo._id.toString() : undefined,
      assignedToUser: typedPhoneNumber.assignedTo ? {
        _id: typedPhoneNumber.assignedTo._id.toString(),
        name: typedPhoneNumber.assignedTo.name,
        email: typedPhoneNumber.assignedTo.email,
        company: currentUserOnboarding?.companyName || typedPhoneNumber.assignedTo.company,
        onboarding: {
          companyName: currentUserOnboarding?.companyName || null,
        },
      } : undefined,
      // Current assignment billing information
      currentBilling: currentAssignmentBilling,
      assignmentHistory: assignmentHistory.map(assignment => {
        const typedAssignment = assignment as unknown as PopulatedAssignment;
        
        // Get onboarding data for this assignment's user (if user exists)
        const userOnboarding = typedAssignment.userId ? assignmentOnboardingData.find(ob => 
          ob.userId.toString() === typedAssignment.userId!._id.toString()
        ) : null;

        return {
          ...assignment,
          _id: typedAssignment._id.toString(),
          phoneNumberId: typedAssignment.phoneNumberId.toString(),
          userId: typedAssignment.userId ? typedAssignment.userId._id.toString() : null,
          status: typedAssignment.status,
          user: typedAssignment.userId ? {
            _id: typedAssignment.userId._id.toString(),
            name: typedAssignment.userId.name,
            email: typedAssignment.userId.email,
            company: userOnboarding?.companyName || typedAssignment.userId.company,
            onboarding: {
              companyName: userOnboarding?.companyName || null,
            },
          } : null,
          assignedAt: typedAssignment.assignedAt.toISOString(),
          unassignedAt: typedAssignment.unassignedAt?.toISOString(),
          billingStartDate: typedAssignment.billingStartDate.toISOString(),
          billingEndDate: typedAssignment.billingEndDate?.toISOString(),
          createdAt: typedAssignment.createdAt.toISOString(),
          updatedAt: typedAssignment.updatedAt.toISOString(),
        };
      }),
      createdAt: phoneNumber.createdAt.toISOString(),
      updatedAt: phoneNumber.updatedAt.toISOString(),
      assignedAt: phoneNumber.assignedAt?.toISOString(),
      unassignedAt: phoneNumber.unassignedAt?.toISOString(),
      nextBillingDate: phoneNumber.nextBillingDate?.toISOString(),
      lastBilledDate: phoneNumber.lastBilledDate?.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching phone number:', error);
    return NextResponse.json(
      { error: 'Failed to fetch phone number' },
      { status: 500 }
    );
  }
}

// PUT - Update phone number
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

    const { id } = await params;
    const body = await request.json();
    
    // Validate the request body
    const validatedData = updatePhoneNumberSchema.parse(body);

    // Connect to the database
    await connectToDatabase();

    // Find the phone number
    const phoneNumber = await PhoneNumber.findById(id);
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    // Rate deck validation removed - rate decks are now assigned to users, not phone numbers

    // Update billing date if monthly rate or billing day changes
    const updateData: UpdateData = { ...validatedData };
    if (
      (validatedData.monthlyRate !== undefined && validatedData.monthlyRate !== phoneNumber.monthlyRate) ||
      (validatedData.billingDayOfMonth !== undefined && validatedData.billingDayOfMonth !== phoneNumber.billingDayOfMonth)
    ) {
      const monthlyRate = validatedData.monthlyRate !== undefined ? validatedData.monthlyRate : phoneNumber.monthlyRate;
      const billingDay = validatedData.billingDayOfMonth !== undefined ? validatedData.billingDayOfMonth : phoneNumber.billingDayOfMonth;
      
      if (monthlyRate && monthlyRate > 0) {
        const now = new Date();
        let nextBillingDate = new Date(now.getFullYear(), now.getMonth() + 1, billingDay);
        
        // If the billing day has already passed this month, set it for next month
        if (now.getDate() >= billingDay) {
          nextBillingDate = new Date(now.getFullYear(), now.getMonth() + 2, billingDay);
        }
        
        updateData.nextBillingDate = nextBillingDate;
      } else {
        updateData.nextBillingDate = null;
      }
    }

    // rateDeckId conversion removed - rate decks are now assigned to users, not phone numbers

    // Update the phone number
    const updatedPhoneNumber = await PhoneNumber.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'name email company')
      // .populate('rateDeckId') removed - rate decks are now assigned to users, not phone numbers
      .lean();

    const typedUpdatedPhoneNumber = updatedPhoneNumber as unknown as PopulatedPhoneNumber;
    
    // Transform the response
    const response = {
      ...updatedPhoneNumber,
      _id: typedUpdatedPhoneNumber._id.toString(),
      // rateDeckId and rateDeckName removed - rate decks are now assigned to users, not phone numbers
      assignedTo: typedUpdatedPhoneNumber.assignedTo ? typedUpdatedPhoneNumber.assignedTo._id.toString() : undefined,
      assignedToUser: typedUpdatedPhoneNumber.assignedTo ? {
        _id: typedUpdatedPhoneNumber.assignedTo._id.toString(),
        name: typedUpdatedPhoneNumber.assignedTo.name,
        email: typedUpdatedPhoneNumber.assignedTo.email,
        company: typedUpdatedPhoneNumber.assignedTo.company,
      } : undefined,
      createdAt: typedUpdatedPhoneNumber.createdAt.toISOString(),
      updatedAt: typedUpdatedPhoneNumber.updatedAt.toISOString(),
      assignedAt: typedUpdatedPhoneNumber.assignedAt?.toISOString(),
      unassignedAt: typedUpdatedPhoneNumber.unassignedAt?.toISOString(),
      nextBillingDate: typedUpdatedPhoneNumber.nextBillingDate?.toISOString(),
      lastBilledDate: typedUpdatedPhoneNumber.lastBilledDate?.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating phone number:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update phone number' },
      { status: 500 }
    );
  }
}

// DELETE - Delete phone number
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

    const { id } = await params;
    
    // Connect to the database
    await connectToDatabase();

    // Find the phone number
    const phoneNumber = await PhoneNumber.findById(id);
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    // Check if phone number is currently assigned
    if (phoneNumber.status === 'assigned' && phoneNumber.assignedTo) {
      return NextResponse.json(
        { error: 'Cannot delete phone number that is currently assigned to a user' },
        { status: 400 }
      );
    }

    // Check for pending billing
    const pendingBilling = await PhoneNumberBilling.findOne({
      phoneNumberId: new mongoose.Types.ObjectId(id),
      status: 'pending'
    });

    if (pendingBilling) {
      return NextResponse.json(
        { error: 'Cannot delete phone number with pending billing' },
        { status: 400 }
      );
    }

    // Delete the phone number
    await PhoneNumber.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Phone number deleted successfully' });
  } catch (error) {
    console.error('Error deleting phone number:', error);
    return NextResponse.json(
      { error: 'Failed to delete phone number' },
      { status: 500 }
    );
  }
} 