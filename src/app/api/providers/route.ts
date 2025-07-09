import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Provider } from '@/models/Provider';

// TypeScript interface
interface ProviderQuery {
  isActive: boolean;
  services?: { $in: string[] };
}

// GET /api/providers - Get active providers for forms
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service');

    const query: ProviderQuery = { isActive: true };
    
    if (service) {
      query.services = { $in: [service] };
    }

    const providers = await Provider.find(query)
      .sort({ name: 1 })
      .select('name description services');

    return NextResponse.json({ providers });
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 