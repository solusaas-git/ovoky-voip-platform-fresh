import { useState } from 'react';
import { toast } from 'sonner';

interface UseAccountManagementResult {
  isBlocking: boolean;
  isUnblocking: boolean;
  blockAccount: (accountId: number) => Promise<boolean>;
  unblockAccount: (accountId: number) => Promise<boolean>;
}

export function useAccountManagement(): UseAccountManagementResult {
  const [isBlocking, setIsBlocking] = useState(false);
  const [isUnblocking, setIsUnblocking] = useState(false);

  const blockAccount = async (accountId: number): Promise<boolean> => {
    setIsBlocking(true);
    try {
      const response = await fetch(`/api/sippy/account/${accountId}/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Account ${accountId} blocked successfully`);
        return true;
      } else {
        throw new Error(data.error || 'Failed to block account');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to block account';
      toast.error(`Failed to block account: ${errorMessage}`);
      return false;
    } finally {
      setIsBlocking(false);
    }
  };

  const unblockAccount = async (accountId: number): Promise<boolean> => {
    setIsUnblocking(true);
    try {
      const response = await fetch(`/api/sippy/account/${accountId}/unblock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Account ${accountId} unblocked successfully`);
        return true;
      } else {
        throw new Error(data.error || 'Failed to unblock account');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unblock account';
      toast.error(`Failed to unblock account: ${errorMessage}`);
      return false;
    } finally {
      setIsUnblocking(false);
    }
  };

  return {
    isBlocking,
    isUnblocking,
    blockAccount,
    unblockAccount,
  };
} 