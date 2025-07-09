import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClient } from '@/lib/sippyClient';

interface RateRecord {
  prefix: string;
  country: string;
  description: string;
  rate: number;
  local_rate: number;
  [key: string]: unknown; // Allow for additional fields from Sippy API
}

interface RatesResponse {
  result: string;
  currency: string;
  rates: RateRecord[];
}

interface RateApiOptions {
  [key: string]: unknown;
  i_account: number;
  offset: number;
  limit: number;
  prefix?: string;
}

// Parse XML-RPC response to extract rates data
function parseRatesXmlResponse(xmlString: string): RatesResponse {
  if (typeof xmlString !== 'string') {
    return xmlString; // Already parsed
  }

  console.log('🚀 Starting rates XML parsing...');

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

  // Look for the result member
  const resultRegex = new RegExp('<member>\\s*<name>result</name>\\s*<value>\\s*<string>([^<]*)</string>\\s*</value>\\s*</member>', 's');
  const resultMatch = xmlString.match(resultRegex);
  
  if (!resultMatch || resultMatch[1] !== 'OK') {
    throw new Error('Sippy API returned non-OK result');
  }

  // Extract currency
  const currencyRegex = new RegExp('<member>\\s*<name>currency</name>\\s*<value>\\s*<string>([^<]*)</string>\\s*</value>\\s*</member>', 's');
  const currencyMatch = xmlString.match(currencyRegex);
  const currency = currencyMatch ? currencyMatch[1] : '';

  // Look for the rates array
  const ratesRegex = new RegExp('<member>\\s*<name>rates</name>\\s*<value>\\s*<array>\\s*<data>(.*?)</data>\\s*</array>', 's');
  const ratesMatch = xmlString.match(ratesRegex);
  
  if (!ratesMatch) {
    console.log('No rates array found in XML response');
    return { result: 'OK', currency, rates: [] };
  }

  const ratesData = ratesMatch[1];
  console.log('Rates data length:', ratesData.length);
  
  const rates: RateRecord[] = [];

  // Find all struct elements within the rates array
  const structRegex = new RegExp('<value>\\s*<struct>(.*?)</struct>\\s*</value>', 'gs');
  let structMatch;
  let structCount = 0;
  
  while ((structMatch = structRegex.exec(ratesData)) !== null) {
    structCount++;
    const structContent = structMatch[1];
    
    const rate: Partial<RateRecord> = {};
    
    // Extract rate fields: prefix, country, description, rate, local_rate
    const rateFields = ['prefix', 'country', 'description', 'rate', 'local_rate'];
    
    for (const fieldName of rateFields) {
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
        
        rate[fieldName] = parsedValue;
      }
    }
    
    // Only add rate if it has at least some basic fields
    if (Object.keys(rate).length > 0) {
      // Ensure required fields have default values
      rate.prefix = rate.prefix || '';
      rate.country = rate.country || '';
      rate.description = rate.description || '';
      rate.rate = rate.rate || 0;
      rate.local_rate = rate.local_rate || 0;
      
      rates.push(rate as RateRecord);
    }
  }

  console.log(`✅ Rates parsing complete: ${structCount} rate structs processed, ${rates.length} valid rates extracted`);
  
  return {
    result: 'OK',
    currency,
    rates
  };
}

// GET handler to retrieve rates for a specific account
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
    const offset = searchParams.get('offset') || '0';
    const limit = searchParams.get('limit') || '100';
    const prefix = searchParams.get('prefix') || '';
    
    console.log('Rates API received parameters:', {
      accountId,
      offset,
      limit,
      prefix,
      allParams: Object.fromEntries(searchParams.entries())
    });
    
    // Get Sippy API credentials from settings
    const credentials = await getSippyApiCredentials();
    
    if (!credentials) {
      return NextResponse.json({ error: 'Sippy API not configured' }, { status: 500 });
    }
    
    // Create Sippy client
    const sippyClient = new SippyClient(credentials);

    // Build options object for getAccountRates
    const options: RateApiOptions = {
      i_account: accountId,
      offset: parseInt(offset),
      limit: parseInt(limit),
      ...(prefix && { prefix })
    };

    console.log('🔍 Fetching rates for account:', accountId, 'with options:', options);
    console.log('📋 Options object details:', JSON.stringify(options, null, 2));
    
    // Fetch rates from Sippy
    const startTime = Date.now();
    const rawResponse = await sippyClient.getAccountRates(options);
    const requestDuration = Date.now() - startTime;
    
    console.log(`✅ Rates API - Request completed in ${requestDuration}ms`);
    console.log('Raw Sippy rates response type:', typeof rawResponse);
    console.log('Raw Sippy rates response length:', typeof rawResponse === 'string' ? (rawResponse as string).length : 'Not a string');
    console.log('Raw Sippy rates response preview:', typeof rawResponse === 'string' ? (rawResponse as string).substring(0, 500) : rawResponse);
    
    // Parse the XML response to extract rates
    const ratesData = parseRatesXmlResponse(rawResponse as unknown as string);
    console.log('Parsed rates count:', Array.isArray(ratesData.rates) ? ratesData.rates.length : 'Not an array');
    
    // Return rates data
    return NextResponse.json({ 
      ...ratesData,
      count: Array.isArray(ratesData.rates) ? ratesData.rates.length : 0,
      requestDuration,
      debugInfo: {
        hasPrefix: !!prefix,
        sippyApiPattern: 'getAccountRates method'
      }
    });
  } catch (error) {
    console.error('Error fetching Sippy rates data:', error);
    
    // Enhanced error reporting
    let errorMessage = 'Failed to fetch rates data';
    let errorType = 'unknown';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('timeout')) {
        errorType = 'timeout';
        errorMessage = 'Rates request timed out. Try reducing the limit parameter.';
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
            ? 'Try reducing the limit parameter or adding prefix filters'
            : 'Check network connectivity and API credentials'
        }
      },
      { status: 500 }
    );
  }
} 