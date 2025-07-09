import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookie } from '@/lib/authService';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';
const COOKIE_NAME = 'auth_token';

// POST handler to return to the admin account
export async function POST() {
  try {
    // Get current token
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Verify and decode the token
    const decoded = jwt.verify(token, JWT_SECRET) as { 
      userId: string;
      originalUserId?: string;
      isImpersonating?: boolean;
    };
    
    // Check if this is an impersonation session
    if (!decoded.isImpersonating || !decoded.originalUserId) {
      return NextResponse.json({ error: 'Not in impersonation mode' }, { status: 400 });
    }
    
    // Create a new token for the original admin
    const adminToken = jwt.sign({ 
      userId: decoded.originalUserId 
    }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
    
    // Set the auth cookie with the admin token
    await setAuthCookie(adminToken);
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Returned to admin account',
    });
  } catch (error) {
    console.error('Error returning to admin account:', error);
    return NextResponse.json({ error: 'Failed to return to admin account' }, { status: 500 });
  }
} 