'use client';

/*
 * ActiveCalls Component - Color Usage Philosophy:
 * 
 * - Brand colors (colors.primary, colors.secondary, colors.accent): Used for icons, backgrounds, and accents
 * - Theme-aware text colors (.text-brand, .text-foreground): Used for main content text for readability
 * - Tailwind semantic colors (.text-muted-foreground): Used for secondary text
 * 
 * This ensures brand identity is maintained while text remains readable in both light and dark modes.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from '@/lib/i18n';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  RefreshCw, 
  PhoneOff, 
  Phone, 
  PhoneCall,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Timer,
  Globe,
  MapPin,
  Zap,
  TrendingUp,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import { useBranding } from '@/hooks/useBranding';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Helper function to parse Sippy's SETUP_TIME date format
// Format: "20210822T10:11:52.000"
function parseSippyDate(sippyDateString: string): Date | null {
  if (!sippyDateString) return null;
  
  try {
    // Sippy SETUP_TIME format: "YYYYMMDDTHH:MM:SS.000"
    // Example: "20210822T10:11:52.000"
    
    // Check if it's the SETUP_TIME format
    if (sippyDateString.includes('T') && sippyDateString.length >= 18) {
      // Remove milliseconds and parse as ISO-like format
      const withoutMs = sippyDateString.split('.')[0]; // "20210822T10:11:52"
      
      // Insert dashes and colons to make it a proper ISO string
      // "20210822T10:11:52" -> "2021-08-22T10:11:52"
      const year = withoutMs.substring(0, 4);
      const month = withoutMs.substring(4, 6);
      const day = withoutMs.substring(6, 8);
      const time = withoutMs.substring(9); // "10:11:52"
      
      const isoString = `${year}-${month}-${day}T${time}Z`;
      console.log('Parsing SETUP_TIME:', sippyDateString, '->', isoString);
      
      return new Date(isoString);
    }
    
    // Fallback: try GMT format for other date fields
    // Format: "HH:MM:SS.000 GMT Day Mon DD YYYY"
    const parts = sippyDateString.split(' ');
    if (parts.length >= 6) {
      const time = parts[0]; // "22:43:01.000"
      const monthName = parts[3]; // "May"
      const day = parts[4]; // "22"
      const year = parts[5]; // "2025"
      
      // Convert month name to number
      const months: Record<string, string> = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      
      const month = months[monthName];
      if (!month) {
        console.error('Unknown month:', monthName);
        return null;
      }
      
      // Remove milliseconds from time and create ISO string
      const timeWithoutMs = time.split('.')[0]; // "22:43:01"
      const isoString = `${year}-${month}-${day.padStart(2, '0')}T${timeWithoutMs}Z`;
      
      return new Date(isoString);
    }
    
    console.error('Unrecognized date format:', sippyDateString);
    return null;
  } catch (e) {
    console.error('Error parsing Sippy date:', sippyDateString, e);
    return null;
  }
}

interface ActiveCall {
  CLI: string;
  CLD: string;
  CALL_ID: string;
  DELAY: number;
  DURATION: number;
  CC_STATE: string;
  I_ACCOUNT: number;
  ID: string;
  I_CUSTOMER: string;
  I_ENVIRONMENT: string;
  CALLER_MEDIA_IP: string;
  CALLEE_MEDIA_IP: string;
  SETUP_TIME: string;
  DIRECTION: string;
  NODE_ID?: string;
  I_CONNECTION: number;
}

interface CallStats {
  total: number;
  connected: number;
  arComplete: number;
  waitRoute: number;
  waitAuth: number;
  idle: number;
  disconnecting: number;
  dead: number;
  avgDuration: number;
  avgDelay: number;
}

interface ActiveCallsProps {
  accountId?: number;
}

export function ActiveCalls({ accountId }: ActiveCallsProps) {
  const { t } = useTranslations();
  const { user } = useAuth();
  const { colors, features, getGradientStyle } = useBranding();
  
  const [calls, setCalls] = useState<ActiveCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  const targetAccountId = accountId || user?.sippyAccountId;

  // Dynamic call states with translations
  const getCallStates = () => ({
    'Connected': { 
      label: t('calls.activeCalls.states.connected.label'), 
      color: 'text-green-600 dark:text-green-400', 
      bgColor: 'bg-green-50 dark:bg-green-950/50', 
      borderColor: 'border-green-200 dark:border-green-800',
      icon: CheckCircle,
      description: t('calls.activeCalls.states.connected.description')
    },
    'ARComplete': { 
      label: t('calls.activeCalls.states.arComplete.label'), 
      color: 'text-blue-600 dark:text-blue-400', 
      bgColor: 'bg-blue-50 dark:bg-blue-950/50', 
      borderColor: 'border-blue-200 dark:border-blue-800',
      icon: PhoneCall,
      description: t('calls.activeCalls.states.arComplete.description')
    },
    'WaitRoute': { 
      label: t('calls.activeCalls.states.waitRoute.label'), 
      color: 'text-amber-600 dark:text-amber-400', 
      bgColor: 'bg-amber-50 dark:bg-amber-950/50', 
      borderColor: 'border-amber-200 dark:border-amber-800',
      icon: Clock,
      description: t('calls.activeCalls.states.waitRoute.description')
    },
    'WaitAuth': { 
      label: t('calls.activeCalls.states.waitAuth.label'), 
      color: 'text-purple-600 dark:text-purple-400', 
      bgColor: 'bg-purple-50 dark:bg-purple-950/50', 
      borderColor: 'border-purple-200 dark:border-purple-800',
      icon: AlertCircle,
      description: t('calls.activeCalls.states.waitAuth.description')
    },
    'Idle': { 
      label: t('calls.activeCalls.states.idle.label'), 
      color: 'text-gray-600 dark:text-gray-400', 
      bgColor: 'bg-gray-50 dark:bg-gray-950/50', 
      borderColor: 'border-gray-200 dark:border-gray-800',
      icon: Timer,
      description: t('calls.activeCalls.states.idle.description')
    },
    'Disconnecting': { 
      label: t('calls.activeCalls.states.disconnecting.label'), 
      color: 'text-orange-600 dark:text-orange-400', 
      bgColor: 'bg-orange-50 dark:bg-orange-950/50', 
      borderColor: 'border-orange-200 dark:border-orange-800',
      icon: PhoneOff,
      description: t('calls.activeCalls.states.disconnecting.description')
    },
    'Dead': { 
      label: t('calls.activeCalls.states.dead.label'), 
      color: 'text-red-600 dark:text-red-400', 
      bgColor: 'bg-red-50 dark:bg-red-950/50', 
      borderColor: 'border-red-200 dark:border-red-800',
      icon: XCircle,
      description: t('calls.activeCalls.states.dead.description')
    }
  });

  // Calculate call statistics
  const calculateStats = (calls: ActiveCall[]): CallStats => {
    const stats: CallStats = {
      total: calls.length,
      connected: 0,
      arComplete: 0,
      waitRoute: 0,
      waitAuth: 0,
      idle: 0,
      disconnecting: 0,
      dead: 0,
      avgDuration: 0,
      avgDelay: 0
    };

    if (calls.length === 0) return stats;

    let totalDuration = 0;
    let totalDelay = 0;

    calls.forEach(call => {
      const state = call.CC_STATE?.toLowerCase();
      
      switch (state) {
        case 'connected':
          stats.connected++;
          break;
        case 'arcomplete':
          stats.arComplete++;
          break;
        case 'waitroute':
          stats.waitRoute++;
          break;
        case 'waitauth':
          stats.waitAuth++;
          break;
        case 'idle':
          stats.idle++;
          break;
        case 'disconnecting':
          stats.disconnecting++;
          break;
        case 'dead':
          stats.dead++;
          break;
      }

      totalDuration += call.DURATION || 0;
      totalDelay += call.DELAY || 0;
    });

    stats.avgDuration = totalDuration / calls.length;
    stats.avgDelay = totalDelay / calls.length;

    return stats;
  };

  const stats = calculateStats(calls);

  const fetchActiveCalls = useCallback(async () => {
    if (!targetAccountId) {
      setError('No account ID available');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const apiUrl = `/api/sippy/account/${targetAccountId}/calls/active`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch active calls`);
      }

      const data = await response.json();
      setCalls(data.calls || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching active calls:', err);
      
      let errorMessage = 'Failed to fetch active calls';
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [targetAccountId]);

  const disconnectCall = async (callId: string) => {
    if (!callId) {
      toast.error(t('calls.activeCalls.table.noValidCallId'));
      return;
    }

    try {
      const response = await fetch(`/api/sippy/calls/${callId}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to disconnect call');
      }

      toast.success('Call disconnected successfully');
      fetchActiveCalls(); // Refresh the calls list
    } catch (err) {
      console.error('Error disconnecting call:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect call';
      toast.error(errorMessage);
    }
  };

  const disconnectAllCalls = async () => {
    if (!targetAccountId) return;

    try {
      const response = await fetch(`/api/sippy/account/${targetAccountId}/calls/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to disconnect all calls');
      }

      toast.success('All calls disconnected successfully');
      fetchActiveCalls(); // Refresh the calls list
    } catch (err) {
      console.error('Error disconnecting all calls:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect all calls';
      toast.error(errorMessage);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}` : `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallStateInfo = (state: string) => {
    const states = getCallStates();
    return states[state as keyof typeof states] || {
      label: state,
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-950/50',
      borderColor: 'border-gray-200 dark:border-gray-800',
      icon: Activity,
      description: t('calls.activeCalls.states.unknown.description')
    };
  };

  useEffect(() => {
    fetchActiveCalls();
    const interval = setInterval(fetchActiveCalls, 10000);
    return () => clearInterval(interval);
  }, [fetchActiveCalls]);

  if (isLoading && calls.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-foreground">
        <div className="text-center space-y-4">
          <div 
            className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
          >
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {t('calls.activeCalls.loading.title')}
            </h3>
            <p className="text-muted-foreground">{t('calls.activeCalls.loading.description')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <CardTitle className="text-destructive">{t('calls.activeCalls.error.title')}</CardTitle>
              <CardDescription>{t('calls.activeCalls.error.description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button 
            variant="outline" 
            onClick={fetchActiveCalls}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t('calls.activeCalls.error.tryAgain')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!user?.sippyAccountId && !accountId) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <CardTitle className="text-destructive">{t('calls.activeCalls.noSippyAccount.title')}</CardTitle>
              <CardDescription>{t('calls.activeCalls.noSippyAccount.description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            {t('calls.activeCalls.noSippyAccount.contactAdmin')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 text-foreground">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
              style={{ backgroundColor: `${colors.primary}20` }}
            >
              <Activity className="h-4 w-4" style={{ color: colors.primary }} />
              <span className="text-brand">{t('calls.activeCalls.header.realTimeMonitoring')}</span>
            </div>
          </div>
          <p className="text-muted-foreground">
            {stats.total === 1 
              ? t('calls.activeCalls.header.callCount', { 
                  count: stats.total.toString(), 
                  accountId: targetAccountId?.toString() || ''
                })
              : t('calls.activeCalls.header.callCountPlural', { 
                  count: stats.total.toString(), 
                  accountId: targetAccountId?.toString() || ''
                })
            }
            {lastRefresh && (
              <span className="ml-2">
                • {t('calls.activeCalls.header.lastUpdated', { time: format(lastRefresh, 'HH:mm:ss') })}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchActiveCalls}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('calls.activeCalls.header.refresh')}
          </Button>
          {targetAccountId && stats.total > 0 && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={disconnectAllCalls}
              className="gap-2"
            >
              <PhoneOff className="h-4 w-4" />
              {t('calls.activeCalls.header.disconnectAll')}
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Calls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('calls.activeCalls.stats.totalCalls')}</p>
                <p className="text-2xl font-bold text-brand">
                  {stats.total}
                </p>
              </div>
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.primary}20` }}
              >
                <Phone className="h-6 w-6" style={{ color: colors.primary }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connected Calls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('calls.activeCalls.stats.connected')}</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.connected}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('calls.activeCalls.stats.ofTotal', { 
                    percentage: (stats.total > 0 ? Math.round((stats.connected / stats.total) * 100) : 0).toString()
                  })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-950/50 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Duration */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('calls.activeCalls.stats.avgDuration')}</p>
                <p className="text-2xl font-bold text-brand">
                  {formatDuration(stats.avgDuration)}
                </p>
              </div>
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.secondary}20` }}
              >
                <Timer className="h-6 w-6" style={{ color: colors.secondary }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Delay */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('calls.activeCalls.stats.avgDelay')}</p>
                <p className="text-2xl font-bold text-brand">
                  {stats.avgDelay.toFixed(2)}s
                </p>
              </div>
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.accent}20` }}
              >
                <Zap className="h-6 w-6" style={{ color: colors.accent }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call States Overview */}
      {stats.total > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5" style={{ color: colors.primary }} />
              {t('calls.activeCalls.states.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {Object.entries(getCallStates()).map(([state, config]) => {
                // Map the state name to the correct stats property
                const getStateCount = (stateName: string): number => {
                  switch (stateName) {
                    case 'Connected':
                      return stats.connected;
                    case 'ARComplete':
                      return stats.arComplete;
                    case 'WaitRoute':
                      return stats.waitRoute;
                    case 'WaitAuth':
                      return stats.waitAuth;
                    case 'Idle':
                      return stats.idle;
                    case 'Disconnecting':
                      return stats.disconnecting;
                    case 'Dead':
                      return stats.dead;
                    default:
                      return 0;
                  }
                };
                
                const count = getStateCount(state);
                const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                const StateIcon = config.icon;
                
                return (
                  <div 
                    key={state}
                    className={`p-3 rounded-lg border ${config.borderColor} ${config.bgColor} transition-all hover:shadow-sm`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <StateIcon className={`h-4 w-4 ${config.color}`} />
                      <span className="text-xs font-medium text-muted-foreground">
                        {config.label}
                      </span>
                    </div>
                    <p className={`text-lg font-bold ${config.color}`}>{count}</p>
                    <p className="text-xs text-muted-foreground">
                      {percentage.toFixed(1)}%
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calls Table or Empty State */}
      {stats.total === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="space-y-4">
              <div 
                className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
              >
                <Phone className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {t('calls.activeCalls.emptyState.title')}
                </h3>
                <p className="text-muted-foreground">
                  {t('calls.activeCalls.emptyState.description', { 
                    accountId: targetAccountId?.toString() || ''
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-5 w-5" style={{ color: colors.primary }} />
              {t('calls.activeCalls.table.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('calls.activeCalls.table.headers.call')}</TableHead>
                    <TableHead>{t('calls.activeCalls.table.headers.state')}</TableHead>
                    <TableHead>{t('calls.activeCalls.table.headers.duration')}</TableHead>
                    <TableHead>{t('calls.activeCalls.table.headers.setupTime')}</TableHead>
                    <TableHead>{t('calls.activeCalls.table.headers.direction')}</TableHead>
                    <TableHead>{t('calls.activeCalls.table.headers.ips')}</TableHead>
                    <TableHead>{t('calls.activeCalls.table.headers.delay')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.map((call, index) => (
                    <TableRow key={call.CALL_ID || index} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="space-y-1 text-foreground">
                          <div className="font-medium">
                            {call.CLI} → {call.CLD}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {call.CALL_ID}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline">
                          {call.CC_STATE}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {formatDuration(call.DURATION || 0)}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm text-foreground">
                          {call.SETUP_TIME || 'N/A'}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {call.DIRECTION || 'N/A'}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1 text-xs text-foreground">
                          <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono">{call.CALLER_MEDIA_IP || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono">{call.CALLEE_MEDIA_IP || 'N/A'}</span>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {call.DELAY?.toFixed?.(2) || call.DELAY || 'N/A'}s
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 