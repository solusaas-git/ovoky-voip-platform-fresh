import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import SmsBillingSettings from '@/models/SmsBillingSettings';
import User from '@/models/User';
import { z } from 'zod';
import mongoose from 'mongoose';

// Validation schema for billing settings
const billingSettingsSchema = z.object({
  userId: z.string().nullable().optional(), // null for global settings
  billingFrequency: z.enum(['daily', 'weekly', 'monthly', 'threshold']),
  maxAmount: z.number().min(0, 'Max amount cannot be negative'),
  maxMessages: z.number().min(0, 'Max messages cannot be negative'),
  billingDayOfWeek: z.number().min(0).max(6).optional(),
  billingDayOfMonth: z.number().min(1).max(28).optional(),
  autoProcessing: z.boolean().default(true),
  notificationEnabled: z.boolean().default(true),
  notificationThreshold: z.number().min(0, 'Notification threshold cannot be negative'),
});

/**
 * GET /api/admin/sms/billing-settings
 * Get SMS billing settings with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const includeGlobal = searchParams.get('includeGlobal') === 'true';

    // Build query
    const query: any = { isActive: true };
    
    if (userId) {
      query.userId = new mongoose.Types.ObjectId(userId);
    } else if (!includeGlobal) {
      query.userId = { $ne: null }; // Exclude global settings
    }

    // Get settings
    const settings = await SmsBillingSettings.find(query)
      .populate('userId', 'email name company')
      .populate('createdBy', 'email name')
      .populate('updatedBy', 'email name')
      .sort({ createdAt: -1 })
      .lean();

    // Transform data for response
    const transformedSettings = settings.map(setting => ({
      _id: String(setting._id),
      user: setting.userId ? {
        _id: String((setting.userId as any)._id),
        email: (setting.userId as any).email,
        name: (setting.userId as any).name,
        company: (setting.userId as any).company,
      } : null,
      billingFrequency: setting.billingFrequency,
      maxAmount: setting.maxAmount,
      maxMessages: setting.maxMessages,
      billingDayOfWeek: setting.billingDayOfWeek,
      billingDayOfMonth: setting.billingDayOfMonth,
      autoProcessing: setting.autoProcessing,
      notificationEnabled: setting.notificationEnabled,
      notificationThreshold: setting.notificationThreshold,
      isActive: setting.isActive,
      createdBy: setting.createdBy,
      updatedBy: setting.updatedBy,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    }));

    return NextResponse.json({
      settings: transformedSettings,
      total: transformedSettings.length
    });

  } catch (error) {
    console.error('Error fetching SMS billing settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SMS billing settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/sms/billing-settings
 * Create or update SMS billing settings
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = billingSettingsSchema.parse(body);

    await connectToDatabase();

    // Convert userId to ObjectId if provided
    const userObjectId = validatedData.userId ? new mongoose.Types.ObjectId(validatedData.userId) : null;

    // Validate user exists if userId is provided
    if (validatedData.userId) {
      const targetUser = await User.findById(validatedData.userId);
      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // Check if settings already exist
    const existingSettings = await SmsBillingSettings.findOne({
      userId: userObjectId,
      isActive: true
    });

    let settings;

    if (existingSettings) {
      // Update existing settings
      Object.assign(existingSettings, {
        ...validatedData,
        userId: userObjectId,
        updatedBy: new mongoose.Types.ObjectId(user.id),
      });
      settings = await existingSettings.save();
    } else {
      // Create new settings
      settings = await SmsBillingSettings.create({
        ...validatedData,
        userId: userObjectId,
        createdBy: new mongoose.Types.ObjectId(user.id),
      });
    }

    // Populate for response
    await settings.populate('userId', 'email name company');
    await settings.populate('createdBy', 'email name');
    await settings.populate('updatedBy', 'email name');

    return NextResponse.json({
      message: existingSettings ? 'SMS billing settings updated successfully' : 'SMS billing settings created successfully',
      settings: {
        _id: String(settings._id),
        user: settings.userId ? {
          _id: String((settings.userId as any)._id),
          email: (settings.userId as any).email,
          name: (settings.userId as any).name,
          company: (settings.userId as any).company,
        } : null,
        billingFrequency: settings.billingFrequency,
        maxAmount: settings.maxAmount,
        maxMessages: settings.maxMessages,
        billingDayOfWeek: settings.billingDayOfWeek,
        billingDayOfMonth: settings.billingDayOfMonth,
        autoProcessing: settings.autoProcessing,
        notificationEnabled: settings.notificationEnabled,
        notificationThreshold: settings.notificationThreshold,
        isActive: settings.isActive,
        createdBy: settings.createdBy,
        updatedBy: settings.updatedBy,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      }
    });

  } catch (error) {
    console.error('Error creating/updating SMS billing settings:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to save SMS billing settings' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/sms/billing-settings
 * Deactivate SMS billing settings
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const settingsId = searchParams.get('id');

    if (!settingsId) {
      return NextResponse.json({ error: 'Settings ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    const settings = await SmsBillingSettings.findById(settingsId);
    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    // Deactivate instead of delete
    settings.isActive = false;
    settings.updatedBy = new mongoose.Types.ObjectId(user.id);
    await settings.save();

    return NextResponse.json({
      message: 'SMS billing settings deactivated successfully'
    });

  } catch (error) {
    console.error('Error deactivating SMS billing settings:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate SMS billing settings' },
      { status: 500 }
    );
  }
} 