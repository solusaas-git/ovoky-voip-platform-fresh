import useSWR from 'swr';
import { useAuth } from './AuthContext';

// Error handler for SWR
const handleFetchError = (error: Error) => {
  console.error('SWR fetch error:', error);
  throw error;
};

// Hook for fetching active calls
export function useActiveCalls(accountId?: number, refreshInterval = 5000) {
  const { sippyClient } = useAuth();
  
  return useSWR(
    sippyClient ? ['activeCalls', accountId] : null,
    async () => {
      if (!sippyClient) return [];
      return sippyClient.listActiveCalls(accountId ? { i_account: accountId } : {});
    },
    { 
      refreshInterval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      errorRetryCount: 3,
      onError: handleFetchError,
      // Next 15 specific: disable caching to ensure real-time data
      revalidateIfStale: true,
    }
  );
}

// Hook for fetching all calls
export function useAllCalls(accountId?: number) {
  const { sippyClient } = useAuth();
  
  return useSWR(
    sippyClient ? ['allCalls', accountId] : null,
    async () => {
      if (!sippyClient) return [];
      return sippyClient.listAllCalls(accountId ? { i_account: accountId } : {});
    },
    {
      revalidateOnFocus: true,
      errorRetryCount: 3,
      onError: handleFetchError,
    }
  );
}

// Hook for fetching account stats
export function useAccountStats(accountId?: number, refreshInterval = 10000) {
  const { sippyClient } = useAuth();
  
  return useSWR(
    sippyClient ? ['accountStats', accountId] : null,
    async () => {
      if (!sippyClient) return null;
      return sippyClient.getAccountCallStatsCustomer(accountId ? { i_account: accountId } : {});
    },
    {
      refreshInterval,
      revalidateOnFocus: true,
      errorRetryCount: 3,
      onError: handleFetchError,
    }
  );
}

// Hook for fetching CDRs
export function useCdrData(options: {
  accountId?: number;
  startDate?: string;
  endDate?: string;
  offset?: number;
  limit?: number;
}) {
  const { sippyClient } = useAuth();
  const { accountId, startDate, endDate, offset = 0, limit = 100 } = options;
  
  return useSWR(
    sippyClient ? ['cdrData', accountId, startDate, endDate, offset, limit] : null,
    async () => {
      if (!sippyClient) return [];
      const params: Record<string, unknown> = { offset, limit };
      
      if (accountId) params.i_account = accountId;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      
      return sippyClient.getAccountCDRs(params);
    },
    {
      revalidateOnFocus: false,
      errorRetryCount: 3,
      onError: handleFetchError,
    }
  );
}

// Hook for downloading CDRs as CSV
export function useCdrDownload() {
  const { sippyClient } = useAuth();
  
  const downloadCdrs = async (options: {
    accountId?: number;
    startDate?: string;
    endDate?: string;
    filename?: string;
  }) => {
    if (!sippyClient) throw new Error('Not authenticated');
    
    const { accountId, startDate, endDate } = options;
    const params: Record<string, unknown> = { limit: 1000 }; // Get more records for export
    
    if (accountId) params.i_account = accountId;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    try {
      const cdrs = await sippyClient.getAccountCDRs(params);
      return cdrs;
    } catch (error) {
      console.error('Error downloading CDRs:', error);
      throw error;
    }
  };
  
  return { downloadCdrs };
} 