'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldX, Loader2, AlertCircle } from 'lucide-react';

interface AccountStatusBadgeProps {
  accountId?: number;
  refreshInterval?: number; // Auto-refresh interval in seconds
}

export function AccountStatusBadge({ 
  accountId, 
  refreshInterval = 60 
}: AccountStatusBadgeProps) {
  const [isBlocked, setIsBlocked] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccountInfo = async () => {
    if (!accountId) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/sippy/account/${accountId}/info`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch account info');
      }

      const data = await response.json();
      setIsBlocked(data.accountInfo?.blocked === 1);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setIsBlocked(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountInfo();
    
    // Set up auto-refresh if interval is specified
    if (refreshInterval > 0) {
      const interval = setInterval(fetchAccountInfo, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [accountId, refreshInterval]);

  if (!accountId) {
    return (
      <Badge variant="outline" className="text-xs">
        <AlertCircle className="w-3 h-3 mr-1" />
        No Account
      </Badge>
    );
  }

  if (isLoading && isBlocked === null) {
    return (
      <Badge variant="outline" className="text-xs">
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        Loading...
      </Badge>
    );
  }

  if (error) {
    return (
      <Badge variant="outline" className="text-xs text-red-600">
        <AlertCircle className="w-3 h-3 mr-1" />
        Error
      </Badge>
    );
  }

  if (isBlocked === true) {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-800 text-xs">
        <ShieldX className="w-3 h-3 mr-1" />
        Blocked
      </Badge>
    );
  } else if (isBlocked === false) {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-100 dark:border-green-800 text-xs">
        <ShieldCheck className="w-3 h-3 mr-1" />
        Active
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-xs">
      <AlertCircle className="w-3 h-3 mr-1" />
      Unknown
    </Badge>
  );
} 