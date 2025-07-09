import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import UserLanguagePreferenceModel from '@/models/UserLanguagePreference';
import { getCurrentUser } from '@/lib/authService';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    let preference = await UserLanguagePreferenceModel.findOne({ userId: currentUser.id });

    if (!preference) {
      // Create default preference
      preference = new UserLanguagePreferenceModel({
        userId: currentUser.id,
        language: 'en'
      });
      await preference.save();
    }

    return NextResponse.json(preference);
  } catch (error) {
    console.error('Error fetching language preference:', error);
    return NextResponse.json(
      { error: 'Failed to fetch language preference' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { language } = await request.json();

    if (!language || !['en', 'fr'].includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language. Must be "en" or "fr"' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const preference = await UserLanguagePreferenceModel.findOneAndUpdate(
      { userId: currentUser.id },
      { language },
      { 
        new: true, 
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    return NextResponse.json(preference);
  } catch (error) {
    console.error('Error updating language preference:', error);
    return NextResponse.json(
      { error: 'Failed to update language preference' },
      { status: 500 }
    );
  }
} 