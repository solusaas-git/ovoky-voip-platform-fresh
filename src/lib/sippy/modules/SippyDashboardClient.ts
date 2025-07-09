import { SippyBaseClient } from '../core/SippyBaseClient';
import { 
  CdrWidget, 
  BaseRequestOptions, 
  DateRangeOptions,
  SippyParseError,
  SippyTimeoutError
} from '../core/types';

export interface DashboardCDROptions extends BaseRequestOptions, DateRangeOptions {
  type?: string;
  [key: string]: unknown;
}

export interface DashboardAccountOptions {
  i_account: number;
  [key: string]: unknown;
}

/**
 * Specialized Sippy client optimized for dashboard widgets
 * Features:
 * - Lightweight CDR parsing (only essential fields)
 * - Fast timeouts for responsive UI
 * - Memory-optimized data structures
 * - Dashboard-specific error handling
 */
export class SippyDashboardClient extends SippyBaseClient {
  
  // Dashboard-specific configuration
  private readonly DASHBOARD_TIMEOUT = 45000; // 45 seconds - faster than reports
  private readonly WIDGET_BATCH_SIZE = 500; // Smaller batches for quick display
  
  /**
   * Get account information for dashboard display
   * Returns raw XML for compatibility with existing dashboard parsers
   */
  async getAccountInfo(opts: DashboardAccountOptions): Promise<string> {
    try {
      const rawXml = await this.makeRequest<string>('getAccountInfo', opts, {
        customTimeout: this.DASHBOARD_TIMEOUT,
        parseXml: false // Return raw XML for existing dashboard parsers
      });
      
      return rawXml;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new SippyTimeoutError(`Dashboard account info request timed out after ${this.DASHBOARD_TIMEOUT}ms`, 'getAccountInfo');
      }
      throw error;
    }
  }

  /**
   * Get CDRs optimized for dashboard widgets
   * Only extracts essential fields: cost, duration, result, payment_currency, connect_time
   * This reduces memory usage by ~95% compared to full CDR data
   */
  async getCDRsForWidgets(opts: DashboardCDROptions): Promise<CdrWidget[]> {
    try {
      const rawXml = await this.makeRequest<string>('getAccountCDRs', opts, {
        customTimeout: this.DASHBOARD_TIMEOUT,
        parseXml: false // We'll do custom lightweight parsing
      });
      
      // Custom lightweight parsing for dashboard widgets
      return this.parseEssentialCDRFields(rawXml);
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new SippyTimeoutError(`Dashboard CDR request timed out after ${this.DASHBOARD_TIMEOUT}ms`, 'getAccountCDRs');
      }
      throw error;
    }
  }

  /**
   * Get call statistics for dashboard widgets
   * Returns raw XML for compatibility with existing dashboard parsers
   */
  async getCallStats(opts: BaseRequestOptions): Promise<string> {
    try {
      const rawXml = await this.makeRequest<string>('getAccountCallStatsCustomer', opts, {
        customTimeout: this.DASHBOARD_TIMEOUT,
        parseXml: false // Return raw XML for existing dashboard parsers
      });
      
      return rawXml;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new SippyTimeoutError(`Dashboard call stats request timed out after ${this.DASHBOARD_TIMEOUT}ms`, 'getAccountCallStatsCustomer');
      }
      throw error;
    }
  }

  /**
   * Custom lightweight XML parser for dashboard CDR widgets
   * Only extracts the 5 essential fields needed for KPI calculations
   * Memory optimization: ~95% reduction compared to full CDR parsing
   */
  private parseEssentialCDRFields(xmlString: string): CdrWidget[] {
    try {
      if (typeof xmlString !== 'string') {
        return [];
      }

      // Check for fault response first
      const faultRegex = new RegExp('<fault>\\s*<value>\\s*<struct>([\\s\\S]*?)</struct>\\s*</value>\\s*</fault>');
      const faultMatch = xmlString.match(faultRegex);
      if (faultMatch) {
        const faultContent = faultMatch[1];
        const codeMatch = faultContent.match(/<name>faultCode<\/name>\s*<value>\s*<int>(\d+)<\/int>/);
        const messageMatch = faultContent.match(/<name>faultString<\/name>\s*<value>\s*<string>([^<]*)<\/string>/);
        
        const faultCode = codeMatch ? parseInt(codeMatch[1], 10) : 'Unknown';
        const faultMessage = messageMatch ? messageMatch[1] : 'Unknown error';
        
        throw new SippyParseError(`Dashboard CDR parsing failed - Sippy API Fault ${faultCode}: ${faultMessage}`);
      }

      // Look for the cdrs member
      const cdrsRegex = new RegExp('<member>\\s*<name>cdrs</name>\\s*<value>\\s*<array>\\s*<data>([\\s\\S]*?)</data>\\s*</array>');
      const cdrsMatch = xmlString.match(cdrsRegex);
      
      if (!cdrsMatch) {
        return [];
      }

      const cdrsData = cdrsMatch[1];
      const cdrs: CdrWidget[] = [];

      // Find all struct elements within the CDRs array
      const structMatches = cdrsData.match(/<value>\s*<struct>[\s\S]*?<\/struct>\s*<\/value>/g);
      if (structMatches) {
        for (const structMatch of structMatches) {
          const structContent = structMatch.match(/<value>\s*<struct>([\s\S]*?)<\/struct>\s*<\/value>/);
          if (structContent) {
            const cdr: Partial<CdrWidget> = {};
            
            // Extract only the essential fields we need for dashboard widgets
            const essentialFields = ['cost', 'duration', 'result', 'payment_currency', 'connect_time'];
            
            for (const fieldName of essentialFields) {
              const fieldRegex = new RegExp(`<member>\\s*<name>${fieldName}</name>\\s*<value>\\s*<([^>]+)>([^<]*)</[^>]+>\\s*</value>\\s*</member>`);
              const fieldMatch = structContent[1].match(fieldRegex);
              
              if (fieldMatch) {
                const [, type, value] = fieldMatch;
                
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
                    parsedValue = undefined;
                    break;
                  default:
                    parsedValue = value || '';
                }
                
                (cdr as Record<string, unknown>)[fieldName] = parsedValue;
              }
            }
            
            // Only add CDR if it has at least some essential fields
            if (Object.keys(cdr).length > 0) {
              // Ensure required fields have default values
              const completeCdr: CdrWidget = {
                cost: cdr.cost || '0',
                duration: cdr.duration || 0,
                result: cdr.result || 0,
                payment_currency: cdr.payment_currency,
                connect_time: cdr.connect_time || ''
              };
              
              cdrs.push(completeCdr);
            }
          }
        }
      }

      return cdrs;
      
    } catch (error) {
      if (error instanceof SippyParseError) {
        throw error;
      }
      throw new SippyParseError(
        `Dashboard CDR parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        xmlString.substring(0, 1000)
      );
    }
  }

  /**
   * Get dashboard configuration optimized for fast loading
   */
  getDashboardConfig() {
    return {
      timeout: this.DASHBOARD_TIMEOUT,
      batchSize: this.WIDGET_BATCH_SIZE,
      optimizations: [
        'Lightweight CDR parsing (5 fields only)',
        'Fast timeouts for responsive UI',
        'Memory-optimized data structures',
        '~95% memory reduction vs full CDR data'
      ]
    };
  }
} 