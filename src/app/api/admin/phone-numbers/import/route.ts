import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';

interface ImportConfig {
  columnMapping: Record<string, string>;
  importDefaults: {
    country: string;
    countryCode: string;
    provider: string;
    numberType: string;
    currency: string;
    capabilities: string[];
    connectionType?: string;
  };
  delimiter: string;
  csvHeaders: string[];
}

const parseCSVLine = (line: string, delimiter: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === delimiter && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result.map(field => field.replace(/^"|"$/g, '')); // Remove surrounding quotes
};

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated and is an admin
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectToDatabase();

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const configStr = formData.get('config') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!configStr) {
      return NextResponse.json({ error: 'No import configuration provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Invalid file type. Please upload a CSV file.' }, { status: 400 });
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }

    // Parse import configuration
    let config: ImportConfig;
    try {
      config = JSON.parse(configStr);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid import configuration' }, { status: 400 });
    }

    // Validate required configuration
    if (!config.columnMapping.number) {
      return NextResponse.json({ error: 'Phone number column mapping is required' }, { status: 400 });
    }

    const { importDefaults } = config;
    if (!importDefaults.country || !importDefaults.provider || !importDefaults.numberType || !importDefaults.currency) {
      return NextResponse.json({ 
        error: 'Missing required system defaults: country, provider, numberType, and currency are required' 
      }, { status: 400 });
    }

    if (!importDefaults.capabilities || importDefaults.capabilities.length === 0) {
      return NextResponse.json({ error: 'At least one capability must be selected' }, { status: 400 });
    }

    // Read file content
    const fileContent = await file.text();
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file must have at least a header row and one data row' }, { status: 400 });
    }

    // Parse data rows (skip header)
    const dataRows = lines.slice(1);
    const results = {
      total: dataRows.length,
      success: 0,
      errors: [] as Array<{ row: number; error: string; data?: any }>
    };

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const rowNumber = i + 2; // +2 because we're 1-indexed and skipping header
      
      try {
        const rowData = parseCSVLine(dataRows[i], config.delimiter);
        
        // Map CSV data using column mappings
        const phoneNumberData: any = {
          // System defaults
          country: importDefaults.country,
          countryCode: importDefaults.countryCode,
          provider: importDefaults.provider,
          numberType: importDefaults.numberType,
          currency: importDefaults.currency,
          capabilities: importDefaults.capabilities,
          connectionType: importDefaults.connectionType,
          // Admin fields
          createdBy: user.email,
          status: 'available',
        };

        // Map CSV fields
        Object.entries(config.columnMapping).forEach(([field, columnName]) => {
          if (columnName && columnName !== 'none') {
            const columnIndex = config.csvHeaders.indexOf(columnName);
            if (columnIndex !== -1 && rowData[columnIndex]) {
              let value = rowData[columnIndex].trim();
              
              // Handle specific field types
              if (field === 'port' || field === 'credentialsPort') {
                const numValue = parseInt(value);
                if (!isNaN(numValue)) {
                  phoneNumberData[field] = numValue;
                }
              } else {
                phoneNumberData[field] = value;
              }
            }
          }
        });

        // Validate required phone number field
        if (!phoneNumberData.number) {
          throw new Error('Phone number is required');
        }

        // Check if phone number already exists
        const existingNumber = await PhoneNumber.findOne({ number: phoneNumberData.number });
        if (existingNumber) {
          throw new Error(`Phone number ${phoneNumberData.number} already exists`);
        }

        // Create the phone number
        const phoneNumber = new PhoneNumber(phoneNumberData);
        await phoneNumber.save();
        
        results.success++;
      } catch (error: any) {
        results.errors.push({
          row: rowNumber,
          error: error.message || 'Unknown error',
          data: dataRows[i]
        });
      }
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import phone numbers' },
      { status: 500 }
    );
  }
} 