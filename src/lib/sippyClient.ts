import axios from 'axios';
import 'isomorphic-fetch';
import { Agent } from 'https';
import crypto from 'crypto';

export interface SippyCredentials {
  username: string;
  password: string;
  host: string; // e.g. "https://switch.example.com"
}

export interface Call {
  i_call: number;
  cli: string;
  cld: string;
  connect_time: string;
  call_duration: number;
  disconnect_cause: string;
  account_id: number;
  account_name: string;
  node_id: string;
  status: string;
}

export interface Stats {
  total_calls: number;
  connected_calls: number;
  average_duration: number;
  total_minutes: number;
}

export interface CdrRow {
  i_cdr: number;
  connect_time: string;
  disconnect_time: string;
  cli: string;
  cld: string;
  account_id: number;
  account_name: string;
  duration: number;
  charged_amount: number;
  disconnect_cause: string;
}

// Account info interface based on Sippy API documentation
export interface AccountInfo {
  i_account: number;
  username: string;
  authname: string;
  balance: number;
  credit_limit: number;
  max_sessions: number | string; // Can be number or "unlimited"
  max_credit_time: number;
  translation_rule: string;
  cli_translation_rule: string;
  i_routing_group: number;
  i_billing_plan: number;
  i_account_class?: number;
  i_time_zone: number;
  cpe_number: string;
  vm_enabled: number;
  vm_password?: string;
  vm_timeout?: number;
  vm_check_number?: string;
  blocked: number;
  i_lang: string;
  payment_currency: string;
  payment_method: number;
  i_export_type: number;
  lifetime: number;
  i_commission_agent?: number;
  commission_size?: number;
  preferred_codec?: number;
  use_preferred_codec_only: boolean;
  reg_allowed: number;
  welcome_call_ivr?: number;
  on_payment_action?: number;
  min_payment_amount: number;
  trust_cli: boolean;
  disallow_loops: boolean;
  vm_notify_emails?: string;
  vm_forward_emails?: string;
  vm_del_after_fwd: boolean;
  company_name?: string;
  salutation?: string;
  first_name?: string;
  last_name?: string;
  mid_init?: string;
  street_addr?: string;
  state?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  contact?: string;
  phone?: string;
  fax?: string;
  alt_phone?: string;
  alt_contact?: string;
  email?: string;
  cc?: string;
  bcc?: string;
  i_password_policy: number;
  i_media_relay_type: number;
  lan_access?: boolean;
  batch_tag?: string;
  i_provisioning?: number;
  invoicing_enabled?: boolean;
  i_invoice_template?: number;
  i_caller_name_type?: number;
  caller_name?: string;
  followme_enabled?: boolean;
  vm_dialin_access?: boolean;
  hide_own_cli?: boolean;
  block_incoming_anonymous?: boolean;
  i_incoming_anonymous_action?: number;
  dnd_enabled?: boolean;
  description?: string;
  pass_p_asserted_id?: boolean;
  p_assrt_id_translation_rule?: string;
  dncl_lookup?: boolean;
  generate_ringbacktone?: boolean;
  max_calls_per_second?: number | string; // Can be number or "unlimited"
  allow_free_onnet_calls?: boolean;
  start_page?: number;
  trust_privacy_hdrs?: boolean;
  privacy_schemas?: string[];
  created_on?: string;
  created_by?: string;
  updated_on?: string;
  updated_by?: string;
  deleted_by?: string;
  record_version?: number;
  first_use?: string;
  next_billing_time?: string;
  call_recording?: boolean;
}

// Registration status interface based on Sippy API documentation
export interface RegistrationStatus {
  result: string; // 'OK' means that account is registered
  user_agent?: string; // User-Agent header
  contact?: string; // contact header
  expires?: string; // expiration time in '%H:%M:%S.000 GMT %a %b %d %Y' format
  error?: string; // Error message for failed requests
}

// Payment interfaces based on Sippy API documentation
export interface PaymentInfo {
  result: string;
  payment_time: string; // '%H:%M:%S.000 GMT %a %b %d %Y' format
  amount: number;
  currency: string;
  tx_id: string;
  tx_error: string;
  tx_result: number; // 1 = successful, 2 = failed
  by_credit_debit_card: boolean;
  by_voucher: boolean;
  notes: string;
}

export interface Payment {
  payment_time: string; // '%H:%M:%S.000 GMT %a %b %d %Y' format
  amount: number;
  currency: string;
  i_payment: number;
  tx_id: string;
  tx_error: string;
  tx_result: number; // 1 = successful, 2 = failed
  i_account: number;
  i_customer: number;
  by_credit_debit_card: boolean;
  by_voucher: boolean;
  notes: string;
}

export interface PaymentsList {
  result: string;
  payments: Payment[];
}

