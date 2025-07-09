import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';
import NumberRateDeck from '@/models/NumberRateDeck';
import NumberRate from '@/models/NumberRate';
import RateDeckAssignment from '@/models/RateDeckAssignment';
import mongoose from 'mongoose';

// TypeScript interfaces
interface PhoneNumberQuery {
  status: string;
  $or?: Array<{
    number?: { $regex: string; $options: string };
    country?: { $regex: string; $options: string };
    description?: { $regex: string; $options: string };
  }>;
  country?: string;
  numberType?: string;
}

interface SortOptions {
  [key: string]: 1 | -1;
}

interface PhoneNumberDocument {
  _id: mongoose.Types.ObjectId;
  number: string;
  country: string;
  numberType: string;
  rateDeckId?: mongoose.Types.ObjectId;
  setupFee?: number;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  backorderOnly?: boolean;
  description?: string;
  currency?: string;
  capabilities?: string[];
  provider?: string;
  monthlyRate?: number;
}

// GET - List available phone numbers for purchase
export async function GET(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to the database
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const country = searchParams.get('country');
    const numberType = searchParams.get('numberType');
    const sortBy = searchParams.get('sortBy') || 'monthlyRate';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build query for available phone numbers (both regular and backorder-only)
    // Note: Rate decks are now assigned to users, not phone numbers
    const query: PhoneNumberQuery = {
      status: 'available',
    };

    if (search) {
      query.$or = [
        { number: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (country) {
      query.country = country;
    }

    if (numberType) {
      query.numberType = numberType;
    }

    // Build sort object
    const sort: SortOptions = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [phoneNumbers, total, countries, numberTypes] = await Promise.all([
      PhoneNumber.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean() as Promise<PhoneNumberDocument[]>,
      PhoneNumber.countDocuments(query),
      // Get available countries for filter
      PhoneNumber.distinct('country', { status: 'available' }),
      // Get available number types for filter
      PhoneNumber.distinct('numberType', { status: 'available' })
    ]);

    console.log(`[API] Available numbers query result: ${phoneNumbers.length} numbers, total: ${total}`);

    // Get user's assigned rate deck
    const userRateDeck = await getUserAssignedRateDeck(user.id);
    console.log(`[API] User ${user.email} assigned rate deck:`, userRateDeck ? userRateDeck.name : 'None');

    // Transform the response and fetch rates for each number using user's rate deck
    // Filter out numbers that don't have matching rates
    const transformedNumbers = [];
    
    for (const number of phoneNumbers) {
      let rate = null;
      let monthlyRate = 0;
      let setupFee = number.setupFee || 0;

      if (userRateDeck) {
        rate = await findMatchingRateInDeck(number, userRateDeck._id.toString());
        if (rate) {
          monthlyRate = rate.rate;
          setupFee = rate.setupFee || setupFee;
        }
      }

      console.log(`[API] Number ${number.number}: user rate deck=${userRateDeck?.name || 'None'}, rate=${rate?.rate || 'not found'}, prefix=${rate?.prefix || 'N/A'}`);
      
      // Only include numbers that have a matching rate
      if (rate && monthlyRate > 0) {
        transformedNumbers.push({
          ...number,
          _id: number._id.toString(),
          // Remove rateDeckId since it's no longer stored on phone numbers
          monthlyRate,
          setupFee,
          ratePrefix: rate?.prefix,
          rateDescription: rate?.description,
          userRateDeckName: userRateDeck?.name,
          userRateDeckCurrency: userRateDeck?.currency || 'USD',
          createdAt: number.createdAt.toISOString(),
          updatedAt: number.updatedAt.toISOString(),
        });
      } else {
        console.log(`[API] Filtering out number ${number.number} - no matching rate found`);
      }
    }

    // Note: total and pagination are approximate since we filter out numbers without rates
    const actualTotal = transformedNumbers.length;
    const totalPages = Math.ceil(total / limit); // Keep original for pagination UI consistency

    return NextResponse.json({
      phoneNumbers: transformedNumbers,
      total: actualTotal, // Actual count of numbers with rates
      originalTotal: total, // Original count before filtering
      page,
      limit,
      totalPages,
      filters: {
        countries: countries.sort(),
        numberTypes: numberTypes.sort(),
      },
    });
  } catch (error) {
    console.error('Error fetching available phone numbers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available phone numbers' },
      { status: 500 }
    );
  }
}

// Helper function to get user's assigned rate deck
const getUserAssignedRateDeck = async (userId: string) => {
  try {
    const assignment = await RateDeckAssignment.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      rateDeckType: 'number', // Only number rate decks (corrected field name)
      isActive: true
    }).populate('rateDeckId').lean();

    if (assignment && assignment.rateDeckId) {
      return assignment.rateDeckId as any; // Populated rate deck
    }
    return null;
  } catch (error) {
    console.error('Error getting user assigned rate deck:', error);
    return null;
  }
};

