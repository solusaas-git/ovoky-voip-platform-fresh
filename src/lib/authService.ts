'use server';

import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import User, { UserRole } from '@/models/User';
import { connectToDatabase } from './db';
import { SippyClient, SippyCredentials } from './sippyClient';

// Constants
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';
const COOKIE_NAME = 'auth_token';

// Interface for registration data
export interface RegisterData {
  name: string;
  email: string;
  password: string;
  sippyAccountId: number;
  role?: UserRole;
}

// Interface for login data
export interface LoginData {
  email: string;
  password: string;
}

// Interface for user data returned to the client
export interface UserData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  sippyAccountId?: number;
  isEmailVerified: boolean;
  isSuspended?: boolean;
  suspendedAt?: string;
  suspensionReason?: string;
  suspendedBy?: string;
  isImpersonating?: boolean;
  originalUserId?: string;
}

// Interface for authentication result
export interface AuthResult {
  user: UserData;
  token: string;
}

// Create a JWT token
const createToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

// Convert user document to safe user data
const sanitizeUser = (user: any): UserData => {
  return {
    id: typeof user._id === 'object' && user._id !== null ? user._id.toString() : String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    sippyAccountId: user.sippyAccountId,
    isEmailVerified: user.isEmailVerified,
    isSuspended: user.isSuspended,
    suspendedAt: user.suspendedAt?.toISOString(),
    suspensionReason: user.suspensionReason,
    suspendedBy: user.suspendedBy,
  };
};

// Register a new user
export const registerUser = async (data: RegisterData): Promise<AuthResult> => {
  await connectToDatabase();

  // Check if user already exists
  const existingUser = await User.findOne({ email: data.email });
  if (existingUser) {
    throw new Error('User already exists');
  }

  // Create new user
  const user = await User.create({
    name: data.name,
    email: data.email,
    password: data.password,
    sippyAccountId: data.sippyAccountId,
    role: data.role || UserRole.CLIENT,
  });

  // Create token
  const userId = typeof user._id === 'object' && user._id !== null ? 
    user._id.toString() : String(user._id);
  const token = createToken(userId);

  return {
    user: sanitizeUser(user),
    token,
  };
};

// Login a user
export const loginUser = async (data: LoginData): Promise<AuthResult> => {
  await connectToDatabase();

  // Find user by email with password
  const user = await User.findByEmail(data.email);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Check password
  const isPasswordValid = await user.comparePassword(data.password);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Check if email is verified
  if (!user.isEmailVerified) {
    throw new Error('Email not verified. Please check your email for verification code.');
  }

  // Note: We return suspended users so the frontend can show the suspension dialog
  // The frontend will handle the suspension logic

  // Create token
  const userId = typeof user._id === 'object' && user._id !== null ? 
    user._id.toString() : String(user._id);
  const token = createToken(userId);

  return {
    user: sanitizeUser(user),
    token,
  };
};

// Get current user from token
export const getCurrentUser = async (): Promise<UserData | null> => {
  try {
    await connectToDatabase();

    // Get token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    
    if (!token) {
      return null;
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { 
      userId: string;
      originalUserId?: string;
      isImpersonating?: boolean;
    };
    
    // Get user by ID
    const user = await User.findById(decoded.userId);
    if (!user) {
      return null;
    }

    // Note: We return suspended users so the frontend can show the suspension dialog
    // The frontend will handle the suspension logic

    // Create user data with impersonation info if applicable
    const userData = sanitizeUser(user);
    
    // Add impersonation data if present in token
    if (decoded.isImpersonating && decoded.originalUserId) {
      userData.isImpersonating = true;
      userData.originalUserId = decoded.originalUserId;
    }

    return userData;
  } catch {
    return null;
  }
};

// Get Sippy client for a user
export const getSippyClientForUser = async (
  userId: string, 
  credentials: SippyCredentials
): Promise<SippyClient> => {
  await connectToDatabase();

  // Get user
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Create Sippy client
  return new SippyClient(credentials);
};

// Set authentication cookie
export const setAuthCookie = async (token: string): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
};

// Clear authentication cookie
export const clearAuthCookie = async (): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}; 