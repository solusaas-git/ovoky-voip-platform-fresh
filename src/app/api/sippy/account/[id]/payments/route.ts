import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClient } from '@/lib/sippyClient';

interface PaymentRecord {
  i_payment?: number;
  payment_time?: string;
  amount?: number;
  description?: string;
  type?: 'credit' | 'debit';
  method?: string;
  transaction_id?: string;
  status?: string;
  payment_currency?: string;
  [key: string]: unknown; // Allow for additional fields from Sippy API
}

interface PaymentsResponse {
  result: string;
  payments: PaymentRecord[];
}

interface PaymentApiOptions {
  [key: string]: unknown;
  i_account: number;
  limit: number;
  offset: number;
  type?: 'credit' | 'debit';
  start_date?: string;
  end_date?: string;
}

// Convert ISO date format to Sippy's required format
function convertToSippyDateFormat(isoDate: string): string {
  const date = new Date(isoDate);
  
  // Format: '%H:%M:%S.000 GMT %a %b %d %Y' 
  // Example: '09:57:29.000 GMT Wed Nov 18 2009'
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
}

// Parse XML-RPC response to extract payments data
function parsePaymentsXmlResponse(xmlString: string): PaymentsResponse {
  if (typeof xmlString !== 'string') {
    return xmlString; // Already parsed
  }

  console.log('🚀 Starting XML parsing for payments...');

  // Check for fault response first
  const faultRegex = new RegExp('<fault>\\s*<value>\\s*<struct>(.*?)</struct>\\s*</value>\\s*</fault>', 's');
  const faultMatch = xmlString.match(faultRegex);
  if (faultMatch) {
    // Extract fault details
    const faultContent = faultMatch[1];
    const codeMatch = faultContent.match(/<name>faultCode<\/name>\s*<value>\s*<int>(\d+)<\/int>/);
    const messageMatch = faultContent.match(/<name>faultString<\/name>\s*<value>\s*<string>([^<]*)<\/string>/);
    
    const faultCode = codeMatch ? parseInt(codeMatch[1], 10) : 'Unknown';
    const faultMessage = messageMatch ? messageMatch[1] : 'Unknown error';
    
    throw new Error(`Sippy API Fault ${faultCode}: ${faultMessage}`);
  }

  // Look for the result member first
  const resultRegex = new RegExp('<member>\\s*<name>result</name>\\s*<value>\\s*<string>([^<]*)</string>\\s*</value>\\s*</member>', 's');
  const resultMatch = xmlString.match(resultRegex);
  const result = resultMatch ? resultMatch[1] : 'OK';

  // Look for the payments member
  const paymentsRegex = new RegExp('<member>\\s*<name>payments</name>\\s*<value>\\s*<array>\\s*<data>(.*?)</data>\\s*</array>', 's');
  const paymentsMatch = xmlString.match(paymentsRegex);
  
  if (!paymentsMatch) {
    console.log('No payments array found in XML response');
    return { result, payments: [] }; // No payments found
  }

  const paymentsData = paymentsMatch[1];
  console.log('Payments data length:', paymentsData.length);
  
  const payments: PaymentRecord[] = [];

  // Find all struct elements within the payments array
  const structRegex = new RegExp('<value>\\s*<struct>(.*?)</struct>\\s*</value>', 'gs');
  let structMatch;
  let structCount = 0;
  
  while ((structMatch = structRegex.exec(paymentsData)) !== null) {
    structCount++;
    const structContent = structMatch[1];
    
    const payment: Partial<PaymentRecord> = {};
    
    // Extract all payment fields
    const memberRegex = new RegExp('<member>\\s*<name>([^<]+)</name>\\s*<value>\\s*<([^>]+)>([^<]*)</[^>]+>\\s*</value>\\s*</member>', 'gs');
    let memberMatch;
    
    while ((memberMatch = memberRegex.exec(structContent)) !== null) {
      const [, fieldName, type, value] = memberMatch;
      
      let parsedValue: string | number | boolean | null;
      switch (type) {
        case 'int':
          parsedValue = parseInt(value || '0', 10);
          break;
        case 'double':
          parsedValue = parseFloat(value || '0');
          break;
        case 'string':
          parsedValue = value || '';
          break;
        case 'boolean':
          parsedValue = value === '1' || value === 'true';
          break;
        case 'nil':
          parsedValue = null;
          break;
        default:
          parsedValue = value || '';
      }
      
      payment[fieldName] = parsedValue;
    }
    
    // Only add payment if it has required fields
    if (payment.i_payment || payment.payment_time) {
      payments.push(payment as PaymentRecord);
    }
  }

  console.log(`✅ Payments parsing complete: ${structCount} payment structs processed, ${payments.length} valid payments extracted`);
  
  return { result, payments };
}

