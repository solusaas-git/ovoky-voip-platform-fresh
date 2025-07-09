import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import SmsProvider from '@/models/SmsGateway';

const simulationProviders = [
  {
    name: 'simulation-premium',
    displayName: 'Premium SMS Simulation',
    type: 'one-way',
    provider: 'simulation',
    isActive: true,
    supportedCountries: [], // Empty means all countries
    rateLimit: {
      messagesPerSecond: 20,
      messagesPerMinute: 1000,
      messagesPerHour: 50000
    },
    settings: {
      simulationType: 'premium',
      successRate: 0.98,
      deliveryRate: 0.96,
      minDelay: 100,
      maxDelay: 500,
      deliveryDelay: 2000,
      temporaryFailureRate: 0.01,
      permanentFailureRate: 0.01,
      maxConcurrent: 100,
      description: 'High-quality simulation provider with 98% success rate, ideal for testing premium gateway behavior.'
    }
  },
  {
    name: 'simulation-standard',
    displayName: 'Standard SMS Simulation',
    type: 'one-way',
    provider: 'simulation',
    isActive: true,
    supportedCountries: [],
    rateLimit: {
      messagesPerSecond: 15,
      messagesPerMinute: 600,
      messagesPerHour: 30000
    },
    settings: {
      simulationType: 'standard',
      successRate: 0.94,
      deliveryRate: 0.92,
      minDelay: 200,
      maxDelay: 1000,
      deliveryDelay: 5000,
      temporaryFailureRate: 0.03,
      permanentFailureRate: 0.03,
      maxConcurrent: 50,
      description: 'Standard simulation provider with 94% success rate, typical SMS gateway behavior.'
    }
  },
  {
    name: 'simulation-budget',
    displayName: 'Budget SMS Simulation',
    type: 'one-way',
    provider: 'simulation',
    isActive: true,
    supportedCountries: [],
    rateLimit: {
      messagesPerSecond: 8,
      messagesPerMinute: 300,
      messagesPerHour: 15000
    },
    settings: {
      simulationType: 'budget',
      successRate: 0.88,
      deliveryRate: 0.85,
      minDelay: 300,
      maxDelay: 2000,
      deliveryDelay: 10000,
      temporaryFailureRate: 0.07,
      permanentFailureRate: 0.05,
      maxConcurrent: 20,
      description: 'Budget simulation provider with 88% success rate, simulates lower-cost gateways with higher failure rates.'
    }
  },
  {
    name: 'simulation-testing',
    displayName: 'Testing SMS Simulation',
    type: 'one-way',
    provider: 'simulation',
    isActive: true,
    supportedCountries: [],
    rateLimit: {
      messagesPerSecond: 50,
      messagesPerMinute: 2000,
      messagesPerHour: 100000
    },
    settings: {
      simulationType: 'testing',
      successRate: 0.90,
      deliveryRate: 0.95,
      minDelay: 50,
      maxDelay: 200,
      deliveryDelay: 1000,
      temporaryFailureRate: 0.05,
      permanentFailureRate: 0.05,
      maxConcurrent: 1000,
      description: 'Fast testing simulation provider with 90% success rate, optimized for rapid testing and development.'
    }
  }
];

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    const { action } = await request.json();

    if (action === 'seed') {
      // Remove existing simulation providers first
      await SmsProvider.deleteMany({ provider: 'simulation' });
      
      // Insert new simulation providers
      const createdProviders = await SmsProvider.insertMany(simulationProviders);
      
      return NextResponse.json({
        success: true,
        message: `${createdProviders.length} simulation providers seeded successfully`,
        providers: createdProviders.map(p => ({
          id: p._id,
          name: p.name,
          displayName: p.displayName,
          simulationType: p.settings?.simulationType
        }))
      });
    } else if (action === 'remove') {
      // Remove all simulation providers
      const result = await SmsProvider.deleteMany({ provider: 'simulation' });
      
      return NextResponse.json({
        success: true,
        message: `${result.deletedCount} simulation providers removed successfully`
      });
    } else if (action === 'status') {
      // Check current simulation providers
      const providers = await SmsProvider.find({ provider: 'simulation' }).sort({ name: 1 });
      
      return NextResponse.json({
        success: true,
        count: providers.length,
        providers: providers.map(p => ({
          id: p._id,
          name: p.name,
          displayName: p.displayName,
          isActive: p.isActive,
          simulationType: p.settings?.simulationType,
          successRate: p.settings?.successRate,
          rateLimit: p.rateLimit
        }))
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use: seed, remove, or status' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Failed to manage simulation providers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 