import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/authService';
import { UserRole } from '@/models/User';

// POST /api/settings/branding/upload - Upload logo or favicon
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const user = await getCurrentUser();
    if (!user || user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'logo', 'darkLogo', or 'favicon'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!type || !['logo', 'darkLogo', 'favicon'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Must be "logo", "darkLogo", or "favicon"' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size too large. Maximum 5MB allowed.' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (type === 'favicon') {
      allowedMimeTypes.push('image/x-icon', 'image/vnd.microsoft.icon');
    }

    if (!allowedMimeTypes.includes(file.type)) {
      const friendlyTypes = allowedMimeTypes.map(type => {
        switch (type) {
          case 'image/jpeg': return 'JPEG';
          case 'image/jpg': return 'JPG';
          case 'image/png': return 'PNG';
          case 'image/gif': return 'GIF';
          case 'image/webp': return 'WebP';
          case 'image/svg+xml': return 'SVG';
          case 'image/x-icon': return 'ICO';
          case 'image/vnd.microsoft.icon': return 'ICO';
          default: return type;
        }
      });
      return NextResponse.json(
        { error: `Invalid file type. Allowed formats: ${friendlyTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'branding');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = path.extname(file.name);
    const filePrefix = type === 'darkLogo' ? 'dark-logo' : type;
    const fileName = `${filePrefix}-${timestamp}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return the public URL
    const publicUrl = `/uploads/branding/${fileName}`;

    return NextResponse.json({
      message: 'File uploaded successfully',
      url: publicUrl,
      fileName: fileName,
      type: type,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 