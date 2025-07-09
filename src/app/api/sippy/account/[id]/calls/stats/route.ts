import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClient } from '@/lib/sippyClient';

interface CallStatsData {
  [accountId: string]: [number, number]; // [totalCalls, connectedCalls]
}

interface CallStatsResult {
  result: string;
  data: CallStatsData;
}

// Parse XML-RPC response to extract call stats
function parseCallStatsXmlResponse(xmlString: string): CallStatsResult {
  if (typeof xmlString !== 'string') {
    return xmlString; // Already parsed
  }

  console.log('Starting Call Stats XML parsing...');

  // Check for fault response first
  const faultRegex = new RegExp('<fault>\\s*<value>\\s*<struct>(.*?)</struct>\\s*</value>\\s*</fault>', 's');
  const faultMatch = xmlString.match(faultRegex);
  if (faultMatch) {
    const faultContent = faultMatch[1];
    const codeMatch = faultContent.match(/<name>faultCode<\/name>\s*<value>\s*<int>(\d+)<\/int>/);
    const messageMatch = faultContent.match(/<name>faultString<\/name>\s*<value>\s*<string>([^<]*)<\/string>/);
    
    const faultCode = codeMatch ? parseInt(codeMatch[1], 10) : 'Unknown';
    const faultMessage = messageMatch ? messageMatch[1] : 'Unknown error';
    
    throw new Error(`Sippy API Fault ${faultCode}: ${faultMessage}`);
  }

  // Call stats API returns: <methodResponse><params><param><value><struct>
  const structRegex = new RegExp('<methodResponse>\\s*<params>\\s*<param>\\s*<value>\\s*<struct>(.*?)</struct>', 's');
  const structMatch = xmlString.match(structRegex);
  
  if (!structMatch) {
    console.log('No struct found in call stats XML response');
    return { result: 'OK', data: {} };
  }

  const structContent = structMatch[1];
  let result = 'OK';
  let data: CallStatsData = {};

  // Extract result and data members
  const memberRegex = new RegExp('<member>\\s*<name>([^<]+)</name>\\s*<value>\\s*<([^>]+)>([^<]*)</[^>]+>\\s*</value>\\s*</member>', 'gs');
  let memberMatch;
  
  while ((memberMatch = memberRegex.exec(structContent)) !== null) {
    const [, name, , value] = memberMatch;
    
    if (name === 'result') {
      result = value;
    } else if (name === 'data') {
      // Data is a nested struct containing account stats
      const dataStructRegex = new RegExp('<struct>(.*?)</struct>', 's');
      const dataStructMatch = value.match(dataStructRegex);
      
      if (dataStructMatch) {
        const dataContent = dataStructMatch[1];
        const dataStats: CallStatsData = {};
        
        // Extract account stats: i_account : [total_calls, connected_calls]
        const accountRegex = new RegExp('<member>\\s*<name>([^<]+)</name>\\s*<value>\\s*<array>\\s*<data>\\s*<value>\\s*<int>([^<]*)</int>\\s*</value>\\s*<value>\\s*<int>([^<]*)</int>\\s*</value>\\s*</data>\\s*</array>\\s*</value>\\s*</member>', 'gs');
        let accountMatch;
        
        while ((accountMatch = accountRegex.exec(dataContent)) !== null) {
          const [, accountId, totalCalls, connectedCalls] = accountMatch;
          dataStats[accountId] = [parseInt(totalCalls, 10), parseInt(connectedCalls, 10)];
        }
        
        data = dataStats;
      }
    }
  }

  return { result, data };
}

// GET handler to retrieve call statistics for a specific account
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

    // Get Sippy API credentials from settings
    const credentials = await getSippyApiCredentials();
    
    if (!credentials) {
      return NextResponse.json({ error: 'Sippy API not configured' }, { status: 500 });
    }
    
    // Create Sippy client
    const sippyClient = new SippyClient(credentials);

    console.log('Fetching call statistics for account:', accountId);
    
    // Fetch call statistics from Sippy
    const rawResponse = await sippyClient.getAccountCallStatsCustomer();
    console.log('Raw Sippy Call Stats response type:', typeof rawResponse);
    
    // Parse the XML response to extract stats
    const statsResult = parseCallStatsXmlResponse(String(rawResponse));
    console.log('Parsed call stats:', statsResult);
    
    // Extract stats for the specific account
    const accountStats = statsResult.data?.[accountId.toString()] || [0, 0];
    const [totalCalls, connectedCalls] = accountStats;
    
    const stats = {
      accountId,
      totalCalls,
      connectedCalls,
      disconnectedCalls: totalCalls - connectedCalls,
      connectionRate: totalCalls > 0 ? (connectedCalls / totalCalls) * 100 : 0
    };
    
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching Sippy call statistics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch call statistics' },
      { status: 500 }
    );
  }
} 