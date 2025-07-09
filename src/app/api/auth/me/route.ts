import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { SippyCredentials } from '@/lib/sippyClient';

interface SippyCredentialsStore {
  [userId: string]: SippyCredentials;
}

// In-memory store for Sippy credentials
// In a production app, these would be encrypted and stored in a database
const sippyCredentialsStore: SippyCredentialsStore = {};

export async function GET() {
  try {
    // Get current user from token
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    // Return user data and Sippy credentials
    return NextResponse.json({
      user,
      sippyCredentials: sippyCredentialsStore[user.id],
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ user: null });
  }
} 