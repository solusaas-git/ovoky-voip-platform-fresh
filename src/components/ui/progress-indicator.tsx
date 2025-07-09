'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Database, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  isLoading: boolean;
  currentRecords: number;
  targetRecords?: number;
  phase?: 'initial' | 'background' | 'complete';
  className?: string;
  accountId?: string;
}

// Account performance information based on test results
const ACCOUNT_PERFORMANCE = {
  '3': {
    name: 'Account 3',
    performance: 'slow',
    expectedTime: '20-30 seconds per batch',
    warning: 'This account has slower performance due to data indexing issues',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  '27': {
    name: 'Account 27', 
    performance: 'fast',
    expectedTime: '1-2 seconds per batch',
    warning: null,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  }
} as const;

export function ProgressIndicator({ 
  isLoading, 
  currentRecords, 
  targetRecords = 100000,
  phase = 'initial',
  className,
  accountId
}: ProgressIndicatorProps) {
  if (!isLoading && currentRecords === 0) {
    return null;
  }

  const progress = Math.min((currentRecords / targetRecords) * 100, 100);
  const isComplete = !isLoading && currentRecords > 0;
  const accountInfo = accountId ? ACCOUNT_PERFORMANCE[accountId as keyof typeof ACCOUNT_PERFORMANCE] : null;
  
  const getPhaseInfo = () => {
    // Use account-specific colors if available
    if (accountInfo) {
      const baseInfo = {
        color: accountInfo.color,
        bgColor: accountInfo.bgColor,
        borderColor: accountInfo.borderColor
      };

      switch (phase) {
        case 'initial':
          return { ...baseInfo, label: 'Loading initial data...' };
        case 'background':
          return { ...baseInfo, label: 'Loading additional data...' };
        case 'complete':
          return { ...baseInfo, label: 'Loading complete' };
        default:
          return { ...baseInfo, label: 'Loading...' };
      }
    }

    // Default colors for unknown accounts
    switch (phase) {
      case 'initial':
        return {
          label: 'Loading initial data...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'background':
        return {
          label: 'Loading additional data...',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200'
        };
      case 'complete':
        return {
          label: 'Loading complete',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      default:
        return {
          label: 'Loading...',
          color: 'text-slate-600',
          bgColor: 'bg-slate-50',
          borderColor: 'border-slate-200'
        };
    }
  };

  const phaseInfo = getPhaseInfo();

  return (
    <Card className={cn(
      "transition-all duration-300",
      phaseInfo.bgColor,
      phaseInfo.borderColor,
      className
    )}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className={cn("h-4 w-4 animate-spin", phaseInfo.color)} />
              ) : (
                <CheckCircle className={cn("h-4 w-4", phaseInfo.color)} />
              )}
              <span className={cn("text-sm font-medium", phaseInfo.color)}>
                {phaseInfo.label}
              </span>
              {accountInfo && (
                <Badge variant={accountInfo.performance === 'slow' ? 'destructive' : 'default'} className="text-xs">
                  {accountInfo.name} - {accountInfo.performance}
                </Badge>
              )}
            </div>
            <Badge variant="outline" className={cn("text-xs", phaseInfo.color)}>
              <Database className="h-3 w-3 mr-1" />
              {currentRecords.toLocaleString()} records
            </Badge>
          </div>

          {/* Account-specific warning */}
          {accountInfo?.warning && isLoading && (
            <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-3 w-3 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-yellow-800">
                <strong>Performance Notice:</strong> {accountInfo.warning}
                {accountInfo.expectedTime && (
                  <div className="mt-1">Expected: {accountInfo.expectedTime}</div>
                )}
              </div>
            </div>
          )}

          {/* Performance optimization notice for slow accounts */}
          {accountInfo?.performance === 'slow' && isLoading && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-xs text-blue-800">
                <div className="font-medium mb-1">Performance Optimization Active</div>
                <ul className="text-xs space-y-0.5">
                  <li>• Smaller batch sizes (100 vs 500 records)</li>
                  <li>• Extended timeouts (30-45s vs 15-30s)</li>
                  <li>• Longer delays between requests</li>
                </ul>
              </div>
            </div>
          )}

          {/* High performance notice for fast accounts */}
          {accountInfo?.performance === 'fast' && isLoading && (
            <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-xs text-green-800">
                <div className="font-medium mb-1 flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  High Performance Account
                </div>
                <div className="text-xs">
                  Optimized data indexing for fast CDR retrieval.
                </div>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress 
              value={progress} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-slate-600">
              <span>{currentRecords.toLocaleString()} loaded</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
          </div>

          {/* Phase-specific info */}
          {phase === 'initial' && isLoading && (
            <div className="text-xs text-slate-600">
              Loading first {accountInfo?.performance === 'slow' ? '1,000' : '5,000'} records for quick display...
            </div>
          )}
          
          {phase === 'background' && (
            <div className="text-xs text-slate-600">
              Continuing to load up to {targetRecords.toLocaleString()} records in background...
              {accountInfo?.performance === 'slow' && (
                <div className="mt-1 text-orange-600">
                  Note: Background loading may take longer for this account.
                </div>
              )}
            </div>
          )}
          
          {isComplete && (
            <div className="text-xs text-slate-600">
              {currentRecords >= targetRecords 
                ? `Loaded maximum of ${targetRecords.toLocaleString()} records`
                : `All ${currentRecords.toLocaleString()} records loaded`
              }
              {accountInfo?.performance === 'slow' && currentRecords < targetRecords && (
                <div className="mt-1 text-orange-600">
                  Limited batch count due to account performance constraints.
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 