// Helper function to find matching rate in a specific rate deck
const findMatchingRateInDeck = async (phoneNumber: PhoneNumberDocument, rateDeckId: string) => {
  if (!rateDeckId) return null;
  
  console.log(`[Rate Matching] Looking for rates for number: ${phoneNumber.number}, country: ${phoneNumber.country}, type: ${phoneNumber.numberType}, rateDeckId: ${rateDeckId}`);
  
  // Find all rates for this rate deck
  const rates = await NumberRate.find({
    rateDeckId: new mongoose.Types.ObjectId(rateDeckId),
  }).lean();
  
  console.log(`[Rate Matching] Found ${rates.length} rates in deck ${rateDeckId}`);
  
  if (rates.length > 0) {
    console.log(`[Rate Matching] Sample rates:`, rates.slice(0, 3).map(r => ({
      prefix: r.prefix,
      country: r.country,
      type: r.type,
      rate: r.rate
    })));
  }
  
  // Normalize phone number for prefix matching (remove + and any spaces)
  const normalizedNumber = phoneNumber.number.replace(/^\+/, '').replace(/\s/g, '');
  console.log(`[Rate Matching] Normalized phone number: ${normalizedNumber} (from ${phoneNumber.number})`);
  
  // First, try to find rates matching country and type
  const countryTypeRates = rates.filter(rate => 
    rate.country.toLowerCase() === phoneNumber.country.toLowerCase() && 
    rate.type === phoneNumber.numberType
  );
  
  console.log(`[Rate Matching] Found ${countryTypeRates.length} rates matching country and type`);
  
  if (countryTypeRates.length > 0) {
    // Among matching country/type rates, find the one with longest matching prefix
    let bestMatch = null;
    let longestMatch = 0;
    
    for (const rate of countryTypeRates) {
      // Normalize rate prefix for comparison (remove + and spaces)
      const normalizedPrefix = rate.prefix.replace(/^\+/, '').replace(/\s/g, '');
      const matches = normalizedNumber.startsWith(normalizedPrefix);
      
      console.log(`[Rate Matching] Checking prefix ${rate.prefix} (normalized: ${normalizedPrefix}) against ${normalizedNumber}: ${matches}`);
      
      if (matches && normalizedPrefix.length > longestMatch) {
        bestMatch = rate;
        longestMatch = normalizedPrefix.length;
      }
    }
    
    if (bestMatch) {
      console.log(`[Rate Matching] Best match: prefix=${bestMatch.prefix}, rate=${bestMatch.rate}, setupFee=${bestMatch.setupFee}`);
      return bestMatch;
    }
  }
  
  // Fallback: try prefix matching only
  console.log(`[Rate Matching] No country/type match, trying prefix-only matching`);
  let bestMatch = null;
  let longestMatch = 0;
  
  for (const rate of rates) {
    // Normalize rate prefix for comparison (remove + and spaces)
    const normalizedPrefix = rate.prefix.replace(/^\+/, '').replace(/\s/g, '');
    const matches = normalizedNumber.startsWith(normalizedPrefix);
    
    if (matches && normalizedPrefix.length > longestMatch) {
      bestMatch = rate;
      longestMatch = normalizedPrefix.length;
    }
  }
  
  if (bestMatch) {
    console.log(`[Rate Matching] Fallback match: prefix=${bestMatch.prefix}, rate=${bestMatch.rate}, country=${bestMatch.country}, type=${bestMatch.type}`);
  } else {
    console.log(`[Rate Matching] No matching rate found for ${phoneNumber.number}`);
  }
  
  return bestMatch;
};

