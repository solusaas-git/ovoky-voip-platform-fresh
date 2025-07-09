import { SippyBaseClient } from '../core/SippyBaseClient';
import { 
  BaseRequestOptions,
  SippyParseError,
  SippyTimeoutError
} from '../core/types';

export interface ActiveCallsOptions extends BaseRequestOptions {
  i_account: number;
}

export interface DisconnectCallOptions {
  call_id: string;
  i_account?: number;
  [key: string]: unknown;
}

export interface ActiveCall {
  CLI: string;
  CLD: string;
  CALL_ID: string;
  DELAY: number;
  DURATION: number;
  CC_STATE: string;
  I_ACCOUNT: number;
  ID: string;
  I_CUSTOMER: string;
  I_ENVIRONMENT: string;
  CALLER_MEDIA_IP: string;
  CALLEE_MEDIA_IP: string;
  SETUP_TIME: string;
  DIRECTION: string;
  NODE_ID?: string;
  I_CONNECTION: number;
}

/**
 * Specialized Sippy client for call management operations
 * Features:
 * - Real-time active calls monitoring
 * - Call disconnection capabilities
 * - Robust XML parsing for call data
 * - Call-specific error handling
 */
export class SippyCallsClient extends SippyBaseClient {
  
  // Calls-specific configuration
  private readonly CALLS_TIMEOUT = 30000; // 30 seconds for call operations
  
  /**
   * Get list of active calls for an account
   * Returns parsed active calls with proper error handling
   */
  async getActiveCalls(opts: ActiveCallsOptions): Promise<ActiveCall[]> {
    try {
      const rawXml = await this.makeRequest<string>('listActiveCalls', opts, {
        customTimeout: this.CALLS_TIMEOUT,
        parseXml: false // We'll do custom parsing for calls
      });
      
      // Custom parsing for active calls
      return this.parseActiveCallsXml(rawXml);
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new SippyTimeoutError(`Active calls request timed out after ${this.CALLS_TIMEOUT}ms`, 'listActiveCalls');
      }
      throw error;
    }
  }

  /**
   * Disconnect a specific call
   */
  async disconnectCall(opts: DisconnectCallOptions): Promise<{ result: string }> {
    try {
      const result = await this.makeRequest<{ result: string }>('disconnectCall', opts, {
        customTimeout: this.CALLS_TIMEOUT,
        parseXml: true
      });
      
      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new SippyTimeoutError(`Disconnect call request timed out after ${this.CALLS_TIMEOUT}ms`, 'disconnectCall');
      }
      throw error;
    }
  }

  /**
   * Disconnect all calls for an account
   */
  async disconnectAllCalls(opts: ActiveCallsOptions): Promise<{ result: string }> {
    try {
      const result = await this.makeRequest<{ result: string }>('disconnectAllCalls', opts, {
        customTimeout: this.CALLS_TIMEOUT,
        parseXml: true
      });
      
      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new SippyTimeoutError(`Disconnect all calls request timed out after ${this.CALLS_TIMEOUT}ms`, 'disconnectAllCalls');
      }
      throw error;
    }
  }

  /**
   * Custom XML parser specifically for active calls
   * Handles the direct array structure returned by listActiveCalls
   */
  private parseActiveCallsXml(xmlString: string): ActiveCall[] {
    try {
      if (typeof xmlString !== 'string') {
        return [];
      }

      // Check for fault response first
      const faultRegex = new RegExp('<fault>\\s*<value>\\s*<struct>(.*?)</struct>\\s*</value>\\s*</fault>', 's');
      const faultMatch = xmlString.match(faultRegex);
      if (faultMatch) {
        const faultContent = faultMatch[1];
        const codeMatch = faultContent.match(/<name>faultCode<\/name>\s*<value>\s*<int>(\d+)<\/int>/);
        const messageMatch = faultContent.match(/<name>faultString<\/name>\s*<value>\s*<string>([^<]*)<\/string>/);
        
        const faultCode = codeMatch ? parseInt(codeMatch[1], 10) : 'Unknown';
        const faultMessage = messageMatch ? messageMatch[1] : 'Unknown error';
        
        throw new SippyParseError(`Active calls parsing failed - Sippy API Fault ${faultCode}: ${faultMessage}`);
      }

      // Active Calls API returns direct array structure: <methodResponse><params><param><value><array><data>
      const directArrayRegex = new RegExp('<methodResponse>\\s*<params>\\s*<param>\\s*<value>\\s*<array>\\s*<data>(.*?)</data>\\s*</array>', 's');
      const directArrayMatch = xmlString.match(directArrayRegex);
      
      if (!directArrayMatch) {
        return []; // No active calls found - this is normal
      }

      const callsData = directArrayMatch[1];
      const calls: ActiveCall[] = [];

      // Find all struct elements within the calls array
      const structRegex = new RegExp('<value>\\s*<struct>(.*?)</struct>\\s*</value>', 'gs');
      let structMatch;
      
      while ((structMatch = structRegex.exec(callsData)) !== null) {
        const structContent = structMatch[1];
        
        const call: Partial<ActiveCall> = {};
        
        // Extract all members from this struct
        const memberRegex = new RegExp('<member>\\s*<name>([^<]+)</name>\\s*<value>\\s*<([^>]+)>([^<]*)</[^>]+>\\s*</value>\\s*</member>', 'gs');
        let memberMatch;
        
        while ((memberMatch = memberRegex.exec(structContent)) !== null) {
          const [, name, type, value] = memberMatch;
          
          let parsedValue: unknown;
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
          
          (call as Record<string, unknown>)[name] = parsedValue;
        }
        
        // Only add call if it has essential fields
        if (call.CALL_ID && call.CLI && call.CLD) {
          // Ensure required fields have default values
          const completeCall: ActiveCall = {
            CLI: call.CLI || '',
            CLD: call.CLD || '',
            CALL_ID: call.CALL_ID || '',
            DELAY: call.DELAY || 0,
            DURATION: call.DURATION || 0,
            CC_STATE: call.CC_STATE || 'Unknown',
            I_ACCOUNT: call.I_ACCOUNT || 0,
            ID: call.ID || call.CALL_ID || '',
            I_CUSTOMER: call.I_CUSTOMER || '',
            I_ENVIRONMENT: call.I_ENVIRONMENT || '',
            CALLER_MEDIA_IP: call.CALLER_MEDIA_IP || '',
            CALLEE_MEDIA_IP: call.CALLEE_MEDIA_IP || '',
            SETUP_TIME: call.SETUP_TIME || '',
            DIRECTION: call.DIRECTION || '',
            NODE_ID: call.NODE_ID,
            I_CONNECTION: call.I_CONNECTION || 0
          };
          
          calls.push(completeCall);
        }
      }

      return calls;
      
    } catch (error) {
      if (error instanceof SippyParseError) {
        throw error;
      }
      throw new SippyParseError(
        `Active calls XML parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        xmlString.substring(0, 1000)
      );
    }
  }

  /**
   * Get calls configuration
   */
  getCallsConfig() {
    return {
      timeout: this.CALLS_TIMEOUT,
      features: [
        'Real-time active calls monitoring',
        'Call disconnection capabilities',
        'Robust XML parsing for call data',
        'Call-specific error handling'
      ]
    };
  }
} 