'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useRegistrationStatus } from '@/hooks/useRegistrationStatus';

interface RegistrationStatusBadgeProps {
  accountId?: number;
  size?: 'sm' | 'md';
  showRefresh?: boolean;
  className?: string;
}

export function RegistrationStatusBadge({ 
  accountId, 
  size = 'sm',
  showRefresh = false,
  className = '' 
}: RegistrationStatusBadgeProps) {
  const { registrationStatus, isLoading, error, refetch } = useRegistrationStatus(
    accountId, 
    true, // auto-refresh enabled
    60000 // 1 minute refresh for tables
  );

  if (!accountId) {
    return (
      <Badge variant="secondary" className={`${size === 'sm' ? 'text-xs' : 'text-sm'} ${className}`}>
        <AlertCircle className="w-3 h-3 mr-1" />
        No Account
      </Badge>
    );
  }

  if (isLoading && !registrationStatus) {
    return (
      <Badge variant="secondary" className={`${size === 'sm' ? 'text-xs' : 'text-sm'} ${className}`}>
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        Checking...
      </Badge>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <Badge 
          variant="destructive" 
          className={`${size === 'sm' ? 'text-xs' : 'text-sm'}`}
          title={error}
        >
          <AlertCircle className="w-3 h-3 mr-1" />
          Error
        </Badge>
        {showRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={refetch}
            className="h-6 w-6 p-0"
            title="Retry"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  if (!registrationStatus) {
    return (
      <Badge variant="secondary" className={`${size === 'sm' ? 'text-xs' : 'text-sm'} ${className}`}>
        <AlertCircle className="w-3 h-3 mr-1" />
        Unknown
      </Badge>
    );
  }

  const { registrationStatus: status } = registrationStatus;
  
  if (status.result === 'OK') {
    // Parse Sippy date format: "20:55:19.000 GMT Tue Jun 10 2025"
    // Convert to JavaScript-compatible format: "Tue Jun 10 2025 20:55:19 GMT"
    let expireTime: Date | null = null;
    if (status.expires) {
      try {
        // Extract components from Sippy format: "HH:MM:SS.000 GMT Day Mon DD YYYY"
        const match = status.expires.match(/^(\d{2}:\d{2}:\d{2})\.000 GMT (\w{3} \w{3} \d{1,2} \d{4})$/);
        if (match) {
          const timeStr = match[1]; // "20:55:19"
          const dateStr = match[2]; // "Tue Jun 10 2025"
          // Reformat to "Tue Jun 10 2025 20:55:19 GMT"
          const reformattedDate = `${dateStr} ${timeStr} GMT`;
          expireTime = new Date(reformattedDate);
        } else {
          // Fallback: try parsing as-is
          expireTime = new Date(status.expires);
        }
        
        // Validate the date
        if (expireTime && isNaN(expireTime.getTime())) {
          console.warn('Invalid expiration date from Sippy:', status.expires);
          expireTime = null;
        }
      } catch (error) {
        console.warn('Error parsing expiration date:', status.expires, error);
        expireTime = null;
      }
    }
    const isExpiringSoon = expireTime && (expireTime.getTime() - Date.now()) < 300000; // 5 minutes
    
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <Badge 
          className={`${size === 'sm' ? 'text-xs' : 'text-sm'} ${
            isExpiringSoon 
              ? 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-100 dark:border-yellow-800'
              : 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-100 dark:border-green-800'
          }`}
          title={status.expires ? `Expires: ${expireTime?.toLocaleString()}` : 'Registered'}
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          {isExpiringSoon ? 'Expiring' : 'Registered'}
        </Badge>
        {showRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={refetch}
            disabled={isLoading}
            className="h-6 w-6 p-0"
            title="Refresh"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    );
  } else {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <Badge 
          className={`${size === 'sm' ? 'text-xs' : 'text-sm'} bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-800`}
          title={status.error || 'Account is not registered'}
        >
          <XCircle className="w-3 h-3 mr-1" />
          Not Registered
        </Badge>
        {showRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={refetch}
            disabled={isLoading}
            className="h-6 w-6 p-0"
            title="Refresh"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    );
  }
} 