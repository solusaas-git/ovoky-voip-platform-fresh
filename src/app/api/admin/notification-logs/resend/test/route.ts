import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { NotificationLog } from '@/models/NotificationLog';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Get the latest notification log to test resend functionality
    const latestLog = await NotificationLog.findOne().sort({ createdAt: -1 });
    
    if (!latestLog) {
      return NextResponse.json({ 
        success: false,
        message: 'No notification logs found for testing' 
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Resend test endpoint ready',
      testData: {
        logId: (latestLog._id as { toString(): string }).toString(),
        userEmail: latestLog.userEmail,
        notificationType: latestLog.notificationType,
        status: latestLog.status,
        createdAt: latestLog.createdAt
      }
    });

  } catch (error) {
    console.error('Error in resend test endpoint:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Test endpoint error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 