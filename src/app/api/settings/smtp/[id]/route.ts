import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import connectToDatabase from '@/lib/db';
import SmtpSettings from '@/models/SmtpSettings';
import { EmailCategory } from '@/types/smtp';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

interface SmtpUpdateData {
  name: string;
  category: EmailCategory;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
  isDefault: boolean;
  priority: number;
  description: string;
  password?: string;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    await connectToDatabase();
    
    const smtpAccount = await SmtpSettings.findById(id).select('-password');
    
    if (!smtpAccount) {
      return NextResponse.json({ error: 'SMTP account not found' }, { status: 404 });
    }

    return NextResponse.json(smtpAccount);
  } catch (error) {
    console.error('Error fetching SMTP account:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

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

    const existingAccount = await SmtpSettings.findById(id);
    if (!existingAccount) {
      return NextResponse.json({ error: 'SMTP account not found' }, { status: 404 });
    }

    // Check if setting as default, ensure no other default exists
    if (body.isDefault && !existingAccount.isDefault) {
      await SmtpSettings.updateMany(
        { _id: { $ne: id }, isDefault: true },
        { isDefault: false }
      );
    }

    const updateData: Partial<SmtpUpdateData> = {
      name: body.name.trim(),
      category: body.category,
      host: body.host.trim(),
      port: parseInt(body.port),
      secure: body.secure === true,
      username: body.username?.trim() || '',
      fromEmail: body.fromEmail.trim(),
      fromName: body.fromName?.trim() || 'Sippy Dashboard',
      enabled: body.enabled !== false,
      isDefault: body.isDefault === true,
      priority: parseInt(body.priority) || existingAccount.priority,
      description: body.description?.trim() || '',
    };

    // Only update password if provided
    if (body.password && body.password.trim()) {
      updateData.password = body.password.trim();
    }

    const updatedAccount = await SmtpSettings.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    return NextResponse.json(updatedAccount);
  } catch (error) {
    console.error('Error updating SMTP account:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    await connectToDatabase();

    const smtpAccount = await SmtpSettings.findById(id);
    if (!smtpAccount) {
      return NextResponse.json({ error: 'SMTP account not found' }, { status: 404 });
    }

    // Prevent deletion if this is the only enabled account
    const enabledCount = await SmtpSettings.countDocuments({ enabled: true });
    if (smtpAccount.enabled && enabledCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last enabled SMTP account' },
        { status: 400 }
      );
    }

    // If deleting the default account, make another account default
    if (smtpAccount.isDefault) {
      const nextDefaultAccount = await SmtpSettings.findOne({
        _id: { $ne: id },
        enabled: true
      }).sort({ priority: 1, createdAt: 1 });

      if (nextDefaultAccount) {
        nextDefaultAccount.isDefault = true;
        await nextDefaultAccount.save();
      }
    }

    await SmtpSettings.findByIdAndDelete(id);

    return NextResponse.json({ message: 'SMTP account deleted successfully' });
  } catch (error) {
    console.error('Error deleting SMTP account:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 