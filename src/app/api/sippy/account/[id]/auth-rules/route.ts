import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClient } from '@/lib/sippyClient';

// GET - List authentication rules
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const accountId = parseInt(id);
    if (isNaN(accountId)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    // Check if user has access to this account
    if (user.role !== 'admin' && user.sippyAccountId !== accountId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const credentials = await getSippyApiCredentials();
    if (!credentials) {
      return NextResponse.json({ error: 'Sippy API not configured' }, { status: 500 });
    }

    const sippyClient = new SippyClient(credentials);
    
    if (!sippyClient) {
      return NextResponse.json({ error: 'Failed to initialize Sippy client' }, { status: 500 });
    }

    // Get raw XML to manually parse authrules array
    const rawXml = await (sippyClient as any).makeRequest('listAuthRules', { 
      i_account: accountId 
    }, undefined, false);
    
    // Parse authrules manually to handle XML response format
    const parseAuthRules = (xml: string) => {
      const result = { result: 'OK', authrules: [] as any[] };
      
      // Extract the authrules array from XML
      const authrulesMatch = xml.match(/<name>authrules<\/name>\s*<value><array><data>([\s\S]*?)<\/data><\/array><\/value>/);
      if (authrulesMatch) {
        const authrulesData = authrulesMatch[1];
        
        // Extract each struct in the array
        const structMatches = authrulesData.match(/<value><struct>([\s\S]*?)<\/struct><\/value>/g);
        if (structMatches) {
          for (const structMatch of structMatches) {
            const structContent = structMatch.match(/<value><struct>([\s\S]*?)<\/struct><\/value>/);
            if (structContent) {
              const authRule: any = { i_account: accountId };
              
              // Extract fields from the struct
              const fieldMatches = structContent[1].match(/<member>\s*<name>([^<]+)<\/name>\s*<value>(?:<(\w+)>)?([^<]*?)(?:<\/\2>)?<\/value>\s*<\/member>/g);
              if (fieldMatches) {
                for (const fieldMatch of fieldMatches) {
                  const fieldParts = fieldMatch.match(/<name>([^<]+)<\/name>\s*<value>(?:<(\w+)>)?([^<]*?)(?:<\/\2>)?<\/value>/);
                  if (fieldParts) {
                    const fieldName = fieldParts[1];
                    const fieldType = fieldParts[2];
                    const fieldValue = fieldParts[3];
                    
                    if (fieldType === 'int' || fieldType === 'i4') {
                      authRule[fieldName] = parseInt(fieldValue) || 0;
                    } else if (fieldType === 'double') {
                      authRule[fieldName] = parseFloat(fieldValue) || 0;
                    } else if (fieldType === 'boolean') {
                      authRule[fieldName] = fieldValue === '1' || fieldValue === 'true';
                    } else {
                      authRule[fieldName] = fieldValue || '';
                    }
                  }
                }
              }
              
              if (Object.keys(authRule).length > 1) { // More than just i_account
                result.authrules.push(authRule);
              }
            }
          }
        }
      }
      
      return result;
    };
    
    const result = parseAuthRules(rawXml);

    return NextResponse.json(result);
  } catch (error) {
    const { id: accountIdParam } = await params;
    const errorAccountId = parseInt(accountIdParam);
    
    console.error(`Error listing auth rules for account ${errorAccountId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// POST - Create authentication rule
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const accountId = parseInt(id);
    if (isNaN(accountId)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    // Check if user has access to this account
    if (user.role !== 'admin' && user.sippyAccountId !== accountId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.i_protocol) {
      return NextResponse.json({ error: 'Protocol is required' }, { status: 400 });
    }

    // Validate that at least one authentication field is provided
    const hasAuthField = body.remote_ip || body.incoming_cli || body.incoming_cld || 
                        body.to_domain || body.from_domain;
    
    if (!hasAuthField) {
      return NextResponse.json(
        { error: 'At least one authentication field (remote_ip, incoming_cli, incoming_cld, to_domain, or from_domain) is required' },
        { status: 400 }
      );
    }

    const credentials = await getSippyApiCredentials();
    if (!credentials) {
      return NextResponse.json({ error: 'Sippy API not configured' }, { status: 500 });
    }

    const sippyClient = new SippyClient(credentials);
    const result = await sippyClient.addAuthRule({
      i_account: accountId,
      ...body,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating auth rule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 