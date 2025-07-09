import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClientFactory } from '@/lib/sippy';

// Interface for CDR record with all possible fields
interface CdrRecord {
  cost: string;
  duration: number;
  result: number;
  connect_time: string;
  cli: string;
  cld: string;
  country: string;
  description: string;
  payment_currency: string;
  i_account?: number;
  billed_duration?: number;
  plan_duration?: number;
  remote_ip?: string;
  protocol?: string;
  accessibility_cost?: number;
  grace_period?: number;
  post_call_surcharge?: number;
  connect_fee?: number;
  free_seconds?: number;
  interval_1?: number;
  interval_n?: number;
  price_1?: number;
  price_n?: number;
  delay?: number;
  pdd1xx?: number;
  i_call?: string;
  call_id?: string;
  i_cdr?: string;
  prefix?: string;
  lrn_cld?: string;
  lrn_cld_in?: string;
  p_asserted_id?: string;
  remote_party_id?: string;
  release_source?: string;
  user_agent?: string;
  area_name?: string;
  [key: string]: unknown; // Allow for additional fields from Sippy API
}

interface CdrApiOptions {
  [key: string]: unknown;
  i_account: number;
  type: string;
  limit: number;
  offset: number;
  cli?: string;
  cld?: string;
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

/*
// Parse XML-RPC response to extract only essential CDR fields for dashboard widgets
// Currently unused - optimized mode uses SippyClientFactory.createDashboardClient
interface OptimizedCdrRecord {
  [key: string]: string | number | boolean | null;
}

function parseXmlResponseOptimized(xmlString: string): OptimizedCdrRecord[] | any {
  if (typeof xmlString !== 'string') {
    return xmlString; // Already parsed
  }

  console.log('🚀 Starting optimized XML parsing for dashboard widgets...');
  console.log('⚡ Extracting only essential fields: cost, duration, result, payment_currency, connect_time');

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

  // Look for the cdrs member
  const cdrsRegex = new RegExp('<member>\\s*<name>cdrs</name>\\s*<value>\\s*<array>\\s*<data>(.*?)</data>\\s*</array>', 's');
  const cdrsMatch = xmlString.match(cdrsRegex);
  
  if (!cdrsMatch) {
    console.log('No CDRs array found in XML response');
    return []; // No CDRs found
  }

  const cdrsData = cdrsMatch[1];
  console.log('CDRs data length:', cdrsData.length);
  
  const cdrs: OptimizedCdrRecord[] = [];

  // Find all struct elements within the CDRs array
  const structRegex = new RegExp('<value>\\s*<struct>(.*?)</struct>\\s*</value>', 'gs');
  let structMatch;
  let structCount = 0;
  
  while ((structMatch = structRegex.exec(cdrsData)) !== null) {
    structCount++;
    const structContent = structMatch[1];
    
    const cdr: OptimizedCdrRecord = {};
    
    // Extract only the essential fields we need for dashboard widgets
    const essentialFields = ['cost', 'duration', 'result', 'payment_currency', 'connect_time'];
    
    for (const fieldName of essentialFields) {
      // Create a regex to find this specific field
      const fieldRegex = new RegExp(`<member>\\s*<name>${fieldName}</name>\\s*<value>\\s*<([^>]+)>([^<]*)</[^>]+>\\s*</value>\\s*</member>`, 's');
      const fieldMatch = structContent.match(fieldRegex);
      
      if (fieldMatch) {
        const [, type, value] = fieldMatch;
        
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
        
        cdr[fieldName] = parsedValue;
      }
    }
    
    // Only add CDR if it has at least some essential fields
    if (Object.keys(cdr).length > 0) {
      // Ensure required fields have default values
      cdr.cost = cdr.cost || '0';
      cdr.duration = cdr.duration || 0;
      cdr.result = cdr.result || 0;
      cdr.connect_time = cdr.connect_time || '';
      
      cdrs.push(cdr);
    }
  }

  console.log(`✅ Optimized parsing complete: ${structCount} CDR structs processed, ${cdrs.length} valid CDRs extracted`);
  console.log(`📊 Memory optimization: ~95% reduction (only 5 fields vs ~40+ fields per CDR)`);
  
  return cdrs;
}
*/

// Parse XML-RPC response to extract ALL CDR fields for CDR Reports page
function parseXmlResponseFull(xmlString: string): CdrRecord[] {
  if (typeof xmlString !== 'string') {
    return xmlString; // Already parsed
  }

  console.log('🚀 Starting FULL XML parsing for CDR Reports...');
  console.log('📊 Extracting ALL available CDR fields for detailed reports');

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

  // Look for the cdrs member
  const cdrsRegex = new RegExp('<member>\\s*<name>cdrs</name>\\s*<value>\\s*<array>\\s*<data>(.*?)</data>\\s*</array>', 's');
  const cdrsMatch = xmlString.match(cdrsRegex);
  
  if (!cdrsMatch) {
    console.log('No CDRs array found in XML response');
    return []; // No CDRs found
  }

  const cdrsData = cdrsMatch[1];
  console.log('CDRs data length:', cdrsData.length);
  
  const cdrs: CdrRecord[] = [];

  // Find all struct elements within the CDRs array
  const structRegex = new RegExp('<value>\\s*<struct>(.*?)</struct>\\s*</value>', 'gs');
  let structMatch;
  let structCount = 0;
  
  while ((structMatch = structRegex.exec(cdrsData)) !== null) {
    structCount++;
    const structContent = structMatch[1];
    
    const cdr: Partial<CdrRecord> = {};
    
    // Extract ALL available fields for CDR Reports
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
      
      cdr[fieldName] = parsedValue;
    }
    
    // Only add CDR if it has at least some basic fields
    if (Object.keys(cdr).length > 0) {
      // Ensure required fields have default values
      cdr.cost = cdr.cost || '0';
      cdr.duration = cdr.duration || 0;
      cdr.result = cdr.result || 0;
      cdr.connect_time = cdr.connect_time || '';
      cdr.cli = cdr.cli || '';
      cdr.cld = cdr.cld || '';
      cdr.country = cdr.country || '';
      cdr.description = cdr.description || '';
      cdr.payment_currency = cdr.payment_currency || '';
      
      cdrs.push(cdr as CdrRecord);
    }
  }