// Legacy helper function (kept for compatibility but not used)
const findMatchingRate = async (phoneNumber: PhoneNumberDocument, rateDeckId: string) => {
  if (!rateDeckId) return null;
  
  console.log(`[Rate Matching] Looking for rates for number: ${phoneNumber.number}, country: ${phoneNumber.country}, type: ${phoneNumber.numberType}, rateDeckId: ${rateDeckId}`);
  
  // Find all rates for this rate deck
  const rates = await NumberRate.find({
    rateDeckId: new mongoose.Types.ObjectId(rateDeckId),
  }).lean();
  
  console.log(`[Rate Matching] Found ${rates.length} rates in deck ${rateDeckId}`);
  
  if (rates.length > 0) {
    console.log(`[Rate Matching] Sample rates:`, rates.slice(0, 3).map(r => ({
      prefix: r.prefix,
      country: r.country,
      type: r.type,
      rate: r.rate
    })));
  }
  
  // Normalize phone number for prefix matching (remove + and any spaces)
  const normalizedNumber = phoneNumber.number.replace(/^\+/, '').replace(/\s/g, '');
  console.log(`[Rate Matching] Normalized phone number: ${normalizedNumber} (from ${phoneNumber.number})`);
  
  // First, try to find rates matching country and type
  const countryTypeRates = rates.filter(rate => 
    rate.country.toLowerCase() === phoneNumber.country.toLowerCase() && 
    rate.type === phoneNumber.numberType
  );
  
  console.log(`[Rate Matching] Found ${countryTypeRates.length} rates matching country and type`);
  
  if (countryTypeRates.length > 0) {
    // Among matching country/type rates, find the one with longest matching prefix
    let bestMatch = null;
    let longestMatch = 0;
    
    for (const rate of countryTypeRates) {
      // Normalize rate prefix for comparison (remove + and spaces)
      const normalizedPrefix = rate.prefix.replace(/^\+/, '').replace(/\s/g, '');
      const matches = normalizedNumber.startsWith(normalizedPrefix);
      
      console.log(`[Rate Matching] Checking prefix ${rate.prefix} (normalized: ${normalizedPrefix}) against ${normalizedNumber}: ${matches}`);
      
      if (matches && normalizedPrefix.length > longestMatch) {
        bestMatch = rate;
        longestMatch = normalizedPrefix.length;
      }
    }
    
    if (bestMatch) {
      console.log(`[Rate Matching] Best match: prefix=${bestMatch.prefix}, rate=${bestMatch.rate}, setupFee=${bestMatch.setupFee}`);
      return bestMatch;
    }
  }
  
  // Fallback: try prefix matching only
  console.log(`[Rate Matching] No country/type match, trying prefix-only matching`);
  let bestMatch = null;
  let longestMatch = 0;
  
  for (const rate of rates) {
    // Normalize rate prefix for comparison (remove + and spaces)
    const normalizedPrefix = rate.prefix.replace(/^\+/, '').replace(/\s/g, '');
    const matches = normalizedNumber.startsWith(normalizedPrefix);
    
    if (matches && normalizedPrefix.length > longestMatch) {
      bestMatch = rate;
      longestMatch = normalizedPrefix.length;
    }
  }
  
  if (bestMatch) {
    console.log(`[Rate Matching] Fallback match: prefix=${bestMatch.prefix}, rate=${bestMatch.rate}, country=${bestMatch.country}, type=${bestMatch.type}`);
  } else {
    console.log(`[Rate Matching] No matching rate found for ${phoneNumber.number}`);
  }
  
  return bestMatch;
}; 