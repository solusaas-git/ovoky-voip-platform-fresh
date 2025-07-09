'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Settings, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAccountParameters } from '@/hooks/useAccountParameters';


interface AccountParametersManagerProps {
  accountId: number;
  className?: string;
  onUpdate?: () => void;
}

export function AccountParametersManager({
  accountId,
  className = '',
  onUpdate
}: AccountParametersManagerProps) {
  const [maxSessions, setMaxSessions] = useState<string>('');
  const [maxCps, setMaxCps] = useState<string>('');
  const [currentValues, setCurrentValues] = useState<{ max_sessions?: number | string; max_calls_per_second?: number | string } | null>(null);
  const [isLoadingCurrent, setIsLoadingCurrent] = useState(true);
  const { updateParameters, fetchParameters, isLoading, error, lastUpdate } = useAccountParameters();

  // Fetch current values from Sippy
  useEffect(() => {
    const loadCurrentValues = async () => {
      try {
        setIsLoadingCurrent(true);
        const current = await fetchParameters(accountId);
        setCurrentValues(current);
        
        // Initialize form fields with current values
        const formatValue = (value?: number | string, field?: 'max_sessions' | 'max_calls_per_second') => {
          // For max_calls_per_second, undefined means unlimited (not sent by Sippy)
          if (field === 'max_calls_per_second' && value === undefined) return 'unlimited';
          
          if (value === 'unlimited' || value === 0) return 'unlimited';
          return value?.toString() || '';
        };
        
        setMaxSessions(formatValue(current.max_sessions, 'max_sessions'));
        setMaxCps(formatValue(current.max_calls_per_second, 'max_calls_per_second'));
      } catch (err) {

      } finally {
        setIsLoadingCurrent(false);
      }
    };

    loadCurrentValues();
  }, [accountId, fetchParameters]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const params: { max_sessions?: number | string; max_calls_per_second?: number | string } = {};
    
    const getCurrentValue = (field: 'max_sessions' | 'max_calls_per_second') => {
      const value = currentValues?.[field];
      if (value === 'Unlimited' || value === 'unlimited' || value === 0) return 'Unlimited';
      return value?.toString() || '';
    };
    
    if (maxSessions && maxSessions !== getCurrentValue('max_sessions')) {
      if (maxSessions.toLowerCase() === 'unlimited') {
        params.max_sessions = -1; // Sippy API expects -1 for unlimited
      } else {
        const numValue = parseInt(maxSessions);
        if (!isNaN(numValue)) {
          params.max_sessions = numValue;
        }
      }
    }
    
    if (maxCps && maxCps !== getCurrentValue('max_calls_per_second')) {
      if (maxCps.toLowerCase() === 'unlimited') {
        params.max_calls_per_second = 'unlimited'; // Sippy API expects "Unlimited" string for CPS
      } else {
        const numValue = parseFloat(maxCps);
        if (!isNaN(numValue)) {
          params.max_calls_per_second = numValue;
        }
      }
    }

    if (Object.keys(params).length === 0) {
      return;
    }

    try {
      await updateParameters(accountId, params);

      if (onUpdate) {
        onUpdate();
      }
    } catch {
      // Error is handled by the hook and displayed in the UI
    }
  };

  const handleReset = () => {
            const formatValue = (value?: number | string, field?: 'max_sessions' | 'max_calls_per_second') => {
          // For max_calls_per_second, undefined means unlimited (not sent by Sippy)
          if (field === 'max_calls_per_second' && value === undefined) return 'Unlimited';
          
          if (value === 'Unlimited' || value === 'unlimited' || value === 0) return 'Unlimited';
          return value?.toString() || '';
        };
    
    setMaxSessions(formatValue(currentValues?.max_sessions, 'max_sessions'));
    setMaxCps(formatValue(currentValues?.max_calls_per_second, 'max_calls_per_second'));
  };

  const getCurrentValue = (field: 'max_sessions' | 'max_calls_per_second') => {
    const value = currentValues?.[field];
    
    // For max_calls_per_second, undefined means unlimited (not sent by Sippy)
    if (field === 'max_calls_per_second' && value === undefined) return 'Unlimited';
    
    // For both fields, check for explicit unlimited values
    if (value === 'Unlimited' || value === 'unlimited' || value === 0) return 'Unlimited';
    return value?.toString() || '';
  };

  const validateInput = (value: string, type: 'sessions' | 'cps') => {
    if (!value.trim()) return true; // Empty is valid
    if (value.toLowerCase() === 'unlimited') return true;
    
    const num = type === 'sessions' ? parseInt(value) : parseFloat(value);
    if (isNaN(num)) return false;
    
    if (type === 'sessions') {
      return num >= 1 && num <= 1000;
    } else {
      return num >= 0.1 && num <= 100;
    }
  };

  const isValidMaxSessions = validateInput(maxSessions, 'sessions');
  const isValidMaxCps = validateInput(maxCps, 'cps');

  const hasChanges = 
    (maxSessions !== getCurrentValue('max_sessions')) ||
    (maxCps !== getCurrentValue('max_calls_per_second'));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Account Limits</span>
          <Badge variant="outline">Account #{accountId}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {lastUpdate && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Parameters updated successfully at {new Date(lastUpdate.timestamp).toLocaleString()}
            </AlertDescription>
          </Alert>
        )}

        {isLoadingCurrent ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading current values...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxSessions">
                  Max Sessions
                  <span className="text-sm text-muted-foreground ml-1">(number or &quot;Unlimited&quot;)</span>
                </Label>
              <Input
                id="maxSessions"
                type="text"
                value={maxSessions}
                onChange={(e) => setMaxSessions(e.target.value)}
                placeholder="e.g. 100 or Unlimited"
                disabled={isLoadingCurrent}
                className={!isValidMaxSessions ? 'border-red-500' : ''}
              />
              {!isValidMaxSessions && maxSessions.trim() && (
                <p className="text-xs text-red-600">
                                      Please enter a number between 1-1000 or &quot;Unlimited&quot;
                </p>
              )}
              {currentValues?.max_sessions !== undefined && (
                <p className="text-xs text-muted-foreground">
                  Current: {getCurrentValue('max_sessions')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxCps">
                Max CPS (Calls Per Second)
                                  <span className="text-sm text-muted-foreground ml-1">(number or &quot;Unlimited&quot;)</span>
              </Label>
              <Input
                id="maxCps"
                type="text"
                value={maxCps}
                onChange={(e) => setMaxCps(e.target.value)}
                placeholder="e.g. 10.0 or Unlimited"
                disabled={isLoadingCurrent}
                className={!isValidMaxCps ? 'border-red-500' : ''}
              />
              {!isValidMaxCps && maxCps.trim() && (
                <p className="text-xs text-red-600">
                                      Please enter a number between 0.1-100 or &quot;Unlimited&quot;
                </p>
              )}
              {/* Always show current CPS value since undefined means unlimited */}
              <p className="text-xs text-muted-foreground">
                Current: {getCurrentValue('max_calls_per_second')}
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isLoading || !hasChanges}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !hasChanges || !isValidMaxSessions || !isValidMaxCps}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Parameters'
              )}
            </Button>
          </div>

          </form>
        )}
      </CardContent>
    </Card>
  );
} 