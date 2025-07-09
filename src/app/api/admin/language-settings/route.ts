import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import SystemLanguageSettingsModel from '@/models/SystemLanguageSettings';
import { getCurrentUser } from '@/lib/authService';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    let settings = await SystemLanguageSettingsModel.findOne();

    if (!settings) {
      // Create default settings
      settings = new SystemLanguageSettingsModel({
        defaultLanguage: 'en',
        availableLanguages: ['en', 'fr'],
        enforceLanguage: false
      });
      await settings.save();
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching language settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch language settings' },
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

    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { defaultLanguage, availableLanguages, enforceLanguage } = await request.json();

    // Validation
    if (!defaultLanguage || !['en', 'fr'].includes(defaultLanguage)) {
      return NextResponse.json(
        { error: 'Invalid default language. Must be "en" or "fr"' },
        { status: 400 }
      );
    }

    if (!availableLanguages || !Array.isArray(availableLanguages) || availableLanguages.length === 0) {
      return NextResponse.json(
        { error: 'At least one language must be available' },
        { status: 400 }
      );
    }

    if (!availableLanguages.every(lang => ['en', 'fr'].includes(lang))) {
      return NextResponse.json(
        { error: 'Invalid available languages. Must be "en" or "fr"' },
        { status: 400 }
      );
    }

    if (!availableLanguages.includes(defaultLanguage)) {
      return NextResponse.json(
        { error: 'Default language must be in available languages' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const settings = await SystemLanguageSettingsModel.findOneAndUpdate(
      {},
      { 
        defaultLanguage,
        availableLanguages,
        enforceLanguage: !!enforceLanguage
      },
      { 
        new: true, 
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating language settings:', error);
    return NextResponse.json(
      { error: 'Failed to update language settings' },
      { status: 500 }
    );
  }
} 