  console.log(`✅ Full parsing complete: ${structCount} CDR structs processed, ${cdrs.length} valid CDRs extracted`);
  console.log(`📊 Full data extraction: ALL available fields preserved for CDR Reports`);
  
  return cdrs;
}

// GET handler to retrieve CDRs for a specific account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify the user is authenticated (same as account route)
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Await params before accessing its properties
    const { id } = await params;
    
    // Get the Sippy account ID from the params (same as account route)
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing ID parameter' }, { status: 400 });
    }
    
    const accountId = parseInt(id, 10);
    
    if (isNaN(accountId)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }
    
    // For non-admin users, ensure they can only access their own account (same as account route)
    if (currentUser.role !== 'admin' && currentUser.sippyAccountId !== accountId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'non_zero_and_errors';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const cli = searchParams.get('cli');
    const cld = searchParams.get('cld');
    const limit = searchParams.get('limit') || '100';
    const offset = searchParams.get('offset') || '0';
    const mode = searchParams.get('mode') || 'optimized'; // 'optimized' for dashboard, 'full' for CDR Reports
    
    // Get Sippy API credentials from settings (same as account route)
    const credentials = await getSippyApiCredentials();
    
    if (!credentials) {
      return NextResponse.json({ error: 'Sippy API not configured' }, { status: 500 });
    }
    
    // Build options object for getAccountCDRs
    const options: CdrApiOptions = {
      i_account: accountId, // Use the account ID from the URL path
      type,
      limit: parseInt(limit),
      offset: parseInt(offset),
      ...(cli && { cli }),
      ...(cld && { cld })
    };

    // Convert dates to Sippy format if provided
    if (startDate) {
      try {
        const convertedStartDate = convertToSippyDateFormat(startDate);
        options.start_date = convertedStartDate;
      } catch (error) {
        console.error('❌ Invalid start_date format:', startDate, error);
        return NextResponse.json({ error: 'Invalid start_date format' }, { status: 400 });
      }
    }

    if (endDate) {
      try {
        const convertedEndDate = convertToSippyDateFormat(endDate);
        options.end_date = convertedEndDate;
      } catch (error) {
        console.error('❌ Invalid end_date format:', endDate, error);
        return NextResponse.json({ error: 'Invalid end_date format' }, { status: 400 });
      }
    }

    // Important: According to Sippy API docs, if dates are not specified exactly,
    // only CDRs from the last hour will be returned (since version 2.2)
    if (!startDate || !endDate) {
      console.log('⚠️ WARNING: No date range specified. Sippy API will only return CDRs from the last hour!');
      console.log('💡 TIP: Make sure to select a specific date in the dashboard to get historical CDRs');
    }

    console.log('🔍 Fetching CDRs for account:', accountId, 'with options:', options);
    console.log('📋 Options object details:', JSON.stringify(options, null, 2));
    
    // Add timeout warning if date range is specified
    if (startDate || endDate) {
      console.log('⚠️ CDR API - Date range specified, using 30s timeout (matching test pattern)');
    } else {
      console.log('ℹ️ CDR API - No date range specified, will return last hour CDRs only');
    }
    
    // Fetch CDRs using the appropriate client based on mode
    const startTime = Date.now();
    let cdrs;
    
    if (mode === 'optimized') {
      console.log('⚡ Using optimized dashboard client for widget performance');
      // Use the new dashboard client for optimized performance
      const dashboardClient = SippyClientFactory.createDashboardClient(credentials);
      cdrs = await dashboardClient.getCDRsForWidgets(options);
    } else {
      console.log('🔍 Using full parsing mode for CDR reports');
      // For full mode, we'll need to create a CDR client (future) or use the old approach
      // For now, keep the existing logic for full mode
      const { SippyClient } = await import('@/lib/sippyClient');
      const sippyClient = new SippyClient(credentials);
      const rawResponse = await sippyClient.getAccountCDRs(options, 30000); // 30s timeout like test
      cdrs = parseXmlResponseFull(rawResponse as unknown as string);
    }
    
    const requestDuration = Date.now() - startTime;
    
    console.log(`✅ CDR API - Request completed in ${requestDuration}ms`);
    console.log('Parsed CDRs count:', Array.isArray(cdrs) ? cdrs.length : 'Not an array');
    console.log('Parser mode used:', mode);
    
    // Return CDR data with enhanced debugging info (same pattern as test)
    return NextResponse.json({ 
      cdrs,
      count: Array.isArray(cdrs) ? cdrs.length : 0,
      requestDuration,
      debugInfo: {
        hasDateRange: !!(startDate || endDate),
        timeoutUsed: mode === 'optimized' ? '45000ms (dashboard)' : '30000ms (full)',
        clientUsed: mode === 'optimized' ? 'SippyDashboardClient' : 'SippyClient (legacy)',
        sippyApiPattern: 'Modular architecture'
      }
    });
  } catch (error) {
    console.error('Error fetching Sippy CDR data:', error);
    
    // Enhanced error reporting (same as test)
    let errorMessage = 'Failed to fetch CDR data';
    let errorType = 'unknown';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('timeout')) {
        errorType = 'timeout';
        errorMessage = 'CDR request timed out after 30 seconds. Try reducing the date range or check for large datasets.';
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
            ? 'Try using smaller date ranges or reduce the limit parameter'
            : 'Check network connectivity and API credentials'
        }
      },
      { status: 500 }
    );
  }
}

