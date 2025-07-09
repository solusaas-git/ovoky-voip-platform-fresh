'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  ShieldX, 
  RefreshCw, 
  Loader2,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAccountManagement } from '@/hooks/useAccountManagement';
import { AccountInfo } from '@/lib/sippyClient';

interface StatusWithAccountManagementProps {
  accountId?: number;
  onRefresh?: () => void;
  className?: string;
}

export function StatusWithAccountManagement({ 
  accountId,
  onRefresh,
  className = ''
}: StatusWithAccountManagementProps) {
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { isBlocking, isUnblocking, blockAccount, unblockAccount } = useAccountManagement();

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
      setAccountInfo(data.accountInfo);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountInfo();
  }, [accountId]);

  const handleBlockAccount = async () => {
    if (!accountId) return;
    
    const success = await blockAccount(accountId);
    if (success) {
      await fetchAccountInfo();
      onRefresh?.();
    }
  };

  const handleUnblockAccount = async () => {
    if (!accountId) return;
    
    const success = await unblockAccount(accountId);
    if (success) {
      await fetchAccountInfo();
      onRefresh?.();
    }
  };



  const getAccountStatusBadge = () => {
    if (!accountId) return null;
    
    if (isLoading && !accountInfo) {
      return (
        <Badge variant="outline" className="text-xs ml-2">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Loading...
        </Badge>
      );
    }

    if (error) {
      return (
        <Badge variant="outline" className="text-xs ml-2 text-red-600">
          Account Error
        </Badge>
      );
    }

    if (accountInfo) {
      const isBlocked = accountInfo.blocked === 1;
      
      if (isBlocked) {
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-800 text-xs ml-2">
            <ShieldX className="w-3 h-3 mr-1" />
            Account Blocked
          </Badge>
        );
      } else {
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-800 text-xs ml-2">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Account Active
          </Badge>
        );
      }
    }

    return null;
  };

  const isActionDisabled = isLoading || isBlocking || isUnblocking;
  const isBlocked = accountInfo?.blocked === 1;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {getAccountStatusBadge()}
      
      {accountId && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isActionDisabled}
              className="h-8 w-8 p-0"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={fetchAccountInfo} disabled={isActionDisabled}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Status
            </DropdownMenuItem>
            
            {accountInfo && (
              <>
                <DropdownMenuSeparator />
                {isBlocked ? (
                  <DropdownMenuItem 
                    onClick={handleUnblockAccount} 
                    disabled={isActionDisabled}
                    className="text-green-600"
                  >
                    {isUnblocking ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 mr-2" />
                    )}
                    Unblock Account
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem 
                    onClick={handleBlockAccount} 
                    disabled={isActionDisabled}
                    className="text-red-600"
                  >
                    {isBlocking ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ShieldX className="h-4 w-4 mr-2" />
                    )}
                    Block Account
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
} 