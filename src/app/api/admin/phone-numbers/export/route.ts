import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';

export async function GET(request: NextRequest) {
  try {
    // Verify the user is authenticated and is an admin
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Connect to the database
    await connectToDatabase();

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const exportFormat = searchParams.get('export') || 'csv';
    
    // Build filter object from query params
    const filters: any = {};
    
    // Search filter
    const search = searchParams.get('search');
    if (search) {
      filters.$or = [
        { number: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
        { provider: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    const status = searchParams.getAll('status');
    if (status.length > 0) {
      filters.status = { $in: status };
    }

    // Country filter
    const country = searchParams.getAll('country');
    if (country.length > 0) {
      filters.country = { $in: country };
    }

    // Number type filter
    const numberType = searchParams.getAll('numberType');
    if (numberType.length > 0) {
      filters.numberType = { $in: numberType };
    }

    // Assigned to filter
    const assignedTo = searchParams.get('assignedTo');
    if (assignedTo) {
      if (assignedTo === 'unassigned') {
        filters.assignedToUser = { $exists: false };
      } else {
        filters.assignedToUser = assignedTo;
      }
    }

    // Fetch all phone numbers with populated user data
    const phoneNumbers = await PhoneNumber.find(filters)
      .populate('assignedTo', 'name email company onboarding')
      .sort({ createdAt: -1 })
      .lean();

    if (exportFormat === 'csv') {
      const csv = generateCSV(phoneNumbers);
      
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="phone-numbers-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported export format' }, { status: 400 });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

function generateCSV(phoneNumbers: any[]): string {
  // Define CSV headers
  const headers = [
    'Number',
    'Country',
    'Country Code',
    'Number Type',
    'Status',
    'Provider',
    'Currency',
    'Billing Cycle',
    'Billing Day',
    'Capabilities',
    'Connection Type',
    'IP Address',
    'Port',
    'Login',
    'Domain',
    'Credentials Port',
    'Assigned To (Name)',
    'Assigned To (Email)',
    'Assigned To (Company)',
    'Created At',
    'Updated At',
    'Monthly Rate',
    'Setup Fee',
    'Backorder Only',
    'Notes'
  ];

  // Generate CSV rows
  const rows = phoneNumbers.map(number => {
    return [
      escapeCSVValue(number.number || ''),
      escapeCSVValue(number.country || ''),
      escapeCSVValue(number.countryCode || ''),
      escapeCSVValue(number.numberType || ''),
      escapeCSVValue(number.status || ''),
      escapeCSVValue(number.provider || ''),
      escapeCSVValue(number.currency || ''),
      escapeCSVValue(number.billingCycle || ''),
      escapeCSVValue(number.billingDayOfMonth?.toString() || ''),
      escapeCSVValue(number.capabilities?.join(';') || ''),
      escapeCSVValue(number.connectionType || ''),
      escapeCSVValue(number.ipAddress || ''),
      escapeCSVValue(number.port?.toString() || ''),
      escapeCSVValue(number.login || ''),
      escapeCSVValue(number.domain || ''),
      escapeCSVValue(number.credentialsPort?.toString() || ''),
      escapeCSVValue(number.assignedTo?.name || ''),
      escapeCSVValue(number.assignedTo?.email || ''),
      escapeCSVValue(number.assignedTo?.company || number.assignedTo?.onboarding?.companyName || ''),
      escapeCSVValue(number.createdAt ? new Date(number.createdAt).toLocaleDateString() : ''),
      escapeCSVValue(number.updatedAt ? new Date(number.updatedAt).toLocaleDateString() : ''),
      escapeCSVValue(number.monthlyRate?.toString() || ''),
      escapeCSVValue(number.setupFee?.toString() || ''),
      escapeCSVValue(number.backorderOnly ? 'Yes' : 'No'),
      escapeCSVValue(number.notes || '')
    ];
  });

  // Combine headers and rows
  const csvLines = [headers, ...rows];
  return csvLines.map(row => row.join(',')).join('\n');
}

function escapeCSVValue(value: string): string {
  if (!value) return '';
  
  // Convert to string and handle special characters
  const stringValue = value.toString();
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
} 