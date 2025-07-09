'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  ShieldCheck, 
  ShieldX, 
  RefreshCw, 
  AlertCircle,
  Loader2,
  User
} from 'lucide-react';
import { useAccountManagement } from '@/hooks/useAccountManagement';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClient, AccountInfo } from '@/lib/sippyClient';

interface AccountStatusManagerProps {
  accountId?: number;
  showCard?: boolean;
  className?: string;
  onStatusChange?: () => void; // Callback for when status changes
  readonly?: boolean; // Hide action buttons for non-admin users
}

export function AccountStatusManager({ 
  accountId, 
  showCard = true,
  className = '',
  onStatusChange,
  readonly = false
}: AccountStatusManagerProps) {
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
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setAccountInfo(data.accountInfo);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch account info';
      setError(errorMessage);
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
      await fetchAccountInfo(); // Refresh account info
      onStatusChange?.(); // Notify parent component
    }
  };

  const handleUnblockAccount = async () => {
    if (!accountId) return;
    
    const success = await unblockAccount(accountId);
    if (success) {
      await fetchAccountInfo(); // Refresh account info
      onStatusChange?.(); // Notify parent component
    }
  };

  const getStatusBadge = () => {
    if (!accountInfo) return null;

    const isBlocked = accountInfo.blocked === 1;
    
    if (isBlocked) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-800">
          <ShieldX className="w-3 h-3 mr-1" />
          Blocked
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-100 dark:border-green-800">
          <ShieldCheck className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
    }
  };

  const isActionDisabled = isLoading || isBlocking || isUnblocking;
  const isBlocked = accountInfo?.blocked === 1;

  const content = (
    <div className={`space-y-4 ${className}`}>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span className="font-medium">Account Status</span>
          {getStatusBadge()}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAccountInfo}
          disabled={isActionDisabled}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {accountInfo && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Account ID:</span>
              <span className="ml-2">{accountInfo.i_account}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Username:</span>
              <span className="ml-2 font-mono">{accountInfo.username}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Balance:</span>
              <span className="ml-2">{accountInfo.balance} {accountInfo.payment_currency}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Credit Limit:</span>
              <span className="ml-2">{accountInfo.credit_limit} {accountInfo.payment_currency}</span>
            </div>
          </div>

          {!readonly && (
            <div className="flex space-x-2 pt-2">
              {isBlocked ? (
                <Button
                  onClick={handleUnblockAccount}
                  disabled={isActionDisabled}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isUnblocking ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 mr-2" />
                  )}
                  Unblock Account
                </Button>
              ) : (
                <Button
                  onClick={handleBlockAccount}
                  disabled={isActionDisabled}
                  variant="destructive"
                >
                  {isBlocking ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ShieldX className="h-4 w-4 mr-2" />
                  )}
                  Block Account
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {!accountInfo && !error && !isLoading && accountId && (
        <div className="text-center py-4 text-muted-foreground">
          No account information available
        </div>
      )}

      {!accountId && (
        <div className="text-center py-4 text-muted-foreground">
          No Sippy account ID available
        </div>
      )}
    </div>
  );

  if (showCard) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Account Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
} 