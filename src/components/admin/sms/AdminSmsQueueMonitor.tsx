'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  Activity,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface QueueStats {
  queued: number;
  processing: number;
  sent: number;
  failed: number;
  providerStats: Array<{
    providerId: string;
    name: string;
    messagesThisSecond: number;
    messagesThisMinute: number;
    messagesThisHour: number;
    rateLimit: {
      messagesPerSecond: number;
      messagesPerMinute: number;
      messagesPerHour: number;
    };
  }>;
}

export function AdminSmsQueueMonitor() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    loadStats();
    
    // Auto-refresh every 5 seconds if enabled
    const interval = setInterval(() => {
      if (autoRefresh) {
        loadStats(false); // Silent refresh
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadStats = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      const response = await fetch('/api/admin/sms/queue-stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        toast.error('Failed to load queue statistics');
      }
    } catch (error) {
      console.error('Failed to load queue stats:', error);
      toast.error('Failed to load queue statistics');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadStats();
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const handleResetQueue = async () => {
    try {
      setResetting(true);
      
      const response = await fetch('/api/admin/sms/queue-reset', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        
        // Refresh stats after reset
        await loadStats();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to reset queue');
      }
    } catch (error) {
      console.error('Failed to reset queue:', error);
      toast.error('Failed to reset queue');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">SMS Queue Monitor</h2>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-muted animate-pulse rounded" />
            <div className="h-10 w-10 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Failed to load queue statistics</p>
        <Button onClick={handleRefresh} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const totalMessages = stats.queued + stats.processing + stats.sent + stats.failed;
  const successRate = totalMessages > 0 ? (stats.sent / totalMessages) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">SMS Queue Monitor</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of SMS queue processing
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={toggleAutoRefresh}
            size="sm"
          >
            {autoRefresh ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Auto Refresh
          </Button>
          <Button onClick={handleRefresh} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                size="sm" 
                variant="destructive"
                disabled={resetting || !stats || (stats.queued === 0 && stats.processing === 0)}
              >
                {resetting ? (
                  <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {resetting ? 'Resetting...' : 'Reset Queue'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset SMS Queue</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to reset the SMS queue? This will mark{' '}
                  <strong>{stats ? stats.queued + stats.processing : 0} messages</strong> as failed:
                  <ul className="mt-2 space-y-1">
                    <li>• {stats?.queued || 0} queued messages</li>
                    <li>• {stats?.processing || 0} processing messages</li>
                  </ul>
                  <div className="mt-3 p-3 bg-destructive/10 rounded-md">
                    <strong>Warning:</strong> This action cannot be undone. All affected campaigns will be marked as failed.
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleResetQueue}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Reset Queue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queued</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.queued.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Messages waiting to be processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.processing.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Currently being sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.sent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Successfully delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Failed to deliver
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Success Rate */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Success Rate</CardTitle>
          <CardDescription>
            Percentage of messages successfully delivered
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Success Rate</span>
              <span className="font-medium">{successRate.toFixed(1)}%</span>
            </div>
            <Progress value={successRate} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {stats.sent.toLocaleString()} successful out of {totalMessages.toLocaleString()} total messages
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Actions */}
      {(stats.queued > 0 || stats.processing > 0) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-5 w-5" />
              Queue Status Alert
            </CardTitle>
            <CardDescription className="text-amber-700">
              There are messages currently in the queue that may need attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm text-amber-800">
                <strong>Active Messages:</strong>
                <ul className="mt-1 space-y-1">
                  {stats.queued > 0 && <li>• {stats.queued} messages waiting to be processed</li>}
                  {stats.processing > 0 && <li>• {stats.processing} messages currently being sent</li>}
                </ul>
              </div>
              <div className="flex items-center gap-2 text-xs text-amber-700">
                <AlertCircle className="h-4 w-4" />
                Use the "Reset Queue" button above if messages appear stuck or if you need to clear the queue
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Statistics</CardTitle>
          <CardDescription>
            Real-time usage and rate limits for each SMS provider
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.providerStats.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No active providers configured
            </p>
          ) : (
            <div className="space-y-6">
              {stats.providerStats.map((provider) => (
                <div key={provider.providerId} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{provider.name}</h4>
                    <Badge variant="outline">
                      {provider.providerId.slice(-8)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    {/* Per Second */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Per Second</span>
                        <span>{provider.messagesThisSecond}/{provider.rateLimit.messagesPerSecond}</span>
                      </div>
                      <Progress 
                        value={(provider.messagesThisSecond / provider.rateLimit.messagesPerSecond) * 100} 
                        className="h-1"
                      />
                    </div>

                    {/* Per Minute */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Per Minute</span>
                        <span>{provider.messagesThisMinute}/{provider.rateLimit.messagesPerMinute}</span>
                      </div>
                      <Progress 
                        value={(provider.messagesThisMinute / provider.rateLimit.messagesPerMinute) * 100} 
                        className="h-1"
                      />
                    </div>

                    {/* Per Hour */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Per Hour</span>
                        <span>{provider.messagesThisHour}/{provider.rateLimit.messagesPerHour}</span>
                      </div>
                      <Progress 
                        value={(provider.messagesThisHour / provider.rateLimit.messagesPerHour) * 100} 
                        className="h-1"
                      />
                    </div>
                  </div>

                  {provider !== stats.providerStats[stats.providerStats.length - 1] && (
                    <Separator />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-refresh indicator */}
      {autoRefresh && (
        <div className="flex items-center justify-center text-xs text-muted-foreground">
          <Activity className="h-3 w-3 mr-1 animate-pulse" />
          Auto-refreshing every 5 seconds
        </div>
      )}
    </div>
  );
} 