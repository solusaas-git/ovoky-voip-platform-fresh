import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import CustomerNotificationService from '@/services/CustomerNotificationService';


export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin privileges
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { title, message, targetUsers, priority, channels } = body;

    // Validate required fields
    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      return NextResponse.json({ error: 'At least one delivery channel is required' }, { status: 400 });
    }

    if (!targetUsers || !targetUsers.type) {
      return NextResponse.json({ error: 'Target users configuration is required' }, { status: 400 });
    }

    const processedNotification = {
      title,
      message,
      targetUsers,
      priority: priority || 'medium',
      channels,
      createdBy: currentUser.id
    };

    const service = CustomerNotificationService.getInstance();
    const result = await service.sendInstantNotification(processedNotification);

    return NextResponse.json({ 
      success: true, 
      message: 'Instant notification sent successfully',
      recipientCount: result.recipientCount,
      deliveryIdsCount: result.deliveryIds.length
    });

  } catch (error) {
    console.error('Instant notification error:', error);
    return NextResponse.json({ 
      error: 'Failed to send instant notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 