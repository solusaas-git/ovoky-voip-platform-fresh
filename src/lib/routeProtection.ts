import { NextRequest, NextResponse } from 'next/server';
import { requireActiveUser, requireActiveAdmin, AuthResult } from '@/lib/authMiddleware';

// Helper to create protected route handlers
export function withAuthProtection(handler: (request: NextRequest, user: any) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const authResult = await requireActiveUser();
    
    if (!authResult.user) {
      return NextResponse.json(
        { 
          error: authResult.error || 'Unauthorized',
          code: authResult.error === 'Account suspended' ? 'ACCOUNT_SUSPENDED' : 'UNAUTHORIZED'
        }, 
        { status: authResult.status || 401 }
      );
    }
    
    return handler(request, authResult.user);
  };
}

// Helper to create admin protected route handlers
export function withAdminProtection(handler: (request: NextRequest, user: any) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const authResult = await requireActiveAdmin();
    
    if (!authResult.user) {
      return NextResponse.json(
        { 
          error: authResult.error || 'Unauthorized',
          code: authResult.error === 'Account suspended' ? 'ACCOUNT_SUSPENDED' : 'UNAUTHORIZED'
        }, 
        { status: authResult.status || 401 }
      );
    }
    
    return handler(request, authResult.user);
  };
}

// Error response helper for suspended accounts
export function createSuspensionErrorResponse() {
  return NextResponse.json(
    { 
      error: 'Account suspended',
      code: 'ACCOUNT_SUSPENDED',
      message: 'Your account has been suspended. Please contact support for assistance.'
    }, 
    { status: 403 }
  );
} 