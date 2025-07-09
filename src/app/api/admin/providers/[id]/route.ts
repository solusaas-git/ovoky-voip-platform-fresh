import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Provider } from '@/models/Provider';
import { getCurrentUser } from '@/lib/authService';

// GET /api/admin/providers/[id] - Get a specific provider
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase();

    const { id } = await params;

    const provider = await Provider.findById(id);
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json({ provider });
  } catch (error) {
    console.error('Error fetching provider:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/providers/[id] - Update a provider
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase();

    const { id } = await params;

    const { 
      name, 
      description, 
      services, 
      website, 
      contactEmail, 
      contactPhone, 
      supportedCountries, 
      isActive 
    } = await request.json();

    if (!name || !services || services.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, services' 
      }, { status: 400 });
    }

    // Check for duplicates (excluding current provider)
    const existingProvider = await Provider.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingProvider) {
      return NextResponse.json({ 
        error: 'Provider with this name already exists' 
      }, { status: 409 });
    }

    const provider = await Provider.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        description: description?.trim(),
        services,
        website: website?.trim(),
        contactEmail: contactEmail?.trim(),
        contactPhone: contactPhone?.trim(),
        supportedCountries,
        isActive
      },
      { new: true, runValidators: true }
    );

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json({ provider });
  } catch (error) {
    console.error('Error updating provider:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/providers/[id] - Delete a provider
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase();

    const { id } = await params;

    const provider = await Provider.findByIdAndDelete(id);
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Provider deleted successfully' });
  } catch (error) {
    console.error('Error deleting provider:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 