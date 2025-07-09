import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import CustomerNotificationService from '@/services/CustomerNotificationService';

// GET /api/customer-notifications/scheduled
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const templateId = searchParams.get('templateId');

    const filters: { status?: string[]; templateId?: string } = {};
    if (status) filters.status = status.split(',');
    if (templateId) filters.templateId = templateId;

    const service = CustomerNotificationService.getInstance();
    const notifications = await service.getScheduledNotifications(filters as unknown as Parameters<typeof service.getScheduledNotifications>[0]);

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error fetching scheduled notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled notifications' },
      { status: 500 }
    );
  }
}

// POST /api/customer-notifications/scheduled
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      templateId,
      schedule,
      targetUsers,
      channels,
      contentOverrides,
      templateVariables
    } = body;

    // Validation
    if (!name || !templateId || !schedule || !targetUsers || !channels?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const service = CustomerNotificationService.getInstance();
    const notification = await service.scheduleNotification({
      name,
      description,
      templateId,
      schedule,
      targetUsers,
      channels,
      contentOverrides,
      templateVariables,
      createdBy: currentUser.id,
      status: 'draft'
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error('Error creating scheduled notification:', error);
    return NextResponse.json(
      { error: 'Failed to create scheduled notification' },
      { status: 500 }
    );
  }
} 