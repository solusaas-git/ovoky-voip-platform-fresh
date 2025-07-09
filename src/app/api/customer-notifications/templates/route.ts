import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import CustomerNotificationService from '@/services/CustomerNotificationService';


// GET /api/customer-notifications/templates
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can manage customer notifications
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const type = searchParams.get('type');
    const category = searchParams.get('category');

    const filters: Record<string, unknown> = {};
    if (isActive !== null) filters.isActive = isActive === 'true';
    if (type) filters.type = type;
    if (category) filters.category = category;

    const service = CustomerNotificationService.getInstance();
    const templates = await service.getTemplates(filters);

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching notification templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST /api/customer-notifications/templates
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
      type,
      subject,
      content,
      channels,
      priority,
      category,
      isActive
    } = body;

    // Validation
    if (!name || !type || !subject || !content?.html || !content?.text) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const service = CustomerNotificationService.getInstance();
    const template = await service.createTemplate({
      name,
      type,
      subject,
      content,
      channels: channels || ['email'],
      priority: priority || 'medium',
      category: category || 'general',
      isActive: isActive !== false,
      createdBy: currentUser.id,
      variables: [] // Will be auto-extracted
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating notification template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
} 