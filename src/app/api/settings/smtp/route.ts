import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import connectToDatabase from '@/lib/db';
import SmtpSettings from '@/models/SmtpSettings';
import { EmailCategory } from '@/types/smtp';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Get all SMTP accounts, excluding passwords for security
    const smtpAccounts = await SmtpSettings.find()
      .select('-password')
      .sort({ category: 1, priority: 1, createdAt: 1 });

    return NextResponse.json(smtpAccounts);
  } catch (error) {
    console.error('Error fetching SMTP accounts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.host || !body.port || !body.fromEmail || !body.category) {
      return NextResponse.json(
        { error: 'Name, host, port, from email, and category are required' },
        { status: 400 }
      );
    }

    // Validate email category
    const validCategories: EmailCategory[] = ['billing', 'authentication', 'support', 'default'];
    if (!validCategories.includes(body.category)) {
      return NextResponse.json(
        { error: 'Invalid email category' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if setting as default, ensure no other default exists
    if (body.isDefault) {
      await SmtpSettings.updateMany({ isDefault: true }, { isDefault: false });
    }

    // If no priority specified, set to next available priority for the category
    if (body.priority === undefined || body.priority === null) {
      const lastAccount = await SmtpSettings.findOne({ category: body.category })
        .sort({ priority: -1 });
      body.priority = lastAccount ? lastAccount.priority + 1 : 0;
    }

    const settingsData = {
      name: body.name.trim(),
      category: body.category,
      host: body.host.trim(),
      port: parseInt(body.port),
      secure: body.secure === true,
      username: body.username?.trim() || '',
      password: body.password || '',
      fromEmail: body.fromEmail.trim(),
      fromName: body.fromName?.trim() || 'Sippy Dashboard',
      enabled: body.enabled !== false, // Default to true
      isDefault: body.isDefault === true,
      priority: parseInt(body.priority) || 0,
      description: body.description?.trim() || '',
    };

    // Create new SMTP account
    const smtpAccount = new SmtpSettings(settingsData);
    await smtpAccount.save();

    // Return account without password for security
    const safeAccount = await SmtpSettings.findById(smtpAccount._id).select('-password');
    return NextResponse.json(safeAccount, { status: 201 });
  } catch (error) {
    console.error('Error creating SMTP account:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  return POST(request); // Same logic for updates
} 