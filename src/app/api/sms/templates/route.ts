import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import SmsTemplate from '@/models/SmsTemplate';



// GET /api/sms/templates - Get user's templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const templates = await SmsTemplate.find({ 
      userId: session.user.id,
      isActive: true 
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Failed to fetch SMS templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/sms/templates - Create new template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { name, description, message, category } = await request.json();

    // Validate required fields
    if (!name || !message) {
      return NextResponse.json(
        { error: 'Template name and message are required' },
        { status: 400 }
      );
    }

    const template = await SmsTemplate.create({
      userId: session.user.id,
      name,
      description,
      message,
      category
    });

    return NextResponse.json({
      success: true,
      template
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create SMS template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

 