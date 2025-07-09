// Barrel exports for the modular Sippy client architecture

// Core exports
export { SippyBaseClient } from './core/SippyBaseClient';
export type { SippyCredentials, RequestOptions } from './core/SippyBaseClient';
export * from './core/types';

// Module exports
export { SippyDashboardClient } from './modules/SippyDashboardClient';
export type { DashboardCDROptions, DashboardAccountOptions } from './modules/SippyDashboardClient';

export { SippyPaymentsClient } from './modules/SippyPaymentsClient';
export type { 
  PaymentListOptions, 
  PaymentInfoOptions, 
  BalanceOperationOptions 
} from './modules/SippyPaymentsClient';

export { SippyCallsClient } from './modules/SippyCallsClient';
export type { 
  ActiveCallsOptions, 
  DisconnectCallOptions,
  ActiveCall
} from './modules/SippyCallsClient';

// Import classes for factory use
import { SippyCredentials } from './core/SippyBaseClient';
import { SippyDashboardClient } from './modules/SippyDashboardClient';
import { SippyPaymentsClient } from './modules/SippyPaymentsClient';
import { SippyCallsClient } from './modules/SippyCallsClient';

// Factory function for creating specialized clients
export class SippyClientFactory {
  /**
   * Create a dashboard client optimized for widget performance
   */
  static createDashboardClient(credentials: SippyCredentials): SippyDashboardClient {
    return new SippyDashboardClient(credentials);
  }

  /**
   * Create a payments client with intelligent method detection
   */
  static createPaymentsClient(credentials: SippyCredentials): SippyPaymentsClient {
    return new SippyPaymentsClient(credentials);
  }

  /**
   * Create a calls client for real-time call management
   */
  static createCallsClient(credentials: SippyCredentials): SippyCallsClient {
    return new SippyCallsClient(credentials);
  }

  /**
   * Get information about available client modules
   */
  static getAvailableModules() {
    return {
      dashboard: {
        name: 'SippyDashboardClient',
        description: 'Optimized for dashboard widgets with lightweight parsing',
        features: [
          'Fast timeouts (45s)',
          'Memory-optimized CDR parsing (~95% reduction)',
          'Essential fields only',
          'Dashboard-specific error handling'
        ]
      },
      payments: {
        name: 'SippyPaymentsClient',
        description: 'Enhanced payment operations with intelligent method detection',
        features: [
          'Intelligent payment method detection',
          'Enhanced payment data parsing',
          'Support for all payment operations',
          'Payment-specific error handling'
        ]
      },
      calls: {
        name: 'SippyCallsClient',
        description: 'Real-time call management with robust XML parsing',
        features: [
          'Real-time active calls monitoring',
          'Call disconnection capabilities',
          'Robust XML parsing for call data',
          'Call-specific error handling'
        ]
      },
      // Future modules
      cdrs: {
        name: 'SippyCdrClient',
        description: 'Full CDR parsing for detailed reports (coming soon)',
        status: 'planned'
      },
      rates: {
        name: 'SippyRatesClient',
        description: 'Rate management and pricing (coming soon)',
        status: 'planned'
      }
    };
  }
}

// Convenience exports for backward compatibility
export { SippyClientFactory as SippyClient };

// Type for any sippy client
type AnySippyClient = SippyDashboardClient | SippyPaymentsClient | SippyCallsClient | unknown;

// Type guards for client identification
export function isDashboardClient(client: AnySippyClient): client is SippyDashboardClient {
  return client instanceof SippyDashboardClient;
}

export function isPaymentsClient(client: AnySippyClient): client is SippyPaymentsClient {
  return client instanceof SippyPaymentsClient;
}

export function isCallsClient(client: AnySippyClient): client is SippyCallsClient {
  return client instanceof SippyCallsClient;
} 