export interface BalanceOperation {
  result: string;
  tx_id?: string;
  payment_id?: string;
  error?: string;
  tx_error?: string;
  tx_result?: number; // 1 = successful, 2 = failed
  amount?: number;
  currency?: string;
  payment_time?: string;
  i_payment?: number;
  // Additional fields that might be present in Sippy response
  [key: string]: string | number | boolean | undefined;
}

// XML-RPC response interfaces
interface XmlRpcResponse {
  result?: string;
  payments?: unknown[];
  [key: string]: unknown;
}

interface ParsedPayment {
  [key: string]: string | number | boolean;
}

interface ParsedItem {
  [key: string]: string | number | boolean;
}

// Additional types for Sippy API responses
interface CdrWidgetData {
  cost: string;
  duration: number;
  result: number;
  payment_currency?: string;
  connect_time: string;
}

interface RawCdrData {
  cost?: string | number;
  duration?: string | number;
  result?: string | number;
  payment_currency?: string;
  connect_time?: string;
  [key: string]: unknown;
}

interface AccountRatesResponse {
  result?: string;
  rates?: unknown[];
  [key: string]: unknown;
}

// Authentication rule interfaces based on Sippy API documentation
export interface AuthRule {
  i_authentication?: number;
  i_account: number;
  i_protocol: number; // 1=SIP, 2=H.323, 3=IAX2, 4=Calling Card PIN
  remote_ip?: string;
  incoming_cli?: string;
  incoming_cld?: string;
  to_domain?: string;
  from_domain?: string;
  cli_translation_rule?: string;
  cld_translation_rule?: string;
  i_tariff?: number;
  i_routing_group?: number;
  max_sessions?: number; // -1 means unlimited
  max_cps?: number; // null means unlimited
}

export interface AuthRuleResponse {
  result: string;
  i_authentication?: number;
  authrule?: AuthRule;
  authrules?: AuthRule[];
}

