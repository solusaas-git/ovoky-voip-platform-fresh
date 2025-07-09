import { useState, useEffect } from 'react';
import { RegistrationStatus } from '@/lib/sippyClient';

interface RegistrationStatusResponse {
  accountId: number;
  registrationStatus: RegistrationStatus & { error?: string };
  timestamp: string;
}

interface UseRegistrationStatusResult {
  registrationStatus: RegistrationStatusResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch SIP registration status for a Sippy account
 * @param accountId The Sippy account ID to check registration status for
 * @param autoRefresh Whether to automatically refresh the status (default: false)
 * @param refreshInterval Refresh interval in milliseconds (default: 30000 = 30 seconds)
 */
export function useRegistrationStatus(
  accountId?: number,
  autoRefresh: boolean = false,
  refreshInterval: number = 30000
): UseRegistrationStatusResult {
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRegistrationStatus = async () => {
    if (!accountId) {
      setError('No account ID provided');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/sippy/account/${accountId}/registration-status`);
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied to this account');
        } else if (response.status === 404) {
          throw new Error('Account not found');
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch registration status');
        }
      }

      const data = await response.json();
      
      // Check if the response contains an error field at the top level (API errors)
      if (data.error) {
        throw new Error(data.error);
      }
      
      setRegistrationStatus(data);

    } catch (err) {
      console.error('Error fetching registration status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch registration status');
      setRegistrationStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (accountId) {
      fetchRegistrationStatus();
    }
  }, [accountId]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !accountId) return;

    const interval = setInterval(() => {
      fetchRegistrationStatus();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [accountId, autoRefresh, refreshInterval]);

  return {
    registrationStatus,
    isLoading,
    error,
    refetch: fetchRegistrationStatus
  };
} 