import { useState, useCallback } from 'react';

interface UpdateAccountParams {
  max_sessions?: number | string;
  max_calls_per_second?: number | string;
}

interface UpdateAccountResponse {
  success: boolean;
  accountId: number;
  result: string;
  updatedParameters: UpdateAccountParams;
  timestamp: string;
}

interface UseAccountParametersResult {
  updateParameters: (accountId: number, params: UpdateAccountParams) => Promise<void>;
  fetchParameters: (accountId: number) => Promise<{ max_sessions?: number | string; max_calls_per_second?: number | string }>;
  isLoading: boolean;
  error: string | null;
  lastUpdate: UpdateAccountResponse | null;
}

/**
 * Hook to update Sippy account parameters (max sessions and CPS)
 */
export function useAccountParameters(): UseAccountParametersResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<UpdateAccountResponse | null>(null);

  const updateParameters = async (accountId: number, params: UpdateAccountParams) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/sippy/account/${accountId}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update account parameters');
      }

      const data = await response.json();
      setLastUpdate(data);

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Failed to update account parameters');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchParameters = useCallback(async (accountId: number): Promise<{ max_sessions?: number | string; max_calls_per_second?: number | string }> => {
    try {
      const response = await fetch(`/api/sippy/account/${accountId}/info`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch account parameters: ${response.status}`);
      }

      const data = await response.json();
      return {
        max_sessions: data.accountInfo?.max_sessions,
        max_calls_per_second: data.accountInfo?.max_calls_per_second
      };
    } catch (error) {
      throw error;
    }
  }, []);

  return {
    updateParameters,
    fetchParameters,
    isLoading,
    error,
    lastUpdate
  };
} 