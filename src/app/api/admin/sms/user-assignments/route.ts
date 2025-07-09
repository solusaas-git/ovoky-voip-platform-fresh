import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import SmsUserProviderAssignment from '@/models/SmsUserProviderAssignment';
import SmsProvider from '@/models/SmsGateway';
import User from '@/models/User';
import UserOnboardingModel from '@/models/UserOnboarding';
import mongoose from 'mongoose';

// GET - Get all user provider assignments
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const providerId = searchParams.get('providerId');

    let query: any = { isActive: true }; // Only show active assignments
    if (userId) query.userId = new mongoose.Types.ObjectId(userId);
    if (providerId) query.providerId = new mongoose.Types.ObjectId(providerId);

    const assignments = await SmsUserProviderAssignment.find(query)
      .populate('userId', 'name email role isActive')
      .populate('providerId', 'name displayName type provider isActive supportedCountries')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    // Get onboarding data for all users in assignments
    const userIds = assignments.map(assignment => assignment.userId._id.toString());
    
    const onboardings = await UserOnboardingModel.find({ userId: { $in: userIds } })
      .select('userId companyName')
      .lean();

    // Create onboarding map
    const onboardingMap = onboardings.reduce((acc, onboarding) => {
      acc[onboarding.userId] = onboarding;
      return acc;
    }, {} as Record<string, any>);

    // Add onboarding data to assignments
    const assignmentsWithOnboarding = assignments.map(assignment => {
      const assignmentObj = assignment.toObject();
      const userId = assignmentObj.userId._id.toString();
      return {
        ...assignmentObj,
        userId: {
          ...assignmentObj.userId,
          onboarding: {
            companyName: onboardingMap[userId]?.companyName || null
          }
        }
      };
    });

    return NextResponse.json({
      success: true,
      assignments: assignmentsWithOnboarding
    });
  } catch (error) {
    console.error('Failed to fetch user provider assignments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new user provider assignment
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentUser();
    
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      userId,
      providerId,
      priority = 100,
      dailyLimit,
      monthlyLimit,
      notes
    } = body;

    if (!userId || !providerId) {
      return NextResponse.json(
        { error: 'User ID and Provider ID are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if provider exists
    const provider = await SmsProvider.findById(providerId);
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Check if active assignment already exists
    const existingAssignment = await SmsUserProviderAssignment.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      providerId: new mongoose.Types.ObjectId(providerId),
      isActive: true
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'User is already assigned to this provider' },
        { status: 400 }
      );
    }

    // If there's an inactive assignment, reactivate it instead of creating new one
    const inactiveAssignment = await SmsUserProviderAssignment.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      providerId: new mongoose.Types.ObjectId(providerId),
      isActive: false
    });

    if (inactiveAssignment) {
      console.log('Reactivating existing assignment:', inactiveAssignment._id);
      const reactivatedAssignment = await SmsUserProviderAssignment.findByIdAndUpdate(
        inactiveAssignment._id,
        {
          isActive: true,
          priority,
          dailyLimit,
          monthlyLimit,
          dailyUsage: 0,
          monthlyUsage: 0,
          lastResetDaily: new Date(),
          lastResetMonthly: new Date(),
          assignedBy: new mongoose.Types.ObjectId(admin.id),
          assignedAt: new Date(),
          unassignedAt: undefined,
          unassignedBy: undefined,
          notes
        },
        { new: true }
      )
        .populate('userId', 'name email role isActive')
        .populate('providerId', 'name displayName type provider isActive supportedCountries')
        .populate('assignedBy', 'name email');

      if (!reactivatedAssignment) {
        return NextResponse.json({ error: 'Failed to reactivate assignment' }, { status: 500 });
      }

      // Get onboarding data for the user
      const onboarding = await UserOnboardingModel.findOne({ userId: reactivatedAssignment.userId._id })
        .select('companyName')
        .lean();

      const assignmentObj = reactivatedAssignment.toObject();
      const assignmentWithOnboarding = {
        ...assignmentObj,
        userId: {
          ...assignmentObj.userId,
          onboarding: {
            companyName: onboarding?.companyName || null
          }
        }
      };

      return NextResponse.json({
        success: true,
        assignment: assignmentWithOnboarding
      });
    }

    // Create new assignment
    const assignment = new SmsUserProviderAssignment({
      userId: new mongoose.Types.ObjectId(userId),
      providerId: new mongoose.Types.ObjectId(providerId),
      isActive: true,
      priority,
      dailyLimit,
      monthlyLimit,
      dailyUsage: 0,
      monthlyUsage: 0,
      lastResetDaily: new Date(),
      lastResetMonthly: new Date(),
      assignedBy: new mongoose.Types.ObjectId(admin.id),
      assignedAt: new Date(),
      notes
    });

    console.log('Creating assignment:', assignment);
    const savedAssignment = await assignment.save();
    console.log('Assignment saved:', savedAssignment);

    // Populate the assignment for response
    await savedAssignment.populate('userId', 'name email role isActive');
    await savedAssignment.populate('providerId', 'name displayName type provider isActive supportedCountries');
    await savedAssignment.populate('assignedBy', 'name email');

    // Get onboarding data for the user
    const onboarding = await UserOnboardingModel.findOne({ userId: savedAssignment.userId._id })
      .select('companyName')
      .lean();

    const assignmentObj = savedAssignment.toObject();
    const assignmentWithOnboarding = {
      ...assignmentObj,
      userId: {
        ...assignmentObj.userId,
        onboarding: {
          companyName: onboarding?.companyName || null
        }
      }
    };

    return NextResponse.json({
      success: true,
      assignment: assignmentWithOnboarding
    });
  } catch (error) {
    console.error('Failed to create user provider assignment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 