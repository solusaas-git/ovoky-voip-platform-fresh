import axios from 'axios';
import crypto from 'crypto';
import { Agent } from 'https';

export interface SippyCredentials {
  username: string;
  password: string;
  host: string; // e.g. "https://switch.example.com"
}

export interface RequestOptions {
  customTimeout?: number;
  parseXml?: boolean;
}

// XML-RPC response interfaces
export interface XmlRpcResponse {
  result?: string;
  [key: string]: unknown;
}

export interface XmlRpcFault {
  faultCode: number;
  faultString: string;
}

/**
 * Base Sippy client with shared authentication and request functionality
 * All specialized Sippy clients inherit from this class
 */
export abstract class SippyBaseClient {
  protected credentials: SippyCredentials;
  protected apiUrl: string;

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
  protected createXmlRpcRequest(method: string, params: Record<string, unknown> = {}): string {
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
   * This is the core method that all specialized clients use
   */
  protected async makeRequest<T>(
    method: string, 
    params: Record<string, unknown> = {}, 
    options: RequestOptions = {}
  ): Promise<T> {
    const { customTimeout = 60000, parseXml = false } = options;
    
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
          timeout: customTimeout
        });
      } catch {
        throw new Error('Failed to get digest challenge from Sippy API.');
      }

      // Extract digest parameters from WWW-Authenticate header
      const authHeader = response.headers['www-authenticate'];
      if (!authHeader) throw new Error('No WWW-Authenticate header received from Sippy API.');
      const realm = authHeader.match(/realm="([^"]+)"/)?.[1];
      const nonce = authHeader.match(/nonce="([^"]+)"/)?.[1];
      const qop = authHeader.match(/qop="([^"]+)"/)?.[1];
      
      if (!realm || !nonce || !qop) {
        throw new Error('Invalid digest authentication parameters received from Sippy API.');
      }
      
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
        timeout: customTimeout
      });

      // Validate response content type
      const contentType = authenticatedResponse.headers['content-type'] || '';
      if (contentType.includes('text/html')) {
        throw new Error('Received HTML response instead of XML-RPC. Check API endpoint and authentication.');
      }
      
      // Return raw XML or parsed data based on options
      if (parseXml) {
        // For modules that need parsed data (like payments)
        return this.parseXmlRpcResponse(authenticatedResponse.data as string) as unknown as T;
      } else {
        // For modules that need raw XML (like dashboard, CDRs)
        return authenticatedResponse.data as unknown as T;
      }
      
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

  /**
   * Simple XML-RPC parser for modules that need parsed data
   * This is a basic implementation - specialized modules can override this
   */
  protected parseXmlRpcResponse(xmlString: string): XmlRpcResponse {
    try {
      // Remove XML declaration and whitespace
      const cleanXml = xmlString.replace(/<\?xml[^>]*\?>/, '').trim();
      
      // Check if it's a fault response
      if (cleanXml.includes('<fault>')) {
        const faultCodeMatch = cleanXml.match(/<name>faultCode<\/name>\s*<value><int>(\d+)<\/int><\/value>/);
        const faultStringMatch = cleanXml.match(/<name>faultString<\/name>\s*<value><string>([^<]*)<\/string><\/value>/);
        
        const faultCode = faultCodeMatch ? parseInt(faultCodeMatch[1]) : 0;
        const faultString = faultStringMatch ? faultStringMatch[1] : 'Unknown error';
        
        throw new Error(`Sippy API Fault ${faultCode}: ${faultString}`);
      }
      
      // Basic parsing - specialized modules can implement more sophisticated parsing
      const result: XmlRpcResponse = {};
      
      // Extract result field
      const resultMatch = cleanXml.match(/<name>result<\/name>\s*<value><string>([^<]*)<\/string><\/value>/);
      if (resultMatch) {
        result.result = resultMatch[1];
      }
      
      return result;
      
    } catch (error) {
      console.error('Error parsing XML-RPC response:', error);
      console.error('XML content:', xmlString.substring(0, 1000));
      throw new Error(`Failed to parse XML-RPC response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 