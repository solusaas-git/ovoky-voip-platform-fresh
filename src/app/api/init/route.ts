import { NextResponse } from 'next/server';
import { initializeApp, isAppInitialized } from '@/lib/startup';

export async function GET() {
  try {
    if (isAppInitialized()) {
      return NextResponse.json({ 
        success: true, 
        message: 'Application already initialized',
        initialized: true
      });
    }

    await initializeApp();

    return NextResponse.json({ 
      success: true, 
      message: 'Application initialized successfully',
      initialized: true
    });
  } catch (error) {
    console.error('Error initializing application:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize application',
      message: error instanceof Error ? error.message : 'Unknown error',
      initialized: false
    }, { status: 500 });
  }
}

export async function POST() {
  // Same as GET - allow both methods
  return GET();
} 