// POST handler to retrieve CDRs for a specific account (same as debug endpoint pattern)
export async function POST(
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

    // Get request body parameters
    const body = await request.json();
    const {
      i_account,
      type = 'non_zero_and_errors',
      start_date,
      end_date,
      cli,
      cld,
      limit = '100',
      offset = '0',
      mode = 'optimized' // 'optimized' for dashboard, 'full' for CDR Reports
    } = body;
    
    // Validate that the account ID in the URL matches the request body
    if (i_account && parseInt(i_account) !== accountId) {
      return NextResponse.json({ error: 'Account ID mismatch' }, { status: 400 });
    }
    
    // Get Sippy API credentials from settings
    const credentials = await getSippyApiCredentials();
    
    if (!credentials) {
      return NextResponse.json({ error: 'Sippy API not configured' }, { status: 500 });
    }
    
    // Build options object for getAccountCDRs
    const options: CdrApiOptions = {
      i_account: accountId,
      type,
      limit: parseInt(limit),
      offset: parseInt(offset),
      ...(cli && { cli }),
      ...(cld && { cld })
    };

    // Convert dates to Sippy format if provided
    if (start_date) {
      try {
        options.start_date = convertToSippyDateFormat(start_date);
      } catch (error) {
        console.warn('Failed to convert start_date:', error);
        return NextResponse.json({ error: 'Invalid start_date format' }, { status: 400 });
      }
    }

    if (end_date) {
      try {
        options.end_date = convertToSippyDateFormat(end_date);
      } catch (error) {
        console.warn('Failed to convert end_date:', error);
        return NextResponse.json({ error: 'Invalid end_date format' }, { status: 400 });
      }
    }
    
    // Fetch CDRs using the appropriate client based on mode
    const startTime = Date.now();
    let cdrs;
    
    if (mode === 'optimized') {
      // Use the new dashboard client for optimized performance
      const dashboardClient = SippyClientFactory.createDashboardClient(credentials);
      cdrs = await dashboardClient.getCDRsForWidgets(options);
    } else {
      // For full mode, we'll need to create a CDR client (future) or use the old approach
      // For now, keep the existing logic for full mode
      const { SippyClient } = await import('@/lib/sippyClient');
      const sippyClient = new SippyClient(credentials);
      const rawResponse = await sippyClient.getAccountCDRs(options, 30000); // 30s timeout like test
      cdrs = parseXmlResponseFull(rawResponse as unknown as string);
    }
    
    const requestDuration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      cdrs,
      count: cdrs.length,
      requestDuration,
      debugInfo: {
        hasDateRange: !!(start_date || end_date),
        timeoutUsed: '30 seconds',
        sippyApiPattern: 'Main CDR API with POST support'
      }
    });

  } catch (error) {
    console.error('Error in CDR API POST:', error);
    
    let errorMessage = 'Failed to fetch CDRs';
    let errorType = 'unknown';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('timeout') || error.message.includes('ECONNABORTED')) {
        errorType = 'timeout';
      } else if (error.message.includes('Sippy API Fault')) {
        errorType = 'sippy_fault';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorType = 'connection_refused';
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      errorType,
      debugInfo: {
        suggestion: errorType === 'timeout' 
          ? 'Try reducing the limit or adding date filters to narrow the search'
          : 'Check Sippy API configuration and network connectivity'
      }
    }, { status: 500 });
  }
} 