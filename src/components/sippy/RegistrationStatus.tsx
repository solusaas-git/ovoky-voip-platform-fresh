'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Clock,
  Smartphone,
  Globe,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { useRegistrationStatus } from '@/hooks/useRegistrationStatus';

interface RegistrationStatusProps {
  accountId?: number;
  showCard?: boolean;
  autoRefresh?: boolean;
  className?: string;
}

export function RegistrationStatus({ 
  accountId, 
  showCard = true, 
  autoRefresh = false,
  className = '' 
}: RegistrationStatusProps) {
  const { registrationStatus, isLoading, error, refetch } = useRegistrationStatus(
    accountId, 
    autoRefresh
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getStatusBadge = () => {
    if (!registrationStatus) return null;

    const { registrationStatus: status } = registrationStatus;
    
    if (status.result === 'OK') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-100 dark:border-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Registered
        </Badge>
      );
    } else if (status.result === 'NOT_REGISTERED' || status.error) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Not Registered
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-100 dark:border-yellow-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          Unknown
        </Badge>
      );
    }
  };

  const formatExpiryTime = (expires?: string) => {
    if (!expires) return 'Not available';
    
    try {
      // Parse Sippy date format: "20:55:19.000 GMT Tue Jun 10 2025"
      // Convert to JavaScript-compatible format: "Tue Jun 10 2025 20:55:19 GMT"
      const match = expires.match(/^(\d{2}:\d{2}:\d{2})\.000 GMT (\w{3} \w{3} \d{1,2} \d{4})$/);
      if (match) {
        const timeStr = match[1]; // "20:55:19"
        const dateStr = match[2]; // "Tue Jun 10 2025"
        // Reformat to "Tue Jun 10 2025 20:55:19 GMT"
        const reformattedDate = `${dateStr} ${timeStr} GMT`;
        const date = new Date(reformattedDate);
        
        // Validate the date
        if (isNaN(date.getTime())) {
          console.warn('Invalid expiration date from Sippy:', expires);
          return expires; // Return original string if parsing fails
        }
        
        return date.toLocaleString();
      } else {
        // Fallback: try parsing as-is
        const date = new Date(expires);
        if (isNaN(date.getTime())) {
          return expires; // Return original string if parsing fails
        }
        return date.toLocaleString();
      }
    } catch (error) {
      console.warn('Error parsing expiration date:', expires, error);
      return expires; // Return original string if parsing fails
    }
  };

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
          {getStatusBadge()}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {registrationStatus && (
        <>
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {registrationStatus.registrationStatus.user_agent && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">User Agent</h4>
                <div className="flex items-center space-x-2">
                  <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
                    {registrationStatus.registrationStatus.user_agent}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(registrationStatus.registrationStatus.user_agent!, 'user_agent')}
                  >
                    {copiedField === 'user_agent' ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center space-x-1 mt-1">
                  <Smartphone className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Client Device</span>
                </div>
              </div>
            )}

            {registrationStatus.registrationStatus.contact && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Contact</h4>
                <div className="flex items-center space-x-2">
                  <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
                    {registrationStatus.registrationStatus.contact}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(registrationStatus.registrationStatus.contact!, 'contact')}
                  >
                    {copiedField === 'contact' ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center space-x-1 mt-1">
                  <Globe className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Contact URI</span>
                </div>
              </div>
            )}

            {registrationStatus.registrationStatus.expires && (
              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Registration Expires</h4>
                <div className="flex items-center space-x-2">
                  <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {formatExpiryTime(registrationStatus.registrationStatus.expires)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(registrationStatus.registrationStatus.expires!, 'expires')}
                  >
                    {copiedField === 'expires' ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center space-x-1 mt-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Expiration Time</span>
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground mt-2">
            Last updated: {new Date(registrationStatus.timestamp).toLocaleString()}
          </div>
        </>
      )}

      {!registrationStatus && !error && !isLoading && accountId && (
        <div className="text-center py-4 text-muted-foreground">
          No registration status available
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
            <Activity className="h-5 w-5" />
            <span>SIP Registration Status</span>
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