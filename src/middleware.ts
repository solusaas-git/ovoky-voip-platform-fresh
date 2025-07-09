import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // Handle CORS for API routes
  if (pathname.startsWith('/api/')) {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'https://ovoky.io',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    }
  }

  // Public paths that don't require authentication
  const isPublicPath = 
    pathname === '/' || 
    pathname === '/login' ||
    pathname === '/register' || 
    pathname === '/forgot-password' ||
    pathname === '/forgot-password/sent' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/api/auth') ||
    pathname === '/api/settings/branding' ||  // Allow public access to branding settings
    pathname.startsWith('/api/payments/webhook') ||  // Allow webhook access without auth
    pathname.startsWith('/api/sms/webhook') ||  // Allow SMS webhook access without auth
    pathname.startsWith('/api/cron/') ||  // Allow Vercel cron jobs access without auth
    pathname.includes('_next') ||
    pathname.includes('favicon.ico');

  // Check if the user is authenticated
  if (!authToken && !isPublicPath) {
    // For API routes, return JSON error instead of redirecting
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json(
        { 
          error: 'Authentication required',
          message: 'You must be logged in to access this resource',
          code: 'AUTH_REQUIRED'
        }, 
        { status: 401 }
      );
      
      // Add CORS headers to error responses
      response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || 'https://ovoky.io');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      
      return response;
    }
    
    // For page routes, redirect to login
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If the user is already authenticated and trying to access login or register page
  if (authToken && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Add CORS headers to successful responses for API routes
  const response = NextResponse.next();
  if (pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || 'https://ovoky.io');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

// Configure the paths for the middleware
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|providers-logos|icons|uploads|sounds|.*\\.).*)'],
}; 