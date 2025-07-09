import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClientFactory } from '@/lib/sippy';

interface PaymentRecord {
  [key: string]: unknown;
}

interface UserInfo {
  userId: string;
  userName: string;
  userEmail: string;
  sippyAccountId: number | undefined;
}

interface PaymentWithUser extends PaymentRecord {
  _userInfo: UserInfo;
}

interface UserDocument {
  _id: { toString(): string } | string;
  name: string;
  email: string;
  sippyAccountId?: number;
}

// Helper function to convert ISO date to Sippy format
function convertToSippyDateFormat(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    
    // Format: '%H:%M:%S.000 GMT %a %b %d %Y' (e.g. "09:57:29.000 GMT Wed Nov 18 2009")
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = dayNames[date.getUTCDay()];
    const monthName = monthNames[date.getUTCMonth()];
    const day = date.getUTCDate().toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    
    return `${hours}:${minutes}:${seconds}.000 GMT ${dayName} ${monthName} ${day} ${year}`;
  } catch (error) {
    console.error('Error converting date to Sippy format:', error);
    throw new Error(`Invalid date format: ${isoDate}`);
  }
}

// GET handler to retrieve payments from all Sippy accounts (admin only)
export async function GET(request: NextRequest) {
  try {
    // Verify the user is authenticated and is an admin
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get query parameters for filtering and pagination
    const searchParams = request.nextUrl.searchParams;
    let startDate = searchParams.get('start_date');
    let endDate = searchParams.get('end_date');
    const type = searchParams.get('type') as 'credit' | 'debit' | undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const userId = searchParams.get('user_id'); // For filtering by specific user
    
    // If no date filters are provided, default to current month's payments
    if (!startDate && !endDate) {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth(); // 0-based (0 = January, 11 = December)
      
      // First day of current month
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
      const startDateStr = firstDayOfMonth.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Last day of current month
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0); // Day 0 of next month = last day of current month
      const endDateStr = lastDayOfMonth.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      startDate = startDateStr;
      endDate = endDateStr;
      
      console.log(`No date filters provided, defaulting to current month: ${startDateStr} to ${endDateStr}`);
      console.log(`📅 Current month range: ${firstDayOfMonth.toLocaleDateString()} - ${lastDayOfMonth.toLocaleDateString()}`);
    }
    
    // Convert ISO dates to Sippy format
    let sippyStartDate: string | undefined;
    let sippyEndDate: string | undefined;
    
    if (startDate) {
      // For start date, use beginning of day (00:00:00)
      sippyStartDate = convertToSippyDateFormat(startDate + 'T00:00:00.000Z');
      console.log(`Converted start date: ${startDate} -> ${sippyStartDate}`);
    }
    
    if (endDate) {
      // For end date, use end of day (23:59:59)
      sippyEndDate = convertToSippyDateFormat(endDate + 'T23:59:59.999Z');
      console.log(`Converted end date: ${endDate} -> ${sippyEndDate}`);
    }
    
    console.log('Admin payments API received parameters:', {
      startDate,
      endDate,
      sippyStartDate,
      sippyEndDate,
      type,
      limit,
      offset,
      userId,
      allParams: Object.fromEntries(searchParams.entries())
    });
    
    // Get Sippy API credentials from settings
    const credentials = await getSippyApiCredentials();
    
    if (!credentials) {
      return NextResponse.json({ error: 'Sippy API not configured' }, { status: 500 });
    }
    
    // Create specialized payments client with intelligent method detection
    const paymentsClient = SippyClientFactory.createPaymentsClient(credentials);
    
    let allPayments: PaymentWithUser[] = [];
    
    // If filtering by specific user, get their account ID first
    if (userId) {
      try {
        // Connect to database to get user's Sippy account ID
        const { connectToDatabase } = await import('@/lib/db');
        const User = (await import('@/models/User')).default;
        
        await connectToDatabase();
        const user = await User.findById(userId);
        
        if (!user || !user.sippyAccountId) {
          return NextResponse.json({ error: 'User not found or no Sippy account' }, { status: 404 });
        }
        
        console.log(`Fetching payments for specific user: ${user.email} (Account: ${user.sippyAccountId})`);
        
        // Fetch payments for this specific account using the new payments client
        const paymentsList = await paymentsClient.getPaymentsList({
          i_account: user.sippyAccountId,
          start_date: sippyStartDate,
          end_date: sippyEndDate,
          type: type as 'credit' | 'debit',
          limit,
          offset
        });
        
        // Add user information to payments
        const paymentsWithUser = (paymentsList.payments || []).map((payment: unknown) => ({
          ...(payment as PaymentRecord),
          _userInfo: {
            userId: typeof user._id === 'string' ? user._id : user._id.toString(),
            userName: user.name,
            userEmail: user.email,
            sippyAccountId: user.sippyAccountId
          }
        }));
        
        return NextResponse.json({
          result: 'success',
          payments: paymentsWithUser,
          count: paymentsWithUser.length,
          pagination: {
            total: paymentsWithUser.length,
            limit,
            offset
          }
        });
        
      } catch (error) {
        console.error('Error fetching user-specific payments:', error);
        return NextResponse.json({ error: 'Failed to fetch user payments' }, { status: 500 });
      }
    }
    
    // Get user information from database - fetch all users with Sippy accounts
    const { connectToDatabase } = await import('@/lib/db');
    const User = (await import('@/models/User')).default;
    
    await connectToDatabase();
    const users = await User.find({ sippyAccountId: { $exists: true, $ne: null } });
    
    if (users.length === 0) {
      console.log('No users with Sippy accounts found');
      return NextResponse.json({
        result: 'success',
        payments: [],
        count: 0,
        pagination: {
          total: 0,
          limit,
          offset
        }
      });
    }
    
    console.log(`Found ${users.length} users with Sippy accounts`);
    
    // Fetch payments from each user's account
    const accountPromises = users.map(async (user: UserDocument) => {
      try {
        const accountId = user.sippyAccountId;
        console.log(`Fetching payments for user ${user.email} (Account: ${accountId})...`);
        
        const paymentsList = await paymentsClient.getPaymentsList({
          i_account: accountId,
          start_date: sippyStartDate,
          end_date: sippyEndDate,
          type: type as 'credit' | 'debit',
          limit: 100, // Fetch more per account to get comprehensive data
          offset: 0
        });
        
        // Add user information to payments
        const userInfo = {
          userId: user._id.toString(),
          userName: user.name,
          userEmail: user.email
        };
        
        return (paymentsList.payments || []).map((payment: unknown) => ({
          ...(payment as PaymentRecord),
          _userInfo: {
            ...userInfo,
            sippyAccountId: accountId
          }
        }));
        
      } catch (error) {
        console.error(`Error fetching payments for user ${user.email} (Account: ${user.sippyAccountId}):`, error);
        return []; // Return empty array for failed accounts
      }
    });
    
    // Wait for all account payment fetches to complete
    const accountPaymentArrays = await Promise.all(accountPromises);
    
    // Flatten all payments into a single array
    allPayments = accountPaymentArrays.flat();
    
    console.log(`Fetched total of ${allPayments.length} payments from ${users.length} user accounts`);
    console.log(`💳 Enhanced with intelligent payment method detection`);
    
    // Sort payments by date (newest first)
    allPayments.sort((a, b) => {
      const dateA = new Date((a.payment_time as string | number) || 0);
      const dateB = new Date((b.payment_time as string | number) || 0);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Apply pagination to the combined results
    const paginatedPayments = allPayments.slice(offset, offset + limit);
    
    return NextResponse.json({
      result: 'success',
      payments: paginatedPayments,
      count: paginatedPayments.length,
      pagination: {
        total: allPayments.length,
        limit,
        offset
      }
    });
    
  } catch (error) {
    console.error('Error fetching all payments:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch payments' },
      { status: 500 }
    );
  }
} 