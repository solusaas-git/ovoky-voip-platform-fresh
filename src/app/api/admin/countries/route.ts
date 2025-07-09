import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Country } from '@/models/Country';
import { getCurrentUser } from '@/lib/authService';

// GET /api/admin/countries - List all countries
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

    const query: Record<string, unknown> = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { phoneCode: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== null && isActive !== '') {
      query.isActive = isActive === 'true';
    }

    const total = await Country.countDocuments(query);
    const countries = await Country.find(query)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      countries,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching countries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/countries - Create a new country
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase();

    const { name, code, phoneCode, isActive = true } = await request.json();

    if (!name || !code || !phoneCode) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, code, phoneCode' 
      }, { status: 400 });
    }

    // Check for duplicates
    const existingCountry = await Country.findOne({
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

    const country = new Country({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      phoneCode: phoneCode.trim(),
      isActive
    });

    await country.save();

    return NextResponse.json({ country }, { status: 201 });
  } catch (error) {
    console.error('Error creating country:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 