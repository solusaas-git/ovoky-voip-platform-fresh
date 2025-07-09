'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Calendar, CheckCircle, Clock, DollarSign, Mail, Play, RefreshCw, Server, Trash2, Activity, Settings, RotateCcw, Save, X, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SchedulerSettings {
  enabled: boolean;
  checkInterval: number;
  timezone: string;
  lastCheck?: string;
  nextCheck?: string;
}

interface CronJobSchedule {
  jobName: string;
  jobPath: string;
  schedule: string;
  description: string;
  enabled: boolean;
  isCustom: boolean;
  icon?: string;
  canTriggerManually: boolean;
  triggerAction?: string;
  createdBy: string;
  lastModified: string;
}

interface CronJobExecutionSummary {
  jobName: string;
  lastExecution?: string;
  lastStatus?: 'success' | 'failed' | 'skipped';
  lastDuration?: number;
  totalExecutions: number;
  successRate: number;
  lastProcessed?: number;
  lastFailed?: number;
}

interface EditingSchedule {
  jobName: string;
  schedule: string;
  description: string;
  enabled: boolean;
}

const ICON_MAP: { [key: string]: React.ReactNode } = {
  'dollar-sign': <DollarSign className="h-4 w-4" />,
  'alert-circle': <AlertCircle className="h-4 w-4" />,
  'mail': <Mail className="h-4 w-4" />,
  'clock': <Clock className="h-4 w-4" />,
  'check-circle': <CheckCircle className="h-4 w-4" />,
  'trash-2': <Trash2 className="h-4 w-4" />,
};

const COMMON_SCHEDULES = [
  { value: '*/5 * * * *', label: 'Every 5 minutes' },
  { value: '*/15 * * * *', label: 'Every 15 minutes' },
  { value: '*/30 * * * *', label: 'Every 30 minutes' },
  { value: '0 * * * *', label: 'Every hour' },
  { value: '0 */2 * * *', label: 'Every 2 hours' },
  { value: '0 */6 * * *', label: 'Every 6 hours' },
  { value: '0 */12 * * *', label: 'Every 12 hours' },
  { value: '0 0 * * *', label: 'Daily at midnight' },
  { value: '0 1 * * *', label: 'Daily at 1:00 AM' },
  { value: '0 2 * * *', label: 'Daily at 2:00 AM' },
  { value: '0 3 * * *', label: 'Daily at 3:00 AM' },
  { value: '0 6 * * *', label: 'Daily at 6:00 AM' },
  { value: '0 12 * * *', label: 'Daily at noon' },
  { value: '0 0 * * 1', label: 'Weekly on Monday' },
  { value: '0 0 1 * *', label: 'Monthly on 1st' },
];

