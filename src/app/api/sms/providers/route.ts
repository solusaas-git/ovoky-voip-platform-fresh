import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import SmsUserProviderAssignment from '@/models/SmsUserProviderAssignment';
import SmsProvider from '@/models/SmsGateway';
import { initializeSmsModels } from '@/models';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Initialize SMS models to ensure they're registered
    initializeSmsModels();

    // Get user's assigned SMS providers
    const providerAssignments = await SmsUserProviderAssignment.findActiveByUserId(session.user.id);
    
    // Extract provider information from assignments
    const providers = providerAssignments
      .map(assignment => {
        // Convert the entire assignment to plain object first
        const plainAssignment = JSON.parse(JSON.stringify(assignment));
        return plainAssignment.providerId;
      })
      .filter(provider => provider && provider.isActive)
      .map(provider => ({
        _id: provider._id,
        name: provider.name,
        displayName: provider.displayName,
        type: provider.type,
        provider: provider.provider,
        isActive: provider.isActive,
        supportedCountries: provider.supportedCountries || [],
        rateLimit: provider.rateLimit,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt
      }));

    return NextResponse.json({
      success: true,
      providers
    });
  } catch (error) {
    console.error('Failed to fetch SMS gateways:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 