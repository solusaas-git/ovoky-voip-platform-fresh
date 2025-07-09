import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Provider } from '@/models/Provider';
import { getCurrentUser } from '@/lib/authService';

// Type definitions for provider queries
interface ProviderQuery {
  isActive?: boolean;
  services?: { $in: string[] };
  $or?: Array<{
    name?: { $regex: string; $options: string };
    description?: { $regex: string; $options: string };
  }>;
}

// GET /api/admin/providers - List all providers
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');
    const service = searchParams.get('service');

    const query: ProviderQuery = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== null && isActive !== '') {
      query.isActive = isActive === 'true';
    }

    if (service) {
      query.services = { $in: [service] };
    }

    const total = await Provider.countDocuments(query);
    const providers = await Provider.find(query)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      providers,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/providers - Create a new provider
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase();

    const { 
      name, 
      description, 
      services, 
      website, 
      contactEmail, 
      contactPhone, 
      supportedCountries = [], 
      isActive = true 
    } = await request.json();

    if (!name || !services || services.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, services' 
      }, { status: 400 });
    }

    // Check for duplicates
    const existingProvider = await Provider.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingProvider) {
      return NextResponse.json({ 
        error: 'Provider with this name already exists' 
      }, { status: 409 });
    }

    const provider = new Provider({
      name: name.trim(),
      description: description?.trim(),
      services,
      website: website?.trim(),
      contactEmail: contactEmail?.trim(),
      contactPhone: contactPhone?.trim(),
      supportedCountries,
      isActive
    });

    await provider.save();

    return NextResponse.json({ provider }, { status: 201 });
  } catch (error) {
    console.error('Error creating provider:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 