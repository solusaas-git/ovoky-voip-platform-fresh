import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, setAuthCookie } from '@/lib/authService';
import User from '@/models/User';
import { connectToDatabase } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

// POST handler to impersonate a user
export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated and is an admin
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get the user ID to impersonate from request body
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Connect to the database
    await connectToDatabase();
    
    // Find the user to impersonate
    const userToImpersonate = await User.findById(userId);
    
    if (!userToImpersonate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Create a token for the impersonated user, storing the admin's ID
    const token = jwt.sign({ 
      userId,
      originalUserId: currentUser.id, // Store the admin's ID
      isImpersonating: true
    }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
    
    // Set the auth cookie with the new token
    await setAuthCookie(token);
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: `Now impersonating ${userToImpersonate.name}`,
    });
  } catch (error) {
    console.error('Error impersonating user:', error);
    return NextResponse.json({ error: 'Failed to impersonate user' }, { status: 500 });
  }
} 