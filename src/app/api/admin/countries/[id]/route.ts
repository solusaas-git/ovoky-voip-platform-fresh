import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Country } from '@/models/Country';
import { getCurrentUser } from '@/lib/authService';

// GET /api/admin/countries/[id] - Get a specific country
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

    // Await params before accessing properties (Next.js 15 requirement)
    const { id } = await params;

    const country = await Country.findById(id);
    if (!country) {
      return NextResponse.json({ error: 'Country not found' }, { status: 404 });
    }

    return NextResponse.json({ country });
  } catch (error) {
    console.error('Error fetching country:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/countries/[id] - Update a country
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

    // Await params before accessing properties (Next.js 15 requirement)
    const { id } = await params;

    const { name, code, phoneCode, isActive } = await request.json();

    if (!name || !code || !phoneCode) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, code, phoneCode' 
      }, { status: 400 });
    }

    // Check for duplicates (excluding current country)
    const existingCountry = await Country.findOne({
      _id: { $ne: id },
      $or: [
        { name: { $regex: new RegExp(`^${name}$`, 'i') } },
        { code: code.toUpperCase() }
      ]
    });

    if (existingCountry) {
      return NextResponse.json({ 
        error: 'Country with this name or code already exists' 
      }, { status: 409 });
    }

    const country = await Country.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        code: code.toUpperCase().trim(),
        phoneCode: phoneCode.trim(),
        isActive
      },
      { new: true, runValidators: true }
    );

    if (!country) {
      return NextResponse.json({ error: 'Country not found' }, { status: 404 });
    }

    return NextResponse.json({ country });
  } catch (error) {
    console.error('Error updating country:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/countries/[id] - Delete a country
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

    // Await params before accessing properties (Next.js 15 requirement)
    const { id } = await params;

    const country = await Country.findByIdAndDelete(id);
    if (!country) {
      return NextResponse.json({ error: 'Country not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Country deleted successfully' });
  } catch (error) {
    console.error('Error deleting country:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 