'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Settings, Loader2, AlertCircle } from 'lucide-react';
import { useAccountParameters } from '@/hooks/useAccountParameters';

interface AccountCapacityDisplayProps {
  accountId: number;
  className?: string;
}

export function AccountCapacityDisplay({
  accountId,
  className = ''
}: AccountCapacityDisplayProps) {
  const [accountParams, setAccountParams] = useState<{ max_sessions?: number | string; max_calls_per_second?: number | string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { fetchParameters } = useAccountParameters();

  useEffect(() => {
    const loadParameters = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const params = await fetchParameters(accountId);
        setAccountParams(params);
      } catch (err) {

        setError(err instanceof Error ? err.message : 'Failed to load capacity information');
      } finally {
        setIsLoading(false);
      }
    };

    if (accountId) {
      loadParameters();
    }
  }, [accountId, fetchParameters]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Account Capacity</span>
            <Badge variant="outline">Account #{accountId}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Account Capacity</span>
            <Badge variant="outline">Account #{accountId}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!accountParams) {
    return null;
  }

  // Show the component if we have any capacity information
  // Note: max_calls_per_second might be undefined when it's unlimited (not sent by Sippy)
  const hasCapacityInfo = accountParams.max_sessions !== undefined || accountParams.max_calls_per_second !== undefined;
  
  if (!hasCapacityInfo) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Account Capacity</span>
          <Badge variant="outline">Account #{accountId}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accountParams.max_sessions !== undefined && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Max Sessions</h3>
              <div className="text-2xl font-bold">
                {accountParams.max_sessions === 'Unlimited' || accountParams.max_sessions === 'unlimited' || accountParams.max_sessions === 0 
                  ? 'Unlimited' 
                  : accountParams.max_sessions}
              </div>

            </div>
          )}

          {/* Always show CPS since undefined means unlimited */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Max CPS</h3>
            <div className="text-2xl font-bold">
              {accountParams.max_calls_per_second === 'Unlimited' || 
               accountParams.max_calls_per_second === 'unlimited' || 
               accountParams.max_calls_per_second === 0 ||
               accountParams.max_calls_per_second === undefined
                ? 'Unlimited' 
                : accountParams.max_calls_per_second}
            </div>

          </div>
        </div>


      </CardContent>
    </Card>
  );
} 