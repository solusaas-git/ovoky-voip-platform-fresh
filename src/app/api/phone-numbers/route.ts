import { NextRequest, NextResponse } from 'next/server';
import { requireActiveUser } from '@/lib/authMiddleware';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';
import PhoneNumberBilling from '@/models/PhoneNumberBilling';
import PhoneNumberAssignment from '@/models/PhoneNumberAssignment';
import NumberRateDeck from '@/models/NumberRateDeck';
import NumberRate from '@/models/NumberRate';
import mongoose from 'mongoose';

// TypeScript interfaces
interface PhoneNumberQuery {
  status: string;
  rateDeckId?: { $exists: boolean; $ne: null };
  backorderOnly?: { $ne: boolean };
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

interface PhoneNumberQueryFilter {
  assignedTo: mongoose.Types.ObjectId;
  status: string;
  $or?: Array<{
    number?: { $regex: string; $options: string };
    country?: { $regex: string; $options: string };
    description?: { $regex: string; $options: string };
  }>;
}

// GET - List user's assigned phone numbers
export async function GET(request: NextRequest) {
  try {
    // Verify the user is authenticated and not suspended
    const authResult = await requireActiveUser();
    
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    
    const user = authResult.user;

    // Connect to the database
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'assignedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query for user's assigned phone numbers
    const query: PhoneNumberQueryFilter = {
      assignedTo: new mongoose.Types.ObjectId(user.id),
      status: 'assigned',
    };

    if (search) {
      query.$or = [
        { number: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (status && status !== 'all') {
      // Additional status filtering if needed
      if (status === 'active') {
        query.status = 'assigned';
      }
    }

    // Build sort object
    const sort: SortOptions = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [phoneNumbers, total] = await Promise.all([
      PhoneNumber.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      PhoneNumber.countDocuments(query)
    ]);

    console.log(`[API] User ${user.email} phone numbers query result: ${phoneNumbers.length} numbers, total: ${total}`);

    // Get billing information for each phone number
    const phoneNumbersWithBilling = phoneNumbers.length > 0 ? await Promise.all(
      phoneNumbers.map(async (phoneNumber) => {
        try {
          // Get current assignment to extract billing information
          const currentAssignment = await PhoneNumberAssignment.findOne({
            phoneNumberId: phoneNumber._id,
            userId: new mongoose.Types.ObjectId(user.id),
            status: 'active'
          }).lean();

          // Extract billing info from assignment
          const monthlyRate = currentAssignment?.monthlyRate || phoneNumber.monthlyRate || 0;
          const setupFee = currentAssignment?.setupFee || phoneNumber.setupFee || 0;
          const currency = currentAssignment?.currency || phoneNumber.currency || 'USD';

          // Get latest billing status
          const latestBilling = await PhoneNumberBilling.findOne({
            phoneNumberId: phoneNumber._id,
            userId: new mongoose.Types.ObjectId(user.id),
          })
            .sort({ createdAt: -1 })
            .lean();

          // Get pending billing
          const pendingBilling = await PhoneNumberBilling.findOne({
            phoneNumberId: phoneNumber._id,
            userId: new mongoose.Types.ObjectId(user.id),
            status: 'pending',
          })
            .sort({ billingDate: 1 })
            .lean();

          return {
            ...phoneNumber,
            _id: phoneNumber._id.toString(),
            // Use billing info from assignment record
            monthlyRate,
            setupFee,
            currency,
            billingCycle: phoneNumber.billingCycle || 'monthly',
            // rateDeckId and rateDeckName removed - rate decks are now assigned to users, not phone numbers
            assignedTo: phoneNumber.assignedTo?.toString(),
            createdAt: phoneNumber.createdAt.toISOString(),
            updatedAt: phoneNumber.updatedAt.toISOString(),
            assignedAt: phoneNumber.assignedAt?.toISOString(),
            nextBillingDate: (() => {
              // If nextBillingDate exists, use it
              if (phoneNumber.nextBillingDate) {
                return phoneNumber.nextBillingDate.toISOString();
              }
              
              // If phone number is assigned but no nextBillingDate, calculate it
              if (phoneNumber.assignedAt && monthlyRate && monthlyRate > 0) {
                const nextBilling = new Date(phoneNumber.assignedAt);
                if (phoneNumber.billingCycle === 'yearly') {
                  nextBilling.setFullYear(nextBilling.getFullYear() + 1);
                } else {
                  nextBilling.setMonth(nextBilling.getMonth() + 1);
                }
                return nextBilling.toISOString();
              }
              
              return undefined;
            })(),
            lastBilledDate: phoneNumber.lastBilledDate?.toISOString(),
            // Billing information
            latestBillingStatus: latestBilling?.status || 'none',
            nextBillingAmount: pendingBilling?.amount || monthlyRate || 0,
            nextBillingDue: (() => {
              // Use pending billing date if available
              if (pendingBilling?.billingDate) {
                return new Date(pendingBilling.billingDate).toISOString();
              }
              
              // Use nextBillingDate if it exists
              if (phoneNumber.nextBillingDate) {
                return phoneNumber.nextBillingDate.toISOString();
              }
              
              // Calculate next billing date from assignment date if needed
              if (phoneNumber.assignedAt && monthlyRate && monthlyRate > 0) {
                const nextBilling = new Date(phoneNumber.assignedAt);
                if (phoneNumber.billingCycle === 'yearly') {
                  nextBilling.setFullYear(nextBilling.getFullYear() + 1);
                } else {
                  nextBilling.setMonth(nextBilling.getMonth() + 1);
                }
                return nextBilling.toISOString();
              }
              
              return undefined;
            })(),
          };
        } catch (billingError) {
          console.error(`[API] Error processing billing for phone number ${phoneNumber._id}:`, billingError);
          // Return phone number without billing information if billing processing fails
          return {
            ...phoneNumber,
            _id: phoneNumber._id.toString(),
            // rateDeckId and rateDeckName removed - rate decks are now assigned to users, not phone numbers
            assignedTo: phoneNumber.assignedTo?.toString(),
            createdAt: phoneNumber.createdAt.toISOString(),
            updatedAt: phoneNumber.updatedAt.toISOString(),
            assignedAt: phoneNumber.assignedAt?.toISOString(),
            nextBillingDate: phoneNumber.nextBillingDate?.toISOString(),
            lastBilledDate: phoneNumber.lastBilledDate?.toISOString(),
            latestBillingStatus: 'error',
            nextBillingAmount: phoneNumber.monthlyRate || 0,
            nextBillingDue: undefined,
          };
        }
      })
    ) : [];

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      phoneNumbers: phoneNumbersWithBilling,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching user phone numbers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch phone numbers' },
      { status: 500 }
    );
  }
} 