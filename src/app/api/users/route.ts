import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAdmin } from '@/lib/authMiddleware';
import User from '@/models/User';
import UserOnboarding from '@/models/UserOnboarding';
import { connectToDatabase } from '@/lib/db';
import { initializeUserDefaults } from '@/lib/userSetup';

interface UserFilter {
  $or?: Array<{ name?: { $regex: string; $options: string } } | { email?: { $regex: string; $options: string } }>;
  role?: string;
}

// GET - List all users (for admin use in assignments)
export async function GET(request: NextRequest) {
  try {
    // Verify the user is authenticated and is an admin
    const authResult = await requireActiveAdmin();
    
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    
    // const user = authResult.user; // Not used in this function

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeOnboarding = searchParams.get('include_onboarding') === 'true';
    
    // Connect to the database
    await connectToDatabase();

    // Build filter query
    const filter: UserFilter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (role && role !== 'all') {
      filter.role = role;
    }

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    // Get users with pagination
    const users = await User
      .find(filter)
      .select('name email role sippyAccountId isEmailVerified emailVerifiedAt creationMethod isSuspended suspendedAt suspensionReason suspendedBy createdAt')
      .sort({ name: 1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // Fetch onboarding data if requested
    let onboardingMap = new Map();
    if (includeOnboarding && users.length > 0) {
      const userIds = users.map(user => user._id.toString());
      const onboardingData = await UserOnboarding.find({ 
        userId: { $in: userIds } 
      }).select('userId companyName completed completedAt approved reviewedBy reviewedAt').lean();
      
      onboardingData.forEach(onboarding => {
        onboardingMap.set(onboarding.userId, onboarding);
      });
    }

    // Transform the response
    const transformedUsers = users.map(user => {
      const userId = user._id.toString();
      const onboarding = onboardingMap.get(userId);
      
      return {
        id: userId,
        name: user.name,
        email: user.email,
        role: user.role,
        sippyAccountId: user.sippyAccountId,
        isEmailVerified: user.isEmailVerified,
        emailVerifiedAt: user.emailVerifiedAt?.toISOString(),
        creationMethod: user.creationMethod,
        isSuspended: user.isSuspended,
        suspendedAt: user.suspendedAt?.toISOString(),
        suspensionReason: user.suspensionReason,
        suspendedBy: user.suspendedBy,
        createdAt: user.createdAt.toISOString(),
        ...(includeOnboarding && onboarding && {
          onboarding: {
            companyName: onboarding.companyName,
            completed: onboarding.completed,
            completedAt: onboarding.completedAt?.toISOString(),
            approved: onboarding.approved,
            reviewedBy: onboarding.reviewedBy,
            reviewedAt: onboarding.reviewedAt?.toISOString()
          }
        })
      };
    });
    
    return NextResponse.json({
      users: transformedUsers,
      total,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Verify the user is authenticated and is an admin
  const authResult = await requireActiveAdmin();
  
  if (!authResult.user) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
  }
  
  // const user = authResult.user; // Not used in this function
  
  try {
    const data = await request.json();
    
    // Validate data
    if (!data.name || !data.email || !data.password || !data.role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Connect to the database
    await connectToDatabase();
    
    // Check if user with this email already exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }
    
    // Create the new user
    const newUser = await User.create({
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      sippyAccountId: data.sippyAccountId || 0, // Default to 0 if not provided
      creationMethod: 'admin', // User created by admin
      isEmailVerified: true, // Admin-created users are pre-verified
    });
    
    const userId = newUser._id.toString();
    
    // Initialize default preferences for the new user
    try {
      const userRole = data.role === 'admin' ? 'admin' : 'user';
      await initializeUserDefaults(userId, userRole);
      console.log(`✅ Default preferences initialized for admin-created user: ${data.email} (role: ${userRole})`);
    } catch (prefError) {
      // Log the error but don't fail user creation
      console.error('❌ Failed to initialize default preferences for admin-created user:', prefError);
    }
    
    // Return success with the created user (excluding password)
    return NextResponse.json({ 
      success: true, 
      message: 'User created successfully',
      user: {
        id: userId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        sippyAccountId: newUser.sippyAccountId,
        createdAt: newUser.createdAt.toISOString(),
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 