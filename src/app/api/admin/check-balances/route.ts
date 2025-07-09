import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { NotificationService } from '@/services/NotificationService';

export async function POST() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Manual balance check triggered by admin:', currentUser.email);
    
    const notificationService = NotificationService.getInstance();
    await notificationService.checkAndNotifyLowBalances();

    return NextResponse.json({ 
      success: true, 
      message: 'Balance check completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in manual balance check:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 