import { SippyBaseClient, XmlRpcResponse } from '../core/SippyBaseClient';
import { 
  PaymentInfo, 
  Payment, 
  PaymentsList, 
  BalanceOperation,
  BaseRequestOptions, 
  DateRangeOptions,
  SippyParseError,
  SippyTimeoutError
} from '../core/types';

export interface PaymentListOptions extends BaseRequestOptions, DateRangeOptions {
  i_customer?: number;
  type?: 'credit' | 'debit';
  [key: string]: unknown;
}

export interface PaymentInfoOptions {
  i_payment: number;
  i_account?: number;
  i_customer?: number;
  [key: string]: unknown;
}

export interface BalanceOperationOptions {
  i_account: number;
  amount: number;
  currency: string;
  payment_notes?: string;
  payment_time?: string; // '%H:%M:%S.000 GMT %a %b %d %Y' format
  [key: string]: unknown;
}

// Payment response interfaces
export interface PaymentXmlRpcResponse extends XmlRpcResponse {
  payments?: Partial<Payment>[];
  [key: string]: unknown;
}

export interface PartialPayment {
  i_payment?: number;
  payment_time?: string;
  amount?: number;
  currency?: string;
  tx_id?: string;
  tx_error?: string;
  tx_result?: number;
  i_account?: number;
  i_customer?: number;
  by_credit_debit_card?: boolean;
  by_voucher?: boolean;
  notes?: string;
  [key: string]: unknown;
}

/**
 * Specialized Sippy client for payment operations
 * Features:
 * - Intelligent payment method detection
 * - Enhanced payment data parsing
 * - Payment-specific error handling
 * - Support for all payment operations (credit, debit, info)
 */
export class SippyPaymentsClient extends SippyBaseClient {
  
  // Payment-specific configuration
  private readonly PAYMENT_TIMEOUT = 60000; // 60 seconds for payment operations
  