// Simple XML-RPC parser for Sippy API responses
function parseXmlRpcResponse(xmlString: string): XmlRpcResponse {
  try {
    // Remove XML declaration and whitespace
    const cleanXml = xmlString.replace(/<\?xml[^>]*\?>/, '').trim();
    
    // Check if it's a fault response - comprehensive fault detection
    if (cleanXml.includes('<fault>')) {
      // Try multiple fault format patterns to handle different XML-RPC implementations
      const faultPatterns = [
        // Standard XML-RPC fault format with <n> tags
        /<fault>\s*<value>\s*<struct>\s*<member>\s*<n>faultCode<\/name>\s*<value><int>(\d+)<\/int><\/value>\s*<\/member>\s*<member>\s*<n>faultString<\/name>\s*<value><string>([^<]*)<\/string><\/value>/,
        // Alternative format with <name> tags
        /<fault>\s*<value>\s*<struct>\s*<member>\s*<name>faultCode<\/name>\s*<value><int>(\d+)<\/int><\/value>\s*<\/member>\s*<member>\s*<name>faultString<\/name>\s*<value><string>([^<]*)<\/string><\/value>/,
        // Compact format
        /<fault><value><struct><member><n>faultCode<\/name><value><int>(\d+)<\/int><\/value><\/member><member><n>faultString<\/name><value><string>([^<]*)<\/string><\/value>/,
        // More flexible pattern that handles various whitespace
        /<fault>[\s\S]*?<n>faultCode<\/name>\s*<value><int>(\d+)<\/int><\/value>[\s\S]*?<n>faultString<\/name>\s*<value><string>([^<]*)<\/string><\/value>/
      ];
      
      for (const pattern of faultPatterns) {
        const match = cleanXml.match(pattern);
        if (match) {
          const faultCode = parseInt(match[1]);
          const faultString = match[2];
          throw new Error(`Sippy API Fault ${faultCode}: ${faultString}`);
        }
      }
      
      // If we couldn't parse the fault structure, throw a generic error
      console.error('Unknown fault format in XML response:', cleanXml.substring(0, 500));
      throw new Error('Sippy API returned a fault response but could not parse fault details');
    }
    
    // Parse successful response
    const result: XmlRpcResponse = {};
    
    // Extract result field
    const resultMatch = cleanXml.match(/<n>result<\/name>\s*<value><string>([^<]*)<\/string><\/value>/);
    if (resultMatch) {
      result.result = resultMatch[1];
    }
    
    // Extract payments array if present
    if (cleanXml.includes('<n>payments</n>')) {
      result.payments = [];
      
      // Find the payments array content
      const paymentsMatch = cleanXml.match(/<n>payments<\/name>\s*<value><array><data>([\s\S]*?)<\/data><\/array><\/value>/);
      if (paymentsMatch) {
        const paymentsData = paymentsMatch[1];
        
        // Extract individual payment structs
        const paymentStructMatches = paymentsData.match(/<value><struct>[\s\S]*?<\/struct><\/value>/g);
        if (paymentStructMatches) {
          for (const paymentStructMatch of paymentStructMatches) {
            const structContent = paymentStructMatch.match(/<value><struct>([\s\S]*?)<\/struct><\/value>/);
            if (structContent) {
              const payment: ParsedPayment = {};
              
              // Extract payment fields
              const fieldMatches = structContent[1].match(/<member>\s*<n>([^<]+)<\/name>\s*<value>(?:<(\w+)>)?([^<]*?)(?:<\/\2>)?<\/value>\s*<\/member>/g);
              if (fieldMatches) {
                for (const fieldMatch of fieldMatches) {
                  const fieldParts = fieldMatch.match(/<n>([^<]+)<\/name>\s*<value>(?:<(\w+)>)?([^<]*?)(?:<\/\2>)?<\/value>/);
                  if (fieldParts) {
                    const fieldName = fieldParts[1];
                    const fieldType = fieldParts[2];
                    const fieldValue = fieldParts[3];
                    
                    // Convert based on type
                    if (fieldType === 'int' || fieldType === 'i4') {
                      payment[fieldName] = parseInt(fieldValue) || 0;
                    } else if (fieldType === 'double') {
                      payment[fieldName] = parseFloat(fieldValue) || 0;
                    } else if (fieldType === 'boolean') {
                      payment[fieldName] = fieldValue === '1' || fieldValue === 'true';
                    } else {
                      payment[fieldName] = fieldValue || '';
                    }
                  }
                }
              }
              
              if (Object.keys(payment).length > 0) {
                result.payments.push(payment);
              }
            }
          }
        }
      }
    }
    
    // Extract other arrays (like CDRs, accounts, auth rules, etc.)
    const arrayMatches = cleanXml.match(/<name>(\w+)<\/name>\s*<value><array><data>[\s\S]*?<\/data><\/array><\/value>/g);
    if (arrayMatches) {
      for (const arrayMatch of arrayMatches) {
                  const arrayParts = arrayMatch.match(/<name>(\w+)<\/name>\s*<value><array><data>([\s\S]*?)<\/data><\/array><\/value>/);
        if (arrayParts) {
          const arrayName = arrayParts[1];
          const arrayData = arrayParts[2];
          
          // Skip if we already processed payments
          if (arrayName === 'payments') continue;
          
          result[arrayName] = [];
          
          // Extract array items
          const itemStructMatches = arrayData.match(/<value><struct>[\s\S]*?<\/struct><\/value>/g);
          if (itemStructMatches) {
            for (const itemStructMatch of itemStructMatches) {
              const structContent = itemStructMatch.match(/<value><struct>([\s\S]*?)<\/struct><\/value>/);
              if (structContent) {
                const item: ParsedItem = {};
                
                const fieldMatches = structContent[1].match(/<member>\s*<n>([^<]+)<\/name>\s*<value>(?:<(\w+)>)?([^<]*?)(?:<\/\2>)?<\/value>\s*<\/member>/g);
                if (fieldMatches) {
                  for (const fieldMatch of fieldMatches) {
                    const fieldParts = fieldMatch.match(/<n>([^<]+)<\/name>\s*<value>(?:<(\w+)>)?([^<]*?)(?:<\/\2>)?<\/value>/);
                    if (fieldParts) {
                      const fieldName = fieldParts[1];
                      const fieldType = fieldParts[2];
                      const fieldValue = fieldParts[3];
                      
                      if (fieldType === 'int' || fieldType === 'i4') {
                        item[fieldName] = parseInt(fieldValue) || 0;
                      } else if (fieldType === 'double') {
                        item[fieldName] = parseFloat(fieldValue) || 0;
                      } else if (fieldType === 'boolean') {
                        item[fieldName] = fieldValue === '1' || fieldValue === 'true';
                      } else {
                        item[fieldName] = fieldValue || '';
                      }
                    }
                  }
                }
                
                if (Object.keys(item).length > 0) {
                  (result[arrayName] as unknown[]).push(item);
                }
              }
            }
          }
        }
      }
    }
    
    // Extract simple fields for single object responses
    // Use multiple patterns to handle different XML-RPC response formats
    const fieldPatterns = [
      // Standard format with <n> tags
      /<member>\s*<n>([^<]+)<\/name>\s*<value>(?:<(\w+)>)?([^<]*?)(?:<\/\2>)?<\/value>\s*<\/member>/g,
      // Alternative format with <name> tags  
      /<member>\s*<name>([^<]+)<\/name>\s*<value>(?:<(\w+)>)?([^<]*?)(?:<\/\2>)?<\/value>\s*<\/member>/g,
      // Compact format without whitespace
      /<member><n>([^<]+)<\/name><value>(?:<(\w+)>)?([^<]*?)(?:<\/\2>)?<\/value><\/member>/g
    ];
    
    for (const pattern of fieldPatterns) {
      const fieldMatches = cleanXml.match(pattern);
      if (fieldMatches) {
        for (const fieldMatch of fieldMatches) {
          const fieldParts = fieldMatch.match(/<(?:n|name)>([^<]+)<\/(?:n|name)>\s*<value>(?:<(\w+)>)?([^<]*?)(?:<\/\2>)?<\/value>/);
          if (fieldParts) {
            const fieldName = fieldParts[1];
            const fieldType = fieldParts[2];
            const fieldValue = fieldParts[3];
            
            // Skip if we already have this field (arrays take precedence)
            if (result[fieldName] !== undefined) continue;
            
            if (fieldType === 'int' || fieldType === 'i4') {
              result[fieldName] = parseInt(fieldValue) || 0;
            } else if (fieldType === 'double') {
              result[fieldName] = parseFloat(fieldValue) || 0;
            } else if (fieldType === 'boolean') {
              result[fieldName] = fieldValue === '1' || fieldValue === 'true';
            } else {
              result[fieldName] = fieldValue || '';
            }
          }
        }
        break; // Stop after finding the first matching pattern
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('Error parsing XML-RPC response:', error);
    console.error('XML content:', xmlString.substring(0, 1000));
    throw new Error(`Failed to parse XML-RPC response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export class SippyClient {
  private credentials: SippyCredentials;
  private apiUrl: string;

  constructor(creds: SippyCredentials) {
    this.credentials = creds;
    
    // Normalize host URL format - remove any existing path components
    let host = creds.host;
    if (!host.startsWith('http://') && !host.startsWith('https://')) {
      host = 'https://' + host;
    }
    
    // Remove any trailing /xmlapi/xmlapi that might be part of the host
    if (host.endsWith('/xmlapi/xmlapi')) {
      host = host.substring(0, host.length - 13);
    }
    
    // Set the correct URL for Sippy API
    this.apiUrl = `${host}/xmlapi/xmlapi`;
  }
  
  /**
   * Creates an XML-RPC request payload following Sippy's example curl format
   */
  private createXmlRpcRequest(method: string, params: Record<string, unknown> = {}): string {
    // Build XML-RPC request parameters
    const paramElements: string[] = [];
    
    for (const [key, value] of Object.entries(params)) {
      let valueXml;
      
      if (typeof value === 'number') {
        if (Number.isInteger(value)) {
          valueXml = `<int>${value}</int>`;
        } else {
          valueXml = `<double>${value}</double>`;
        }
      } else if (typeof value === 'boolean') {
        valueXml = `<boolean>${value ? '1' : '0'}</boolean>`;
      } else if (typeof value === 'string') {
        valueXml = `<string>${value}</string>`;
      } else if (Array.isArray(value)) {
        valueXml = `<array><data>${value.map(item => 
          `<value>${typeof item === 'string' ? `<string>${item}</string>` : `<int>${item}</int>`}</value>`
        ).join('')}</data></array>`;
      } else {
        valueXml = `<string>${String(value)}</string>`;
      }
      
      paramElements.push(`<member><name>${key}</name><value>${valueXml}</value></member>`);
    }
    
    // Format exactly following Sippy's example from curl
    const xml = `<?xml version="1.0"?>
<methodCall><methodName>${method}</methodName>
<params><param><value><struct>
${paramElements.join('\n')}
</struct></value></param></params></methodCall>`;

    return xml;
  }

  /**
   * Make a request to the Sippy API using Digest Authentication
   */
  private async makeRequest<T>(method: string, params: Record<string, unknown> = {}, customTimeout?: number, parseXml: boolean = true): Promise<T> {
    try {
      // Format the XML-RPC request
      const xmlData = this.createXmlRpcRequest(method, params);

      // First request to get the digest challenge
      let response;
      try {
        response = await axios({
          method: 'post',
          url: this.apiUrl,
          data: xmlData,
          headers: {
            'Content-Type': 'text/xml',
            'User-Agent': 'Sippy-Dashboard/1.0'
          },
          httpsAgent: new Agent({ rejectUnauthorized: false }),
          validateStatus: status => status === 401,
          timeout: customTimeout || 60000 // Use custom timeout or default 60 seconds
        });
      } catch {
        throw new Error('Failed to get digest challenge from Sippy API.');
      }

      // Extract digest parameters from WWW-Authenticate header
      const authHeader = response.headers['www-authenticate'];
      if (!authHeader) throw new Error('No WWW-Authenticate header received from Sippy API.');
      const realm = authHeader.match(/realm="([^"]+)"/)[1];
      const nonce = authHeader.match(/nonce="([^"]+)"/)[1];
      const qop = authHeader.match(/qop="([^"]+)"/)[1];
      const uri = '/xmlapi/xmlapi';
      const methodStr = 'POST';
      const nc = '00000001';
      const cnonce = crypto.randomBytes(16).toString('hex');
      const ha1 = crypto.createHash('md5').update(`${this.credentials.username}:${realm}:${this.credentials.password}`).digest('hex');
      const ha2 = crypto.createHash('md5').update(`${methodStr}:${uri}`).digest('hex');
      const responseDigest = crypto.createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest('hex');
      const digestAuth = `Digest username="${this.credentials.username}", realm="${realm}", nonce="${nonce}", uri="${uri}", algorithm=MD5, qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${responseDigest}"`;

      // Second request with digest authentication
      const authenticatedResponse = await axios({
        method: 'post',
        url: this.apiUrl,
        data: xmlData,
        headers: {
          'Content-Type': 'text/xml',
          'User-Agent': 'Sippy-Dashboard/1.0',
          'Authorization': digestAuth
        },
        httpsAgent: new Agent({ rejectUnauthorized: false }),
        timeout: customTimeout || 60000 // Use custom timeout or default 60 seconds
      });

      // Validate response content type
      const contentType = authenticatedResponse.headers['content-type'] || '';
      if (contentType.includes('text/html')) {
        throw new Error('Received HTML response instead of XML-RPC. Check API endpoint and authentication.');
      }
      
      // Return raw XML if parseXml is false, otherwise parse it
      if (!parseXml) {
        return authenticatedResponse.data as unknown as T;
      }
      
      const parsedResult = parseXmlRpcResponse(authenticatedResponse.data as string) as unknown as T;
      
      return parsedResult;
    } catch (error) {
      console.error(`Error in Sippy API request ${method}:`, error);
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const contentType = error.response.headers['content-type'] || '';
          if (contentType.includes('text/html')) {
            throw new Error('Authentication error or invalid Sippy API endpoint. Please check your credentials.');
          }
          console.error('Error response:', error.response.status, error.response.data);
          throw new Error(`Sippy API Error: ${error.response.status} - ${error.response.statusText}`);
        } else if (error.request) {
          throw new Error('No response received from Sippy API. Check network connectivity and API endpoint.');
        }
      }
      throw error;
    }
  }

  async listAllCalls(opts: { i_account?: number } = {}): Promise<Call[]> {
    const result = await this.makeRequest<Call[]>('listAllCalls', opts);
    return result || [];
  }

  async listActiveCalls(opts: { i_account?: number } = {}): Promise<Call[]> {
    const result = await this.makeRequest<Call[]>('listActiveCalls', opts);
    return result || [];
  }

  async disconnectCall(opts: { i_call: number }): Promise<void> {
    await this.makeRequest<void>('disconnectCall', opts);
  }

  async disconnectAccount(opts: { i_account: number }): Promise<void> {
    await this.makeRequest<void>('disconnectAccount', opts);
  }

  async getAccountCallStatsCustomer(opts: { i_account?: number } = {}): Promise<Stats> {
    const result = await this.makeRequest<Stats>('getAccountCallStatsCustomer', opts);
    return result || {
      total_calls: 0,
      connected_calls: 0,
      average_duration: 0,
      total_minutes: 0
    };
  }

  async getAccountCDRs(opts: {
    i_account?: number;
    start_date?: string; // ISO
    end_date?: string;
    offset?: number;
    limit?: number;
    type?: string; // Add type parameter for CDR filtering
    cli?: string;
    cld?: string;
    i_cdr?: string;
  } = {}, customTimeout?: number): Promise<CdrRow[]> {
    console.log('🔍 SippyClient.getAccountCDRs called with options:', opts);
    // Use custom timeout if provided, otherwise use default axios timeout (60s)
    // Return raw XML for compatibility with existing CDR parsers
    const result = await this.makeRequest<CdrRow[]>('getAccountCDRs', opts, customTimeout, false);
    return result || [];
  }

  /**
   * Get CDRs optimized for dashboard widgets - extracts only essential fields
   * This reduces memory usage by ~95% compared to full CDR data
   */
  async getAccountCDRsForWidgets(opts: {
    i_account?: number;
    start_date?: string;
    end_date?: string;
    offset?: number;
    limit?: number;
    type?: string;
    cli?: string;
    cld?: string;
    i_cdr?: string;
  } = {}, customTimeout?: number): Promise<CdrWidgetData[]> {
    console.log('🔍 SippyClient.getAccountCDRsForWidgets called with options:', opts);
    console.log('⚡ Optimized for dashboard widgets - extracting only essential fields');
    
    // Get the raw XML response
    const rawResult = await this.makeRequest<RawCdrData[]>('getAccountCDRs', opts, customTimeout);
    
    // If the result is already parsed (array), extract essential fields
    if (Array.isArray(rawResult)) {
      console.log(`📊 Extracting essential fields from ${rawResult.length} CDRs`);
      return rawResult.map((cdr: RawCdrData): CdrWidgetData => ({
        cost: (typeof cdr.cost === 'string' ? cdr.cost : cdr.cost?.toString()) || '0',
        duration: typeof cdr.duration === 'number' ? cdr.duration : parseInt(cdr.duration?.toString() || '0') || 0,
        result: typeof cdr.result === 'number' ? cdr.result : parseInt(cdr.result?.toString() || '0') || 0,
        payment_currency: cdr.payment_currency,
        connect_time: cdr.connect_time || ''
      }));
    }
    
    // If it's raw XML, we need to parse it and extract only essential fields
    // This would require implementing a lightweight XML parser here
    // For now, return empty array if not already parsed
    console.log('⚠️ Raw XML response received - full parsing required');
    return [];
  }

  /**
   * Get detailed account information from Sippy API
   * @param opts Options object with account ID
   * @returns Account information (raw XML for compatibility with existing parsers)
   */
  async getAccountInfo(opts: { i_account: number }): Promise<AccountInfo> {
    const xmlString = await this.makeRequest<string>('getAccountInfo', opts, undefined, false);
    
    // Parse the XML response into AccountInfo object
    try {
      const cleanXml = xmlString.replace(/<\?xml[^>]*\?>/, '').trim();
      
      // Check for fault response
      if (cleanXml.includes('<fault>')) {
        throw new Error('Sippy API returned a fault response for getAccountInfo');
      }
      
      const accountInfo: Partial<AccountInfo> = {};
      
      // Parse all the account fields from XML
      const memberMatches = cleanXml.match(/<member>\s*<name>([^<]+)<\/name>\s*<value>(?:<(\w+)>)?([^<]*?)(?:<\/\2>)?<\/value>\s*<\/member>/g);
      
      if (memberMatches) {
        for (const memberMatch of memberMatches) {
          const memberParts = memberMatch.match(/<name>([^<]+)<\/name>\s*<value>(?:<(\w+)>)?([^<]*?)(?:<\/\2>)?<\/value>/);
          if (memberParts) {
            const fieldName = memberParts[1];
            const fieldType = memberParts[2];
            const fieldValue = memberParts[3];
            
            // Convert based on type and field name
            if (fieldType === 'int' || fieldType === 'i4') {
              // Handle special case for capacity fields that can be "Unlimited"
              if ((fieldName === 'max_sessions' || fieldName === 'max_calls_per_second') && 
                  (fieldValue === 'Unlimited' || fieldValue.toLowerCase() === 'unlimited' || fieldValue === '-1' || fieldValue === '0')) {
                (accountInfo as any)[fieldName] = 'Unlimited';
              } else {
                (accountInfo as any)[fieldName] = parseInt(fieldValue) || 0;
              }
            } else if (fieldType === 'double') {
              // Handle special case for max_calls_per_second that can be "Unlimited"
              if (fieldName === 'max_calls_per_second' && 
                  (fieldValue === 'Unlimited' || fieldValue.toLowerCase() === 'unlimited' || fieldValue === '-1' || fieldValue === '0')) {
                (accountInfo as any)[fieldName] = 'Unlimited';
              } else {
                (accountInfo as any)[fieldName] = parseFloat(fieldValue) || 0;
              }
            } else if (fieldType === 'boolean') {
              (accountInfo as any)[fieldName] = fieldValue === '1' || fieldValue === 'true';
            } else if (fieldType === 'nil' || fieldValue === '') {
              (accountInfo as any)[fieldName] = null;
            } else {
              // Handle string values for capacity fields
              if ((fieldName === 'max_sessions' || fieldName === 'max_calls_per_second') && 
                  (fieldValue === 'Unlimited' || fieldValue.toLowerCase() === 'unlimited')) {
                (accountInfo as any)[fieldName] = 'Unlimited';
              } else {
                (accountInfo as any)[fieldName] = fieldValue || '';
              }
            }
          }
        }
      }
      
      // Handle arrays like privacy_schemas
      const arrayMatches = cleanXml.match(/<name>privacy_schemas<\/name>\s*<value><array><data>([\s\S]*?)<\/data><\/array><\/value>/);
      if (arrayMatches) {
        const arrayData = arrayMatches[1];
        const stringMatches = arrayData.match(/<value><string>([^<]*)<\/string><\/value>/g);
        if (stringMatches) {
          accountInfo.privacy_schemas = stringMatches.map(match => {
            const stringMatch = match.match(/<string>([^<]*)<\/string>/);
            return stringMatch ? stringMatch[1] : '';
          });
        }
      }
      
      return accountInfo as AccountInfo;
      
    } catch (error) {
      console.error('Failed to parse account info XML:', error);
      throw new Error(`Failed to parse account info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get multiple accounts information from Sippy API
   * @param opts Options for filtering accounts
   * @returns Array of account information
   */
  async getAccountsList(opts: {
    offset?: number;
    limit?: number;
    i_customer?: number;
    i_account_class?: number;
    account_status?: string;
  } = {}): Promise<AccountInfo[]> {
    const result = await this.makeRequest<AccountInfo[]>('getAccountsList', opts);
    return result || [];
  }

  /**
   * Get rates for a specific account
   * Based on Sippy XML-RPC API documentation: getAccountRates()
   * Returns raw XML for custom parsing (similar to CDRs)
   */
  async getAccountRates(opts: {
    i_account: number;
    offset?: number;
    limit?: number;
    prefix?: string;
  }): Promise<AccountRatesResponse> {
    return this.makeRequest<AccountRatesResponse>('getAccountRates', opts, undefined, false);
  }

  // Payment Methods based on Sippy API documentation

  /**
   * Get payment details for a specific payment
   * @param opts Options with payment ID and account/customer ID
   * @returns Payment information
   */
  async getPaymentInfo(opts: {
    i_payment: number;
    i_account?: number;
    i_customer?: number;
  }): Promise<PaymentInfo> {
    return this.makeRequest<PaymentInfo>('getPaymentInfo', opts);
  }

  /**
   * Get list of payments for an account or customer
   * @param opts Options for filtering payments
   * @returns List of payments (raw XML for custom parsing)
   */
  async getPaymentsList(opts: {
    i_account?: number;
    i_customer?: number;
    offset?: number;
    limit?: number;
    start_date?: string; // '%H:%M:%S.000 GMT %a %b %d %Y' format
    end_date?: string; // '%H:%M:%S.000 GMT %a %b %d %Y' format
    type?: 'credit' | 'debit';
  } = {}): Promise<PaymentsList> {
    return this.makeRequest<PaymentsList>('getPaymentsList', opts, undefined, false);
  }

  /**
   * Add funds to an account (credit the balance)
   * @param opts Options with account ID, amount, and currency
   * @returns Operation result
   */
  async accountAddFunds(opts: {
    i_account: number;
    amount: number;
    currency: string;
    payment_notes?: string;
    payment_time?: string; // '%H:%M:%S.000 GMT %a %b %d %Y' format
  }): Promise<BalanceOperation> {
    return this.makeRequest<BalanceOperation>('accountAddFunds', opts);
  }

  /**
   * Credit an account's balance
   * @param opts Options with account ID, amount, and currency
   * @returns Operation result
   */
  async accountCredit(opts: {
    i_account: number;
    amount: number;
    currency: string;
    payment_notes?: string;
    payment_time?: string; // '%H:%M:%S.000 GMT %a %b %d %Y' format
  }): Promise<BalanceOperation> {
    return this.makeRequest<BalanceOperation>('accountCredit', opts);
  }

  /**
   * Debit an account's balance
   * @param opts Options with account ID, amount, and currency
   * @returns Operation result
   */
  async accountDebit(opts: {
    i_account: number;
    amount: number;
    currency: string;
    payment_notes?: string;
    payment_time?: string; // '%H:%M:%S.000 GMT %a %b %d %Y' format
  }): Promise<BalanceOperation> {
    return this.makeRequest<BalanceOperation>('accountDebit', opts);
  }

  /**
   * Add credit to an account's balance (alias for accountCredit)
   * Used by payment processing webhooks
   * @param opts Options with account ID, amount, and currency
   * @returns Operation result
   */
  async addAccountCredit(opts: {
    i_account: number;
    amount: number;
    currency: string;
    payment_notes?: string;
    payment_time?: string; // '%H:%M:%S.000 GMT %a %b %d %Y' format
  }): Promise<BalanceOperation> {
    return this.accountCredit(opts);
  }

  /**
   * Get SIP registration status of an account
   * @param opts Options containing the account ID
   * @returns Registration status information
   * @throws XML-RPC fault with code 403 if account is not registered
   */
  async getRegistrationStatus(opts: { i_account: number }): Promise<RegistrationStatus> {
    try {
      const result = await this.makeRequest<RegistrationStatus>('getRegistrationStatus', opts);
      
      // Ensure we have the expected format
      if (typeof result === 'object' && result !== null) {
        // Check if we got a successful registration status response
        if ('result' in result) {
          return result as RegistrationStatus;
        }
      }
      
      // If the response doesn't match expected format, return a fallback
      return {
        result: 'UNKNOWN',
        error: 'Unexpected response format from Sippy API'
      };
      
    } catch (error) {
      // Handle fault code 403 (Account is not registered) as a valid response
      if (error instanceof Error && error.message.includes('Sippy API Fault 403')) {
        return {
          result: 'NOT_REGISTERED',
          error: 'Account is not registered'
        };
      }
      
      // Re-throw with more context for other errors
      if (error instanceof Error) {
        throw new Error(`Registration status error for account ${opts.i_account}: ${error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Block a Sippy account
   * @param opts Options containing the account ID
   * @returns Operation result
   * @throws XML-RPC fault in case of any error
   */
  async blockAccount(opts: { i_account: number }): Promise<{ result: string }> {
    try {
      const result = await this.makeRequest<{ result: string }>('blockAccount', opts);
      
      // Ensure we have the expected format
      if (typeof result === 'object' && result !== null && 'result' in result) {
        return result;
      }
      
      throw new Error('Unexpected response format from Sippy API');
      
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Block account error for account ${opts.i_account}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Unblock a Sippy account
   * @param opts Options containing the account ID
   * @returns Operation result
   * @throws XML-RPC fault in case of any error
   */
  async unblockAccount(opts: { i_account: number }): Promise<{ result: string }> {
    try {
      const result = await this.makeRequest<{ result: string }>('unblockAccount', opts);
      
      // Ensure we have the expected format
      if (typeof result === 'object' && result !== null && 'result' in result) {
        return result;
      }
      
      throw new Error('Unexpected response format from Sippy API');
      
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Unblock account error for account ${opts.i_account}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Update account parameters (max sessions and CPS limits)
   * @param opts Options containing the account ID and parameters to update
   * @returns Operation result
   * @throws XML-RPC fault in case of any error
   */
  async updateAccount(opts: { 
    i_account: number;
    max_sessions?: number | string;
    max_calls_per_second?: number | string;
  }): Promise<{ result: string }> {
    const params: any = {
      i_account: opts.i_account
    };

    // Handle max_sessions
    if (opts.max_sessions !== undefined) {
      if (typeof opts.max_sessions === 'string') {
        const lower = opts.max_sessions.toLowerCase();
        if (lower === 'unlimited') {
          params.max_sessions = -1;
        } else {
          const numValue = parseInt(opts.max_sessions);
          if (!isNaN(numValue) && (numValue >= 1 || numValue === -1)) {
            params.max_sessions = numValue;
          } else {
            throw new Error('Invalid max_sessions value. Must be a number >= 1 or "unlimited"');
          }
        }
      } else if (typeof opts.max_sessions === 'number') {
        if (opts.max_sessions >= 1 || opts.max_sessions === -1) {
          params.max_sessions = opts.max_sessions;
        } else {
          throw new Error('Invalid max_sessions value. Must be >= 1 or -1 for unlimited');
        }
      }
    }

    // Handle max_calls_per_second
    if (opts.max_calls_per_second !== undefined) {
      if (typeof opts.max_calls_per_second === 'string') {
        const lower = opts.max_calls_per_second.toLowerCase();
        if (lower !== 'unlimited') {
          const numValue = parseFloat(opts.max_calls_per_second);
          if (!isNaN(numValue) && numValue >= 0.1) {
            params.max_calls_per_second = numValue;
          } else {
            throw new Error('Invalid max_calls_per_second value. Must be a number >= 0.1 or "unlimited"');
          }
        }
        // For unlimited, we don't add the parameter (omit it)
      } else if (typeof opts.max_calls_per_second === 'number') {
        if (opts.max_calls_per_second >= 0.1) {
          params.max_calls_per_second = opts.max_calls_per_second;
        } else {
          throw new Error('Invalid max_calls_per_second value. Must be >= 0.1');
        }
      }
    }

    return this.makeRequest<{ result: string }>('updateAccount', params);
  }

  // Authentication Rules Management
  async addAuthRule(opts: {
    i_account: number;
    i_protocol: number;
    remote_ip?: string;
    incoming_cli?: string;
    incoming_cld?: string;
    to_domain?: string;
    from_domain?: string;
    cli_translation_rule?: string;
    cld_translation_rule?: string;
    i_tariff?: number;
    i_routing_group?: number;
    max_sessions?: number;
    max_cps?: number;
  }): Promise<AuthRuleResponse> {
    return this.makeRequest<AuthRuleResponse>('addAuthRule', opts);
  }

  async updateAuthRule(opts: {
    i_authentication: number;
    i_protocol?: number;
    remote_ip?: string;
    incoming_cli?: string;
    incoming_cld?: string;
    to_domain?: string;
    from_domain?: string;
    cli_translation_rule?: string;
    cld_translation_rule?: string;
    i_tariff?: number;
    i_routing_group?: number;
    max_sessions?: number;
    max_cps?: number;
  }): Promise<AuthRuleResponse> {
    return this.makeRequest<AuthRuleResponse>('updateAuthRule', opts);
  }

  async delAuthRule(opts: {
    i_authentication: number;
  }): Promise<AuthRuleResponse> {
    return this.makeRequest<AuthRuleResponse>('delAuthRule', opts);
  }

  async getAuthRuleInfo(opts: {
    i_authentication: number;
  }): Promise<AuthRuleResponse> {
    return this.makeRequest<AuthRuleResponse>('getAuthRuleInfo', opts);
  }

  async listAuthRules(opts: {
    i_account: number;
    i_protocol?: number;
    remote_ip?: string;
    offset?: number;
    limit?: number;
  }): Promise<AuthRuleResponse> {
    return this.makeRequest<AuthRuleResponse>('listAuthRules', opts);
  }
} 