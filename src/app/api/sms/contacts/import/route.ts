import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getCurrentUser } from '@/lib/authService';
import SmsContact from '@/models/SmsContact';
import SmsContactList from '@/models/SmsContactList';

interface ImportedContact {
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  zipCode?: string;
  city?: string;
  customFields?: { [key: string]: string };
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: Array<{
    row: number;
    phoneNumber?: string;
    error: string;
  }>;
  duplicates: number;
}

// POST /api/sms/contacts/import - Import contacts from CSV
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const listId = formData.get('listId') as string;
    const skipDuplicates = formData.get('skipDuplicates') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Only CSV files are supported' }, { status: 400 });
    }

    // Validate list if provided
    if (listId) {
      const list = await SmsContactList.findOne({
        _id: listId,
        userId: user.id
      });

      if (!list) {
        return NextResponse.json({ error: 'Invalid contact list' }, { status: 400 });
      }
    }

    // Parse CSV content
    const fileContent = await file.text();
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const phoneNumberIndex = findColumnIndex(header, ['phone', 'phonenumber', 'mobile', 'number']);
    
    if (phoneNumberIndex === -1) {
      return NextResponse.json({ 
        error: 'Phone number column not found. Expected columns: phone, phoneNumber, mobile, or number' 
      }, { status: 400 });
    }

    // Map other columns
    const firstNameIndex = findColumnIndex(header, ['firstname', 'first_name', 'fname']);
    const lastNameIndex = findColumnIndex(header, ['lastname', 'last_name', 'lname']);
    const dateOfBirthIndex = findColumnIndex(header, ['dateofbirth', 'date_of_birth', 'dob', 'birthday']);
    const zipCodeIndex = findColumnIndex(header, ['zipcode', 'zip_code', 'zip', 'postal', 'postalcode']);
    const cityIndex = findColumnIndex(header, ['city', 'town']);

    // Find custom field columns
    const standardColumns = ['phone', 'phonenumber', 'mobile', 'number', 'firstname', 'first_name', 'fname', 
                           'lastname', 'last_name', 'lname', 'dateofbirth', 'date_of_birth', 'dob', 'birthday',
                           'zipcode', 'zip_code', 'zip', 'postal', 'postalcode', 'city', 'town'];
    
    const customFieldIndexes = header
      .map((col, index) => ({ col: col.toLowerCase(), index }))
      .filter(({ col }) => !standardColumns.includes(col))
      .reduce((acc, { col, index }) => {
        acc[header[index]] = index;
        return acc;
      }, {} as { [key: string]: number });

    const result: ImportResult = {
      success: true,
      imported: 0,
      errors: [],
      duplicates: 0
    };

    // Get existing phone numbers for duplicate checking
    const existingContacts = await SmsContact.find({
      userId: user.id
    }).select('phoneNumber');
    
    const existingPhones = new Set(existingContacts.map(c => c.phoneNumber));

    // Process contacts in batches
    const batchSize = 100;
    const contactsToInsert: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      const rowNumber = i + 1;

      try {
        const phoneNumber = cleanPhoneNumber(values[phoneNumberIndex] || '');
        
        if (!phoneNumber) {
          result.errors.push({
            row: rowNumber,
            error: 'Empty phone number'
          });
          continue;
        }

        // Validate phone number format
        const phoneRegex = /^\+?\d{7,15}$/;
        if (!phoneRegex.test(phoneNumber)) {
          result.errors.push({
            row: rowNumber,
            phoneNumber,
            error: 'Invalid phone number format'
          });
          continue;
        }

        // Check for duplicates
        if (existingPhones.has(phoneNumber)) {
          result.duplicates++;
          if (skipDuplicates) {
            continue;
          } else {
            result.errors.push({
              row: rowNumber,
              phoneNumber,
              error: 'Duplicate phone number'
            });
            continue;
          }
        }

        // Parse custom fields
        const customFields: { [key: string]: string } = {};
        for (const [fieldName, index] of Object.entries(customFieldIndexes)) {
          if (values[index] && values[index].trim()) {
            customFields[fieldName] = values[index].trim();
          }
        }

        // Create contact object
        const contact = {
          userId: user.id,
          phoneNumber,
          firstName: values[firstNameIndex]?.trim() || undefined,
          lastName: values[lastNameIndex]?.trim() || undefined,
          dateOfBirth: values[dateOfBirthIndex] ? parseDate(values[dateOfBirthIndex]) : undefined,
          zipCode: values[zipCodeIndex]?.trim() || undefined,
          city: values[cityIndex]?.trim() || undefined,
          customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
          listId: listId || undefined,
          isActive: true
        };

        contactsToInsert.push(contact);
        existingPhones.add(phoneNumber); // Prevent duplicates within the same import

        // Insert batch when it reaches the batch size
        if (contactsToInsert.length >= batchSize) {
          await insertBatch(contactsToInsert);
          result.imported += contactsToInsert.length;
          contactsToInsert.length = 0;
        }

      } catch (error) {
        result.errors.push({
          row: rowNumber,
          phoneNumber: values[phoneNumberIndex] || '',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Insert remaining contacts
    if (contactsToInsert.length > 0) {
      await insertBatch(contactsToInsert);
      result.imported += contactsToInsert.length;
    }

    // Update list contact count if needed
    if (listId && result.imported > 0) {
      await SmsContactList.findByIdAndUpdate(listId, {
        $inc: { contactCount: result.imported }
      });
    }

    result.success = result.errors.length === 0;

    return NextResponse.json(result);

  } catch (error) {
    console.error('Import contacts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions
function findColumnIndex(header: string[], possibleNames: string[]): number {
  const lowerHeader = header.map(h => h.toLowerCase().replace(/[_\s]/g, ''));
  const lowerPossibleNames = possibleNames.map(n => n.toLowerCase().replace(/[_\s]/g, ''));
  
  for (const name of lowerPossibleNames) {
    const index = lowerHeader.indexOf(name);
    if (index !== -1) {
      return index;
    }
  }
  return -1;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function cleanPhoneNumber(phone: string): string {
  // Remove quotes and whitespace
  return phone.replace(/["\s]/g, '');
}

function parseDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  
  const cleaned = dateStr.trim().replace(/"/g, '');
  const date = new Date(cleaned);
  
  return isNaN(date.getTime()) ? undefined : date;
}

async function insertBatch(contacts: any[]): Promise<void> {
  try {
    await SmsContact.insertMany(contacts, { ordered: false });
  } catch (error: any) {
    // Handle bulk insert errors
    if (error.code === 11000) {
      // Duplicate key error - some contacts might have been inserted
      console.warn('Some contacts were duplicates during batch insert');
    } else {
      throw error;
    }
  }
} 