  /**
   * Get payment details for a specific payment
   * Returns parsed payment information with enhanced data
   */
  async getPaymentInfo(opts: PaymentInfoOptions): Promise<PaymentInfo> {
    try {
      console.log('💳 Payments: Fetching payment info with enhanced parsing');
      
      const result = await this.makeRequest<PaymentInfo>('getPaymentInfo', opts as unknown as Record<string, unknown>, {
        customTimeout: this.PAYMENT_TIMEOUT,
        parseXml: true // Use parsed data for enhanced payment information
      });
      
      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new SippyTimeoutError(`Payment info request timed out after ${this.PAYMENT_TIMEOUT}ms`, 'getPaymentInfo');
      }
      throw error;
    }
  }

  /**
   * Get list of payments with intelligent payment method detection
   * Returns parsed payment list with enhanced payment method information
   */
  async getPaymentsList(opts: PaymentListOptions): Promise<PaymentsList> {
    try {
      console.log('💰 Payments: Fetching payments list with intelligent method detection');
      
      const result = await this.makeRequest<PaymentsList>('getPaymentsList', opts, {
        customTimeout: this.PAYMENT_TIMEOUT,
        parseXml: true // Use parsed data for enhanced payment information
      });
      
      // Enhance payments with intelligent method detection
      if (result.payments) {
        result.payments = result.payments.map(payment => this.enhancePaymentMethod(payment));
      }
      
      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new SippyTimeoutError(`Payments list request timed out after ${this.PAYMENT_TIMEOUT}ms`, 'getPaymentsList');
      }
      throw error;
    }
  }

  /**
   * Add funds to an account (credit the balance)
   */
  async accountAddFunds(opts: BalanceOperationOptions): Promise<BalanceOperation> {
    try {
      console.log('💵 Payments: Adding funds to account');
      
      const result = await this.makeRequest<BalanceOperation>('accountAddFunds', opts as unknown as Record<string, unknown>, {
        customTimeout: this.PAYMENT_TIMEOUT,
        parseXml: true
      });
      
      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new SippyTimeoutError(`Add funds request timed out after ${this.PAYMENT_TIMEOUT}ms`, 'accountAddFunds');
      }
      throw error;
    }
  }

  /**
   * Credit an account's balance
   */
  async accountCredit(opts: BalanceOperationOptions): Promise<BalanceOperation> {
    try {
      console.log('💳 Payments: Crediting account balance');
      
      const result = await this.makeRequest<BalanceOperation>('accountCredit', opts as unknown as Record<string, unknown>, {
        customTimeout: this.PAYMENT_TIMEOUT,
        parseXml: true
      });
      
      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new SippyTimeoutError(`Account credit request timed out after ${this.PAYMENT_TIMEOUT}ms`, 'accountCredit');
      }
      throw error;
    }
  }

  /**
   * Debit an account's balance
   */
  async accountDebit(opts: BalanceOperationOptions): Promise<BalanceOperation> {
    try {
      console.log('💸 Payments: Debiting account balance');
      
      const result = await this.makeRequest<BalanceOperation>('accountDebit', opts as unknown as Record<string, unknown>, {
        customTimeout: this.PAYMENT_TIMEOUT,
        parseXml: true
      });
      
      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new SippyTimeoutError(`Account debit request timed out after ${this.PAYMENT_TIMEOUT}ms`, 'accountDebit');
      }
      throw error;
    }
  }

  /**
   * Enhanced XML-RPC parser specifically for payment data
   * Provides more sophisticated parsing than the base implementation
   */
  protected parseXmlRpcResponse(xmlString: string): PaymentXmlRpcResponse {
    try {
      // Remove XML declaration and whitespace
      const cleanXml = xmlString.replace(/<\?xml[^>]*\?>/, '').trim();
      
      // Check if it's a fault response
      if (cleanXml.includes('<fault>')) {
        const faultCodeMatch = cleanXml.match(/<name>faultCode<\/name>\s*<value><int>(\d+)<\/int><\/value>/);
        const faultStringMatch = cleanXml.match(/<name>faultString<\/name>\s*<value><string>([^<]*)<\/string><\/value>/);
        
        const faultCode = faultCodeMatch ? parseInt(faultCodeMatch[1]) : 0;
        const faultString = faultStringMatch ? faultStringMatch[1] : 'Unknown error';
        
        throw new SippyParseError(`Payment operation failed - Sippy API Fault ${faultCode}: ${faultString}`);
      }
      
      // Parse successful response
      const result: PaymentXmlRpcResponse = {};
      
      // Extract result field
      const resultMatch = cleanXml.match(/<name>result<\/name>\s*<value><string>([^<]*)<\/string><\/value>/);
      if (resultMatch) {
        result.result = resultMatch[1];
      }
      
      // Extract payments array if present
      if (cleanXml.includes('<name>payments</name>')) {
        result.payments = [];
        
        // Find the payments array content
        const paymentsMatch = cleanXml.match(/<name>payments<\/name>\s*<value><array><data>([\s\S]*?)<\/data><\/array><\/value>/);
        if (paymentsMatch) {
          const paymentsData = paymentsMatch[1];
          
          // Extract individual payment structs
                      const paymentStructs = paymentsData.match(/<value><struct>([\s\S]*?)<\/struct><\/value>/g);
          if (paymentStructs) {
            for (const paymentStruct of paymentStructs) {
              const payment: PartialPayment = {};
              
              // Extract payment fields
              const fieldMatches = paymentStruct.match(/<member>\s*<name>([^<]+)<\/name>\s*<value>(?:<(\w+)>)?([^<]*?)(?:<\/\2>)?<\/value>\s*<\/member>/g);
              if (fieldMatches) {
                for (const fieldMatch of fieldMatches) {
                  const fieldParts = fieldMatch.match(/<name>([^<]+)<\/name>\s*<value>(?:<(\w+)>)?([^<]*?)(?:<\/\2>)?<\/value>/);
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
      
      // Extract simple fields for single object responses
      const simpleFieldMatches = cleanXml.match(/<member>\s*<name>([^<]+)<\/name>\s*<value>(?:<(\w+)>)?([^<]*?)(?:<\/\2>)?<\/value>\s*<\/member>/g);
      if (simpleFieldMatches) {
        for (const fieldMatch of simpleFieldMatches) {
          const fieldParts = fieldMatch.match(/<name>([^<]+)<\/name>\s*<value>(?:<(\w+)>)?([^<]*?)(?:<\/\2>)?<\/value>/);
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
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Payments: Error parsing XML-RPC response:', error);
      if (error instanceof SippyParseError) {
        throw error;
      }
      throw new SippyParseError(
        `Payment XML parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        xmlString.substring(0, 1000)
      );
    }
  }

  /**
   * Enhance payment with intelligent method detection
   * Analyzes payment data to determine the actual payment method used
   */
  private enhancePaymentMethod(payment: Payment): Payment & { paymentMethodType?: string } {
    let paymentMethodType = 'Manual Topup'; // Default
    
    try {
      // Priority 1: Check transaction ID patterns
      if (payment.tx_id) {
        if (payment.tx_id.startsWith('pi_')) {
          paymentMethodType = 'Credit/Debit Card (Stripe)';
        } else if (payment.tx_id.includes('paypal') || payment.tx_id.includes('pp_')) {
          paymentMethodType = 'PayPal';
        }
      }
      
      // Priority 2: Check Sippy flags
      if (payment.by_credit_debit_card) {
        paymentMethodType = 'Credit/Debit Card';
      } else if (payment.by_voucher) {
        paymentMethodType = 'Voucher';
      }
      
      // Priority 3: Check payment notes for gateway information
      if (payment.notes) {
        const notes = payment.notes.toLowerCase();
        if (notes.includes('stripe')) {
          paymentMethodType = 'Credit/Debit Card (Stripe)';
        } else if (notes.includes('paypal')) {
          paymentMethodType = 'PayPal';
        } else if (notes.includes('manual')) {
          paymentMethodType = 'Manual Topup';
        }
      }
      
      console.log(`💳 Payments: Enhanced payment ${payment.i_payment} with method: ${paymentMethodType}`);
      
    } catch (error) {
      console.warn(`⚠️ Payments: Failed to enhance payment method for payment ${payment.i_payment}:`, error);
    }
    
    return {
      ...payment,
      paymentMethodType
    };
  }

  /**
   * Get payment configuration
   */
  getPaymentConfig() {
    return {
      timeout: this.PAYMENT_TIMEOUT,
      features: [
        'Intelligent payment method detection',
        'Enhanced payment data parsing',
        'Support for all payment operations',
        'Payment-specific error handling'
      ]
    };
  }
} 