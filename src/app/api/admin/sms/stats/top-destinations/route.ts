import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import SmsMessage from '@/models/SmsMessage';
import { Country } from '@/models/Country';
import { connectToDatabase } from '@/lib/db';

async function getCountryInfo(prefix: string): Promise<{ name: string; iso: string }> {
  try {
    // Try to find country by exact phone code match
    let country = await Country.findOne({ phoneCode: prefix, isActive: true });
    
    if (!country) {
      // Try partial matches for longer prefixes (e.g., prefix "212" might match phoneCode "21")
      for (let i = prefix.length - 1; i > 0; i--) {
        const partialPrefix = prefix.substring(0, i);
        country = await Country.findOne({ phoneCode: partialPrefix, isActive: true });
        if (country) break;
      }
    }
    
    if (country) {
      return {
        name: country.name,
        iso: country.code
      };
    }
    
    return {
      name: `Unknown (+${prefix})`,
      iso: 'XX' // Default for unknown countries
    };
  } catch (error) {
    return {
      name: `Unknown (+${prefix})`,
      iso: 'XX'
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'current-month';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Calculate date ranges based on period
    const now = new Date();
    let matchCondition: any = {};

    switch (period) {
      case 'current-month':
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        matchCondition = { createdAt: { $gte: startOfThisMonth } };
        break;
      
      case 'last-month':
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        matchCondition = { 
          createdAt: { 
            $gte: startOfLastMonth, 
            $lte: endOfLastMonth 
          } 
        };
        break;
      
      case 'today':
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        matchCondition = { createdAt: { $gte: startOfToday } };
        break;
      
      case 'custom':
        if (startDate && endDate) {
          matchCondition = {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          };
        } else {
          return NextResponse.json(
            { error: 'Start date and end date are required for custom range' },
            { status: 400 }
          );
        }
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid period. Use: current-month, last-month, today, or custom' },
          { status: 400 }
        );
    }

    // Get top destinations with aggregation
    const topDestinations = await SmsMessage.aggregate([
      {
        $match: matchCondition
      },
      {
        $group: {
          _id: '$prefix',
          messageCount: { $sum: 1 },
          totalCost: { $sum: '$cost' },
          uniqueNumbers: { $addToSet: '$to' },
          successfulMessages: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          failedMessages: {
            $sum: { $cond: [{ $in: ['$status', ['failed', 'undelivered']] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          prefix: '$_id',
          messageCount: 1,
          totalCost: 1,
          uniqueNumbers: { $size: '$uniqueNumbers' },
          successfulMessages: 1,
          failedMessages: 1,
          successRate: {
            $cond: [
              { $gt: ['$messageCount', 0] },
              { $multiply: [{ $divide: ['$successfulMessages', '$messageCount'] }, 100] },
              0
            ]
          }
        }
      },
      {
        $sort: { messageCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Add country names and ISO codes to the results
    const topDestinationsWithCountries = await Promise.all(
      topDestinations.map(async (dest) => {
        const countryInfo = await getCountryInfo(dest.prefix);
        return {
          ...dest,
          countryName: countryInfo.name,
          countryIso: countryInfo.iso
        };
      })
    );

    return NextResponse.json({
      success: true,
      topDestinations: topDestinationsWithCountries,
      period,
      totalResults: topDestinationsWithCountries.length
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 