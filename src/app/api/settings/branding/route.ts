import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import BrandingSettings from '@/models/BrandingSettings';
import { getCurrentUser } from '@/lib/authService';
import { UserRole } from '@/models/User';

// GET /api/settings/branding - Get branding settings
export async function GET() {
  try {
    await connectToDatabase();
    
    // Get branding settings (public endpoint for theme application)
    const settings = await BrandingSettings.getSettings();
    
    if (!settings) {
      return NextResponse.json(
        { error: 'Branding settings not found' },
        { status: 404 }
      );
    }

    // Return settings without sensitive information
    const publicSettings = {
      companyName: settings.companyName,
      companySlogan: settings.companySlogan,
      logoUrl: settings.logoUrl,
      darkLogoUrl: settings.darkLogoUrl,
      faviconUrl: settings.faviconUrl,
      logoAltText: settings.logoAltText,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      accentColor: settings.accentColor,
      backgroundColor: settings.backgroundColor,
      textColor: settings.textColor,
      surfaceColor: settings.surfaceColor,
      
      // Dark mode colors
      darkPrimaryColor: settings.darkPrimaryColor,
      darkSecondaryColor: settings.darkSecondaryColor,
      darkAccentColor: settings.darkAccentColor,
      darkBackgroundColor: settings.darkBackgroundColor,
      darkTextColor: settings.darkTextColor,
      darkSurfaceColor: settings.darkSurfaceColor,
      
      gradientStartColor: settings.gradientStartColor,
      gradientMiddleColor: settings.gradientMiddleColor,
      gradientEndColor: settings.gradientEndColor,
      
      // Auth form background colors
      authFormBackgroundColor: settings.authFormBackgroundColor,
      darkAuthFormBackgroundColor: settings.darkAuthFormBackgroundColor,
      
      fontFamily: settings.fontFamily,
      headingFontFamily: settings.headingFontFamily,
      borderRadius: settings.borderRadius,
      shadowIntensity: settings.shadowIntensity,
      enableAnimations: settings.enableAnimations,
      enableGlassMorphism: settings.enableGlassMorphism,
      enableGradientBackground: settings.enableGradientBackground,
      customCss: settings.customCss,
    };

    return NextResponse.json(publicSettings);
  } catch (error) {
    console.error('Error fetching branding settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/settings/branding - Update branding settings (Admin only)
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Check authentication and admin role
    const user = await getCurrentUser();
    if (!user || user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    let updates;
    try {
      updates = await request.json();
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    // Sanitize data - convert empty strings to undefined for optional fields
    const sanitizeData = (data: Record<string, unknown>) => {
      const sanitized = { ...data };
      
      // Convert empty strings to undefined for optional fields
      const optionalFields = [
        'companySlogan', 'logoUrl', 'darkLogoUrl', 'faviconUrl', 'logoAltText',
        'accentColor', 'backgroundColor', 'textColor', 'surfaceColor',
        'darkPrimaryColor', 'darkSecondaryColor', 'darkAccentColor', 
        'darkBackgroundColor', 'darkTextColor', 'darkSurfaceColor',
        'gradientStartColor', 'gradientMiddleColor', 'gradientEndColor',
        'authFormBackgroundColor', 'darkAuthFormBackgroundColor',
        'fontFamily', 'headingFontFamily', 'borderRadius',
        'contactEmail', 'supportEmail', 'websiteUrl', 'customCss'
      ];
      
      optionalFields.forEach(field => {
        if (sanitized[field] === '') {
          sanitized[field] = undefined;
        }
      });
      
      // Handle social links
      if (sanitized.socialLinks && typeof sanitized.socialLinks === 'object') {
        const socialLinks = sanitized.socialLinks as Record<string, unknown>;
        Object.keys(socialLinks).forEach(key => {
          if (socialLinks[key] === '') {
            socialLinks[key] = undefined;
          }
        });
      }
      
      return sanitized;
    };
    
    const sanitizedUpdates = sanitizeData(updates);
    
    // Validate color formats if provided
    const colorFields = [
      'primaryColor', 'secondaryColor', 'accentColor', 
      'backgroundColor', 'textColor', 'surfaceColor',
      'darkPrimaryColor', 'darkSecondaryColor', 'darkAccentColor', 
      'darkBackgroundColor', 'darkTextColor', 'darkSurfaceColor',
      'gradientStartColor', 'gradientMiddleColor', 'gradientEndColor',
      'authFormBackgroundColor', 'darkAuthFormBackgroundColor'
    ];
    
    for (const field of colorFields) {
      const value = sanitizedUpdates[field];
      if (value && typeof value === 'string' && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
        return NextResponse.json(
          { error: `Invalid color format for ${field}. Please use hex format (#RRGGBB or #RGB)` },
          { status: 400 }
        );
      }
    }

    // Validate email formats if provided
    const emailFields = ['contactEmail', 'supportEmail'];
    for (const field of emailFields) {
      const value = sanitizedUpdates[field];
      if (value && typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return NextResponse.json(
          { error: `Invalid email format for ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate URL formats if provided
    const urlFields = ['websiteUrl'];
    const socialFields = ['twitter', 'linkedin', 'facebook', 'instagram'];
    
    for (const field of urlFields) {
      const value = sanitizedUpdates[field];
      if (value && typeof value === 'string' && !/^https?:\/\/.+/.test(value)) {
        return NextResponse.json(
          { error: `Invalid URL format for ${field}` },
          { status: 400 }
        );
      }
    }

    if (sanitizedUpdates.socialLinks && typeof sanitizedUpdates.socialLinks === 'object') {
      const socialLinks = sanitizedUpdates.socialLinks as Record<string, unknown>;
      for (const field of socialFields) {
        const value = socialLinks[field];
        if (value && typeof value === 'string' && !/^https?:\/\/.+/.test(value)) {
          return NextResponse.json(
            { error: `Invalid URL format for social link ${field}` },
            { status: 400 }
          );
        }
      }
    }

    // Update settings with proper error handling
    let updatedSettings;
    try {
      updatedSettings = await BrandingSettings.updateSettings(sanitizedUpdates);
    } catch (dbError: unknown) {
      console.error('Database error updating branding settings:', dbError);
      
      // Handle MongoDB validation errors
      if (dbError && typeof dbError === 'object' && 'name' in dbError && dbError.name === 'ValidationError') {
        const hasErrors = 'errors' in dbError && dbError.errors && typeof dbError.errors === 'object';
        if (hasErrors) {
          const validationError = dbError as { errors: Record<string, { message: string }> };
          const validationErrors = Object.values(validationError.errors).map((error) => error.message);
          return NextResponse.json(
            { error: `Validation error: ${validationErrors.join(', ')}` },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: 'Validation error occurred' },
          { status: 400 }
        );
      }
      
      // Handle other database errors
      return NextResponse.json(
        { error: 'Database error occurred while updating settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Branding settings updated successfully',
      settings: updatedSettings,
    });
  } catch (error: unknown) {
    console.error('Error updating branding settings:', error);
    
    // Ensure we always return JSON, never HTML
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// GET /api/settings/branding/admin - Get full branding settings for admin
export async function PATCH() {
  try {
    await connectToDatabase();
    
    // Check authentication and admin role
    const user = await getCurrentUser();
    if (!user || user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const settings = await BrandingSettings.getSettings();
    
    if (!settings) {
      return NextResponse.json(
        { error: 'Branding settings not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching admin branding settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 