export function SchedulerSettings() {
  const [settings, setSettings] = useState<SchedulerSettings>({
    enabled: true,
    checkInterval: 360,
    timezone: 'Europe/London',
  });
  const [cronSchedules, setCronSchedules] = useState<CronJobSchedule[]>([]);
  const [cronExecutions, setCronExecutions] = useState<CronJobExecutionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [executionsLoading, setExecutionsLoading] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<EditingSchedule | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [scheduleValidation, setScheduleValidation] = useState<{valid: boolean; error?: string; description?: string} | null>(null);

  // Load settings on component mount
  useEffect(() => {
    fetchSettings();
    fetchCronSchedules();
    fetchCronExecutions();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/scheduler');
      const data = await response.json();

      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching scheduler settings:', error);
      toast.error('Failed to load scheduler settings');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCronSchedules = async () => {
    try {
      const response = await fetch('/api/admin/cron-schedules');
      const data = await response.json();

      if (data.success) {
        setCronSchedules(data.data || []);
        
        // Auto-refresh schedules if any job is missing manual trigger capability
        const schedules = data.data || [];
        const needsRefresh = schedules.some((schedule: CronJobSchedule) => 
          !schedule.canTriggerManually || !schedule.triggerAction
        );
        
        if (needsRefresh && schedules.length > 0) {
          setTimeout(() => {
            refreshAllSchedules();
          }, 1000);
        }
      } else {
        // Initialize default schedules if none exist
        await initializeDefaultSchedules();
      }
    } catch (error) {
      console.error('Error fetching cron schedules:', error);
      toast.error('Failed to load cron schedules');
    }
  };

  const fetchCronExecutions = async () => {
    setExecutionsLoading(true);
    try {
      const response = await fetch('/api/admin/cron-executions');
      const data = await response.json();

      if (data.success) {
        setCronExecutions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching cron executions:', error);
      toast.error('Failed to load cron execution data');
    } finally {
      setExecutionsLoading(false);
    }
  };

  const initializeDefaultSchedules = async () => {
    try {
      const response = await fetch('/api/admin/cron-schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'initialize' }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Initialized default cron schedules');
        fetchCronSchedules();
      }
    } catch (error) {
      console.error('Error initializing schedules:', error);
    }
  };

  const refreshAllSchedules = async () => {
    try {
      const response = await fetch('/api/admin/cron-schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'refresh-all' }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('All schedules refreshed with manual trigger support');
        fetchCronSchedules();
      } else {
        toast.error(data.error || 'Failed to refresh schedules');
      }
    } catch (error) {
      console.error('Error refreshing schedules:', error);
      toast.error('Failed to refresh schedules');
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/scheduler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Scheduler settings saved successfully');
        fetchSettings(); // Refresh settings
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving scheduler settings:', error);
      toast.error('Failed to save scheduler settings');
    } finally {
      setIsSaving(false);
    }
  };

  const triggerManualCheck = async (action: string) => {
    try {
      // Map trigger actions to actual cron job endpoints
      const cronEndpoints: { [key: string]: string } = {
        'trigger_check': '/api/cron/process-balance-checks',
        'trigger_kpi_check': '/api/cron/process-kpi-alerts',
        'trigger_notifications': '/api/cron/process-customer-notifications',
        'trigger_billing': '/api/cron/process-scheduled-billing',
        'trigger_backorders': '/api/cron/process-backorder-approvals',
        'trigger_cleanup': '/api/cron/cleanup-expired-sessions',
      };

      const endpoint = cronEndpoints[action];
      if (!endpoint) {
        toast.error(`Unknown trigger action: ${action}`);
        return;
      }

      toast.info('Triggering cron job manually...');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Manual ${action.replace('trigger_', '').replace('_', ' ')} completed successfully`);
        if (data.triggered === 'manual') {
          toast.info(`Executed as manual trigger - processing completed in ${data.duration}ms`);
        }
        // Wait a moment for the execution to be recorded, then refresh
        setTimeout(() => {
          fetchCronExecutions();
        }, 1000);
      } else {
        toast.error(data.error || `Failed to trigger ${action.replace('trigger_', '').replace('_', ' ')}`);
      }
    } catch (error) {
      console.error('Error triggering manual check:', error);
      toast.error('Failed to trigger manual check');
    }
  };

  const validateSchedule = async (schedule: string) => {
    try {
      const response = await fetch('/api/admin/cron-schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'validate', schedule }),
      });

      const data = await response.json();

      if (data.success) {
        setScheduleValidation({
          valid: data.valid,
          error: data.error,
          description: data.description,
        });
      }
    } catch (error) {
      console.error('Error validating schedule:', error);
    }
  };

  const handleEditSchedule = (cronSchedule: CronJobSchedule) => {
    setEditingSchedule({
      jobName: cronSchedule.jobName,
      schedule: cronSchedule.schedule,
      description: cronSchedule.description,
      enabled: cronSchedule.enabled,
    });
    setScheduleValidation(null);
    setIsEditDialogOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!editingSchedule) return;

    try {
      const response = await fetch('/api/admin/cron-schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          jobName: editingSchedule.jobName,
          schedule: editingSchedule.schedule,
          description: editingSchedule.description,
          enabled: editingSchedule.enabled,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Schedule updated successfully');
        toast.info('Please redeploy your application for schedule changes to take effect');
        setIsEditDialogOpen(false);
        setEditingSchedule(null);
        fetchCronSchedules();
      } else {
        toast.error(data.error || 'Failed to update schedule');
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule');
    }
  };

  const handleResetSchedule = async (jobName: string) => {
    try {
      const response = await fetch('/api/admin/cron-schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reset',
          jobName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Schedule reset to default successfully');
        toast.info('Please redeploy your application for schedule changes to take effect');
        fetchCronSchedules();
      } else {
        toast.error(data.error || 'Failed to reset schedule');
      }
    } catch (error) {
      console.error('Error resetting schedule:', error);
      toast.error('Failed to reset schedule');
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'skipped':
        return <Badge variant="secondary">Skipped</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getExecutionData = (jobName: string) => {
    return cronExecutions.find(execution => execution.jobName === jobName);
  };

  const describeCronExpression = (expression: string): string => {
    const commonExpressions: { [key: string]: string } = {
      '*/5 * * * *': 'Every 5 minutes',
      '0 * * * *': 'Every hour',
      '0 */2 * * *': 'Every 2 hours',
      '0 */6 * * *': 'Every 6 hours',
      '0 */12 * * *': 'Every 12 hours',
      '0 0 * * *': 'Daily at midnight',
      '0 1 * * *': 'Daily at 1:00 AM',
      '0 2 * * *': 'Daily at 2:00 AM',
      '0 3 * * *': 'Daily at 3:00 AM',
      '0 6 * * *': 'Daily at 6:00 AM',
      '0 12 * * *': 'Daily at noon',
      '0 0 * * 1': 'Weekly on Monday at midnight',
      '0 0 1 * *': 'Monthly on the 1st at midnight',
    };

    return commonExpressions[expression] || `Custom: ${expression}`;
  };

  return (
    <div className="space-y-6">
      {/* Migration Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Server className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg text-blue-900">Vercel Cron Jobs Migration</CardTitle>
          </div>
          <CardDescription className="text-blue-700">
            All scheduler tasks have been migrated to Vercel Cron Jobs for better reliability and performance.
            You can now configure schedules dynamically from this interface.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Master Control */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Cron Jobs Control Panel</span>
              </CardTitle>
              <CardDescription>
                Manage automated tasks, configure schedules, and view execution status
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchSettings();
                  fetchCronSchedules();
                  fetchCronExecutions();
                }}
                disabled={isLoading || executionsLoading}
                className="flex items-center space-x-1"
              >
                <RefreshCw className={`h-3 w-3 ${(isLoading || executionsLoading) ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
              
              {/* Only show Enable Manual Triggers if needed */}
              {cronSchedules.some(schedule => !schedule.canTriggerManually || !schedule.triggerAction) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshAllSchedules}
                  disabled={isLoading}
                  className="flex items-center space-x-1 border-orange-200 hover:bg-orange-50"
                >
                  <Settings className="h-3 w-3 text-orange-600" />
                  <span>Enable Manual Triggers</span>
                </Button>
              )}
              
              {/* Show confirmation when all triggers are enabled */}
              {cronSchedules.length > 0 && cronSchedules.every(schedule => schedule.canTriggerManually && schedule.triggerAction) && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  All manual triggers enabled
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global Enable/Disable */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="space-y-1">
              <Label className="text-base font-medium">Master Control</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable all automated cron jobs (Vercel jobs will still run but respect this setting)
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => {
                setSettings(prev => ({ ...prev, enabled: checked }));
              }}
              disabled={isLoading}
            />
          </div>

          <Separator />

          {/* Cron Jobs List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Vercel Cron Jobs</Label>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {cronSchedules.length} Configured Jobs
              </Badge>
            </div>

            <div className="grid gap-4">
              {cronSchedules.map((cronSchedule) => {
                const executionData = getExecutionData(cronSchedule.jobName);
                return (
                  <Card key={cronSchedule.jobName} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="mt-1">
                            {cronSchedule.icon && ICON_MAP[cronSchedule.icon] || <Clock className="h-4 w-4" />}
                          </div>
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">{cronSchedule.jobName}</h4>
                              {executionData && getStatusBadge(executionData.lastStatus)}
                              {cronSchedule.isCustom && (
                                <Badge variant="outline" className="text-xs">Custom</Badge>
                              )}
                              {!cronSchedule.enabled && (
                                <Badge variant="secondary" className="text-xs">Disabled</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{cronSchedule.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span>Schedule: {cronSchedule.schedule}</span>
                              <span>({describeCronExpression(cronSchedule.schedule)})</span>
                              {cronSchedule.canTriggerManually && (
                                <span className="text-green-600">• Manual trigger enabled</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Path: {cronSchedule.jobPath}
                            </div>
                            
                            {/* Execution Statistics */}
                            {executionData && (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 p-3 bg-muted/50 rounded">
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">Last Execution</p>
                                  <p className="text-xs">{formatDateTime(executionData.lastExecution)}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">Duration</p>
                                  <p className="text-xs">{formatDuration(executionData.lastDuration)}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">Success Rate</p>
                                  <p className="text-xs">{executionData.successRate.toFixed(1)}%</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">Total Runs (30d)</p>
                                  <p className="text-xs">{executionData.totalExecutions}</p>
                                </div>
                              </div>
                            )}
                            
                            {!executionData && !executionsLoading && (
                              <div className="p-3 bg-muted/50 rounded">
                                <p className="text-xs text-muted-foreground">No execution data available</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2 ml-4">
                          {/* Edit Schedule Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditSchedule(cronSchedule)}
                            disabled={isLoading}
                            className="flex items-center space-x-1"
                          >
                            <Settings className="h-3 w-3" />
                            <span>Edit</span>
                          </Button>

                          {/* Reset to Default Button */}
                          {cronSchedule.isCustom && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResetSchedule(cronSchedule.jobName)}
                              disabled={isLoading}
                              className="flex items-center space-x-1"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Reset</span>
                            </Button>
                          )}

                          {/* Manual Trigger Button */}
                          {cronSchedule.canTriggerManually && cronSchedule.triggerAction && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => triggerManualCheck(cronSchedule.triggerAction!)}
                              disabled={isLoading}
                              className="flex items-center space-x-1 border-green-200 hover:bg-green-50"
                            >
                              <Play className="h-3 w-3 text-green-600" />
                              <span>Trigger Now</span>
                            </Button>
                          )}
                          
                          {/* Show note if manual trigger is not available */}
                          {!cronSchedule.canTriggerManually && (
                            <div className="text-xs text-muted-foreground text-center min-w-[80px]">
                              Manual trigger<br/>not available
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Legacy Settings */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Legacy Settings</Label>
            <p className="text-sm text-muted-foreground">
              These settings are preserved for backward compatibility and manual triggers.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkInterval">Check Interval (minutes)</Label>
                <Input
                  id="checkInterval"
                  type="number"
                  min="30"
                  max="10080"
                  value={settings.checkInterval}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 360;
                    setSettings(prev => ({ ...prev, checkInterval: value }));
                  }}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Used for manual triggers and backward compatibility (30 min to 7 days)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={settings.timezone}
                  onChange={(e) => {
                    setSettings(prev => ({ ...prev, timezone: e.target.value }));
                  }}
                  disabled={isLoading}
                  placeholder="Europe/London"
                />
                <p className="text-xs text-muted-foreground">
                  Timezone for displaying execution times
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Status Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>System Status</span>
              </Label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-sm">Last Manual Check</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(settings.lastCheck)}
                </p>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <Server className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-sm">Cron Jobs Status</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {settings.enabled ? 'Active on Vercel' : 'Paused (respecting settings)'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={saveSettings}
              disabled={isSaving || isLoading}
              className="flex items-center space-x-2"
            >
              {isSaving && <RefreshCw className="h-4 w-4 animate-spin" />}
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Schedule Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Edit Cron Schedule: {editingSchedule?.jobName}</span>
            </DialogTitle>
            <DialogDescription>
              Configure the schedule and settings for this cron job. Changes require a redeploy to take effect.
            </DialogDescription>
          </DialogHeader>

          {editingSchedule && (
            <>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {/* Enable/Disable */}
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Enable Job</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable or disable this specific cron job
                    </p>
                  </div>
                  <Switch
                    checked={editingSchedule.enabled}
                    onCheckedChange={(checked) => {
                      setEditingSchedule(prev => prev ? { ...prev, enabled: checked } : null);
                    }}
                  />
                </div>

                <Separator />

                {/* Schedule Expression */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="schedule" className="flex items-center space-x-2 text-sm">
                      <span>Cron Schedule</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1"
                        onClick={() => window.open('https://crontab.guru', '_blank')}
                      >
                        <HelpCircle className="h-3 w-3" />
                      </Button>
                    </Label>
                    <Input
                      id="schedule"
                      value={editingSchedule.schedule}
                      onChange={(e) => {
                        const newSchedule = e.target.value;
                        setEditingSchedule(prev => prev ? { ...prev, schedule: newSchedule } : null);
                        if (newSchedule.trim()) {
                          validateSchedule(newSchedule.trim());
                        } else {
                          setScheduleValidation(null);
                        }
                      }}
                      placeholder="0 */6 * * *"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter a cron expression (minute hour day month weekday). Use crontab.guru for help.
                    </p>
                  </div>

                  {/* Schedule Validation */}
                  {scheduleValidation && (
                    <div className={`p-2 rounded-lg text-sm ${
                      scheduleValidation.valid 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      {scheduleValidation.valid ? (
                        <div className="flex items-center space-x-2 text-green-800">
                          <CheckCircle className="h-3 w-3" />
                          <span className="font-medium text-xs">Valid schedule</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 text-red-800">
                          <X className="h-3 w-3" />
                          <span className="font-medium text-xs">Invalid schedule</span>
                        </div>
                      )}
                      <p className="text-xs mt-1">
                        {scheduleValidation.description || scheduleValidation.error}
                      </p>
                    </div>
                  )}

                  {/* Common Schedules - More compact grid */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Quick Select</Label>
                    <div className="grid grid-cols-3 gap-1">
                      {COMMON_SCHEDULES.slice(0, 12).map((schedule) => (
                        <Button
                          key={schedule.value}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingSchedule(prev => prev ? { ...prev, schedule: schedule.value } : null);
                            validateSchedule(schedule.value);
                          }}
                          className="justify-start text-xs px-2 py-1 h-auto"
                        >
                          {schedule.label}
                        </Button>
                      ))}
                    </div>
                    {COMMON_SCHEDULES.length > 12 && (
                      <div className="grid grid-cols-3 gap-1">
                        {COMMON_SCHEDULES.slice(12).map((schedule) => (
                          <Button
                            key={schedule.value}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingSchedule(prev => prev ? { ...prev, schedule: schedule.value } : null);
                              validateSchedule(schedule.value);
                            }}
                            className="justify-start text-xs px-2 py-1 h-auto"
                          >
                            {schedule.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm">Description</Label>
                  <Textarea
                    id="description"
                    value={editingSchedule.description}
                    onChange={(e) => {
                      setEditingSchedule(prev => prev ? { ...prev, description: e.target.value } : null);
                    }}
                    placeholder="Describe what this cron job does..."
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Actions - Fixed at bottom */}
              <div className="flex items-center justify-between pt-4 flex-shrink-0 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingSchedule(null);
                    setScheduleValidation(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveSchedule}
                  disabled={scheduleValidation ? !scheduleValidation.valid : false}
                  className="flex items-center space-x-2"
                >
                  <Save className="h-3 w-3" />
                  <span>Save Schedule</span>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 