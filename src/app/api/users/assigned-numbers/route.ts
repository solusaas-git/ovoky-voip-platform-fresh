import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';
import PhoneNumberAssignment from '@/models/PhoneNumberAssignment';
import mongoose from 'mongoose';

// GET - Get assigned phone numbers for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');

    // Build query for user's assigned phone numbers
    const query: any = {
      assignedTo: new mongoose.Types.ObjectId(user.id),
      status: 'assigned'
    };

    // Add country filter if provided
    if (country) {
      // Country parameter could be country code (US) or country name (United States)
      if (country.length <= 3) {
        // For country codes, we need to handle both formats:
        // - New format: countryCode stores country code (e.g., "MA")
        // - Old format: countryCode stores phone code (e.g., "+212")
        
        // Create a compound query to match different formats:
        // 1. New format: countryCode stores country code (e.g., "MA")
        // 2. Old format: countryCode stores phone code with + (e.g., "+212")
        // 3. Older format: countryCode stores phone code without + (e.g., "212")
        query.$or = [
          { countryCode: country },  // New format: exact country code match (MA)
          { countryCode: `+${country}` },  // Edge case: country code with + prefix
        ];
        
        // Map country codes to phone codes for backward compatibility
        const countryMappings: { [key: string]: string } = {
          'US': '1', 'CA': '1', 'GB': '44', 'FR': '33', 'DE': '49', 'IT': '39', 
          'ES': '34', 'NL': '31', 'AU': '61', 'JP': '81', 'CN': '86', 'IN': '91',
          'BR': '55', 'MX': '52', 'AR': '54', 'RU': '7', 'KR': '82', 'SG': '65',
          'HK': '852', 'TW': '886', 'MY': '60', 'TH': '66', 'ID': '62', 'PH': '63',
          'VN': '84', 'PK': '92', 'BD': '880', 'LK': '94', 'NP': '977', 'MM': '95',
          'KH': '855', 'LA': '856', 'MN': '976', 'KP': '850', 'IR': '98', 'IQ': '964',
          'AF': '93', 'SA': '966', 'AE': '971', 'QA': '974', 'KW': '965', 'BH': '973',
          'OM': '968', 'JO': '962', 'LB': '961', 'SY': '963', 'IL': '972', 'PS': '970',
          'TR': '90', 'GR': '30', 'CY': '357', 'EG': '20', 'LY': '218', 'TN': '216',
          'DZ': '213', 'MA': '212', 'SD': '249', 'ET': '251', 'KE': '254', 'UG': '256',
          'TZ': '255', 'RW': '250', 'NG': '234', 'GH': '233', 'CI': '225', 'SN': '221',
          'ML': '223', 'BF': '226', 'NE': '227', 'TD': '235', 'CM': '237', 'CF': '236',
          'GA': '241', 'CG': '242', 'CD': '243', 'AO': '244', 'ZM': '260', 'ZW': '263',
          'BW': '267', 'NA': '264', 'ZA': '27', 'LS': '266', 'SZ': '268', 'MZ': '258',
          'MW': '265', 'MG': '261', 'MU': '230', 'SC': '248', 'UA': '380', 'BY': '375',
          'MD': '373', 'RO': '40', 'BG': '359', 'RS': '381', 'HR': '385', 'SI': '386',
          'SK': '421', 'CZ': '420', 'HU': '36', 'PL': '48', 'LT': '370', 'LV': '371',
          'EE': '372', 'FI': '358', 'SE': '46', 'NO': '47', 'DK': '45', 'IS': '354',
          'IE': '353', 'PT': '351', 'CH': '41', 'AT': '43', 'BE': '32', 'LU': '352',
          'MT': '356', 'MC': '377', 'AD': '376', 'SM': '378', 'VA': '39', 'LI': '423'
        };
        
        // Add phone code matches for old format
        if (countryMappings[country]) {
          const phoneCode = countryMappings[country];
          query.$or.push({ countryCode: `+${phoneCode}` }); // With + prefix
          query.$or.push({ countryCode: phoneCode }); // Without + prefix (this is what we need!)
        }
        
      } else {
        query.country = country;
      }
    }

    // Get user's assigned phone numbers
    const phoneNumbers = await PhoneNumber
      .find(query)
      .select('number country countryCode numberType description capabilities monthlyRate setupFee currency assignedAt')
      .sort({ assignedAt: -1 })
      .lean();



    // Get assignment details for these phone numbers
    const phoneNumberIds = phoneNumbers.map(pn => pn._id);
    const assignments = await PhoneNumberAssignment
      .find({
        phoneNumberId: { $in: phoneNumberIds },
        userId: new mongoose.Types.ObjectId(user.id),
        status: 'active'
      })
      .select('phoneNumberId assignedAt billingStartDate notes')
      .lean();

    // Create a map of assignment details
    const assignmentMap = new Map(
      assignments.map(assignment => [assignment.phoneNumberId.toString(), assignment])
    );

    // Format response
    const assignedNumbers = phoneNumbers.map(phoneNumber => {
      const assignment = assignmentMap.get(phoneNumber._id.toString());
      
      return {
        number: phoneNumber.number,
        description: phoneNumber.description || `${phoneNumber.country} ${phoneNumber.numberType}`,
        type: phoneNumber.numberType,
        country: phoneNumber.country,
        countryCode: phoneNumber.countryCode,
        capabilities: phoneNumber.capabilities || [],
        monthlyRate: phoneNumber.monthlyRate || 0,
        setupFee: phoneNumber.setupFee || 0,
        currency: phoneNumber.currency || 'USD',
        assignedAt: phoneNumber.assignedAt || assignment?.assignedAt,
        billingStartDate: assignment?.billingStartDate,
        notes: assignment?.notes,
      };
    });

    return NextResponse.json({
      assignedNumbers,
      total: assignedNumbers.length,
      filteredByCountry: country || null,
    });

  } catch (error) {
    console.error('Error fetching assigned numbers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 