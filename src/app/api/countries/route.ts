import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Country } from '@/models/Country';

// GET /api/countries - Get active countries for forms
export async function GET(_request: NextRequest) {
  try {
    await connectToDatabase();

    const countries = await Country.find({ isActive: true })
      .sort({ name: 1 })
      .select('name code phoneCode');

    return NextResponse.json({ countries });
  } catch (error) {
    console.error('Error fetching countries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 