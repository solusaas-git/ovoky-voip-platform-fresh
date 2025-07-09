import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const COOKIE_NAME = 'auth_token';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  sippyAccountId?: number;
  isEmailVerified: boolean;
  isSuspended?: boolean;
  suspendedAt?: Date;
  suspensionReason?: string;
  suspendedBy?: string;
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  error?: string;
  status?: number;
}

// Get authenticated user from request
export async function getAuthenticatedUser(): Promise<AuthResult> {
  try {
    await connectToDatabase();

    // Get token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    
    if (!token) {
      return { user: null, error: 'No authentication token', status: 401 };
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    // Get user by ID
    const user = await User.findById(decoded.userId);
    if (!user) {
      return { user: null, error: 'User not found', status: 401 };
    }

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        sippyAccountId: user.sippyAccountId,
        isEmailVerified: user.isEmailVerified,
        isSuspended: user.isSuspended,
        suspendedAt: user.suspendedAt,
        suspensionReason: user.suspensionReason,
        suspendedBy: user.suspendedBy,
      }
    };
  } catch (error) {
    return { user: null, error: 'Invalid token', status: 401 };
  }
}

// Check if user is suspended (with admin exemption)
export function isUserSuspended(user: AuthenticatedUser): boolean {
  return user.isSuspended === true && user.role !== 'admin';
}

// Middleware to require authentication
export async function requireAuth(): Promise<AuthResult> {
  const result = await getAuthenticatedUser();
  
  if (!result.user) {
    return result;
  }

  if (!result.user.isEmailVerified) {
    return { user: null, error: 'Email not verified', status: 403 };
  }

  return result;
}

// Middleware to require authentication and check suspension
export async function requireActiveUser(): Promise<AuthResult> {
  const result = await requireAuth();
  
  if (!result.user) {
    return result;
  }

  if (isUserSuspended(result.user)) {
    return { 
      user: null, 
      error: 'Account suspended', 
      status: 403 
    };
  }

  return result;
}

// Middleware to require admin role
export async function requireAdmin(): Promise<AuthResult> {
  const result = await requireAuth();
  
  if (!result.user) {
    return result;
  }

  if (result.user.role !== 'admin') {
    return { user: null, error: 'Admin access required', status: 403 };
  }

  return result;
}

// Middleware to require admin role and check suspension (admins can work even if suspended)
export async function requireActiveAdmin(): Promise<AuthResult> {
  const result = await requireAuth();
  
  if (!result.user) {
    return result;
  }

  if (result.user.role !== 'admin') {
    return { user: null, error: 'Admin access required', status: 403 };
  }

  // Note: Admins can access even if suspended for emergency management
  return result;
} 