// GET handler to retrieve payments for a specific account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify the user is authenticated
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Await params before accessing its properties
    const { id } = await params;
    
    // Get the Sippy account ID from the params
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing ID parameter' }, { status: 400 });
    }
    
    const accountId = parseInt(id, 10);
    
    if (isNaN(accountId)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }
    
    // For non-admin users, ensure they can only access their own account
    if (currentUser.role !== 'admin' && currentUser.sippyAccountId !== accountId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const type = searchParams.get('type') as 'credit' | 'debit' | undefined;
    const limit = searchParams.get('limit') || '100';
    const offset = searchParams.get('offset') || '0';
    
    console.log('Payments API received parameters:', {
      accountId,
      startDate,
      endDate,
      type,
      limit,
      offset,
      allParams: Object.fromEntries(searchParams.entries())
    });
    
    // Get Sippy API credentials from settings
    const credentials = await getSippyApiCredentials();
    
    if (!credentials) {
      return NextResponse.json({ error: 'Sippy API not configured' }, { status: 500 });
    }
    
    // Create Sippy client
    const sippyClient = new SippyClient(credentials);

    // Build options object for getPaymentsList
    const options: PaymentApiOptions = {
      i_account: accountId,
      limit: parseInt(limit),
      offset: parseInt(offset),
      ...(type && { type })
    };

    // Convert dates to Sippy format if provided
    if (startDate) {
      try {
        // For start date, use beginning of day (00:00:00)
        const convertedStartDate = convertToSippyDateFormat(startDate + 'T00:00:00.000Z');
        options.start_date = convertedStartDate;
        console.log('📅 Date conversion - start_date:');
        console.log('   Input (ISO):', startDate);
        console.log('   Output (Sippy):', convertedStartDate);
      } catch (error) {
        console.error('❌ Invalid start_date format:', startDate, error);
        return NextResponse.json({ error: 'Invalid start_date format' }, { status: 400 });
      }
    }

    if (endDate) {
      try {
        // For end date, use end of day (23:59:59)
        const convertedEndDate = convertToSippyDateFormat(endDate + 'T23:59:59.999Z');
        options.end_date = convertedEndDate;
        console.log('📅 Date conversion - end_date:');
        console.log('   Input (ISO):', endDate);
        console.log('   Output (Sippy):', convertedEndDate);
      } catch (error) {
        console.error('❌ Invalid end_date format:', endDate, error);
        return NextResponse.json({ error: 'Invalid end_date format' }, { status: 400 });
      }
    }

    console.log('🔍 Fetching payments for account:', accountId, 'with options:', options);
    
    // Fetch payments from Sippy
    const startTime = Date.now();
    const rawPaymentsData = await sippyClient.getPaymentsList(options);
    const requestDuration = Date.now() - startTime;
    
    console.log(`✅ Payments API - Raw response received in ${requestDuration}ms`);
    console.log('Raw response type:', typeof rawPaymentsData);
    console.log('Raw response preview:', typeof rawPaymentsData === 'string' ? (rawPaymentsData as string).substring(0, 200) + '...' : rawPaymentsData);
    
    // Parse the XML response if it's a string
    const paymentsData = parsePaymentsXmlResponse(rawPaymentsData as unknown as string);
    
    console.log('Parsed payments count:', paymentsData.payments?.length || 0);
    
    // Return payments data
    return NextResponse.json({ 
      ...paymentsData,
      count: paymentsData.payments?.length || 0,
      requestDuration
    });
  } catch (error) {
    console.error('Error fetching Sippy payments data:', error);
    
    // Enhanced error reporting
    let errorMessage = 'Failed to fetch payments data';
    let errorType = 'unknown';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('timeout')) {
        errorType = 'timeout';
        errorMessage = 'Payments request timed out. Try reducing the limit parameter.';
      } else if (error.message.includes('Sippy API Fault')) {
        errorType = 'sippy_fault';
      } else if (error.message.includes('No response received')) {
        errorType = 'network';
        errorMessage = 'Network connectivity issue. Check Sippy API endpoint and credentials.';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        errorType,
        debugInfo: {
          originalError: error instanceof Error ? error.message : 'Unknown error',
          suggestion: errorType === 'timeout' 
            ? 'Try reducing the limit parameter or adding date filters'
            : 'Check network connectivity and API credentials'
        }
      },
      { status: 500 }
    );
  }
} 