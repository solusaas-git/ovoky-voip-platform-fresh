import { useState, useEffect } from 'react';
import { AccountInfo } from '@/lib/sippyClient';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

interface UseSippyAccountResult {
  accountInfo: AccountInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Parse XML string into a JavaScript object
 */
function parseXmlResponse(xmlString: string): AccountInfo | null {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  
  // Get the struct element which contains all the account data
  const struct = xmlDoc.getElementsByTagName('struct')[0];
  if (!struct) return null;

  const result: Partial<AccountInfo> = {};
  
  // Iterate through all member elements
  const members = struct.getElementsByTagName('member');
  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    const name = member.getElementsByTagName('name')[0]?.textContent;
    const value = member.getElementsByTagName('value')[0];
    
    if (!name || !value) continue;

    // Get the first child element of value to determine the type
    const valueType = value.firstElementChild?.tagName;
    let parsedValue: any;

    switch (valueType) {
      case 'int':
        parsedValue = parseInt(value.textContent || '0', 10);
        break;
      case 'double':
        parsedValue = parseFloat(value.textContent || '0');
        break;
      case 'boolean':
        parsedValue = value.textContent === '1';
        break;
      case 'string':
        parsedValue = value.textContent || '';
        break;
      case 'array':
        const data = value.getElementsByTagName('data')[0];
        parsedValue = Array.from(data.getElementsByTagName('value')).map(v => v.textContent);
        break;
      case 'nil':
        parsedValue = null;
        break;
      default:
        parsedValue = value.textContent;
    }

    // Convert field names to match the AccountInfo interface
    const fieldName = name as keyof AccountInfo;
    result[fieldName] = parsedValue;
  }

  return result as AccountInfo;
}

/**
 * Hook to fetch Sippy account data for a specific account ID
 * @param accountId The Sippy account ID to fetch data for
 */
export function useSippyAccount(accountId?: number): UseSippyAccountResult {
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Use the current user's Sippy account ID if none is provided
  const targetAccountId = accountId ?? user?.sippyAccountId;

  const fetchAccountInfo = async () => {
    // If no account ID is available, return early
    if (!targetAccountId) {
      setError('No account ID available');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/sippy/account/${targetAccountId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch account data');
      }
      
      const data = await response.json();
      
      // Parse the XML response
      const parsedAccountInfo = parseXmlResponse(data.accountInfo);
      
      if (!parsedAccountInfo) {
        throw new Error('Failed to parse account information');
      }
      
      setAccountInfo(parsedAccountInfo);
    } catch (err) {
      console.error('Error fetching Sippy account data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch account data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch account info on component mount and when targetAccountId changes
  useEffect(() => {
    fetchAccountInfo();
  }, [targetAccountId]);

  return {
    accountInfo,
    isLoading,
    error,
    refetch: fetchAccountInfo
  };
} 