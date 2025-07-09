import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import User from '@/models/User';
import { connectToDatabase } from '@/lib/db';

interface UserUpdateData {
  name?: string;
  email?: string;
  role?: string;
  sippyAccountId?: number;
}

// DELETE handler to remove a user by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify the user is authenticated and is an admin
  const currentUser = await getCurrentUser();
  
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const { id: userId } = await params;
  
  // Prevent admins from deleting themselves
  if (currentUser.id === userId) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }
  
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Find the user to delete
    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Delete the user
    await User.findByIdAndDelete(userId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

// GET handler to fetch a single user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify the user is authenticated and is an admin
  const currentUser = await getCurrentUser();
  
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const { id: userId } = await params;
  
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Return the user data
    return NextResponse.json({ 
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        sippyAccountId: user.sippyAccountId,
        createdAt: user.createdAt.toISOString(),
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// PATCH handler to update a user by ID
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify the user is authenticated and is an admin
  const currentUser = await getCurrentUser();
  
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const { id: userId } = await params;
  
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Get the request body
    const data = await request.json();
    
    // Find the user to update
    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if email is being updated and if it's already in use
    if (data.email && data.email !== user.email) {
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
    }
    
    // Prepare update data
    const updateData: UserUpdateData = {};
    
    // Only update fields that are provided
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.role) updateData.role = data.role;
    if (data.sippyAccountId !== undefined) updateData.sippyAccountId = data.sippyAccountId;
    
    // Update password if provided
    if (data.password) {
      // We don't set it directly because the pre-save hook won't run with findByIdAndUpdate
      user.password = data.password;
      await user.save(); // This will trigger the password hashing
    }
    
    // Update other fields
    if (Object.keys(updateData).length > 0) {
      await User.findByIdAndUpdate(userId, updateData);
    }
    
    // Get the updated user
    const updatedUser = await User.findById(userId);
    
    if (!updatedUser) {
      return NextResponse.json({ error: 'Failed to retrieve updated user' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'User updated successfully',
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        sippyAccountId: updatedUser.sippyAccountId,
        createdAt: updatedUser.createdAt.toISOString(),
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
} 