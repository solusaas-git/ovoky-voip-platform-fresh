'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertCircle, CheckCircle, Clock, DollarSign, MessageSquare, RefreshCw, Settings, CreditCard, Users, Save, Play, Calendar, Zap, ChevronDown, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from '@/lib/i18n';

interface SmsBilling {
  _id: string;
  user: {
    _id: string;
    email: string;
    name?: string;
    company?: string;
  };
  billingPeriodStart: string;
  billingPeriodEnd: string;
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  totalCost: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  billingDate: string;
  paidDate?: string;
  failureReason?: string;
  sippyTransactionId?: string;
  processedBy?: string;
  notes?: string;
  createdAt: string;
  messageBreakdown: Array<{
    country: string;
    prefix: string;
    messageCount: number;
    rate: number;
    totalCost: number;
  }>;
}

interface BillingStats {
  pending: { count: number; totalCost: number; totalMessages: number };
  paid: { count: number; totalCost: number; totalMessages: number };
  failed: { count: number; totalCost: number; totalMessages: number };
  cancelled: { count: number; totalCost: number; totalMessages: number };
}

interface SmsBillingSettings {
  _id?: string;
  userId?: string;
  isGlobal: boolean;
  billingFrequency: 'daily' | 'weekly' | 'monthly' | 'threshold';
  maxAmount: number;
  maxMessages: number;
  autoProcessing: boolean;
  notificationEnabled: boolean;
  notificationThreshold: number;
  billingDayOfWeek?: number;
  billingDayOfMonth?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface User {
  _id: string;
  email: string;
  name?: string;
  company?: string;
}

export function AdminSmsBilling() {
  const { t } = useTranslations();
  
  // Billing Management State
  const [billings, setBillings] = useState<SmsBilling[]>([]);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedBilling, setSelectedBilling] = useState<SmsBilling | null>(null);
  const [triggeringBilling, setTriggeringBilling] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Settings State
  const [globalSettings, setGlobalSettings] = useState<SmsBillingSettings>({
    isGlobal: true,
    billingFrequency: 'daily',
    maxAmount: 100,
    maxMessages: 1000,
    autoProcessing: true,
    notificationEnabled: true,
    notificationThreshold: 80,
    isActive: true,
  });

  const [userSettings, setUserSettings] = useState<SmsBillingSettings[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [newUserSettings, setNewUserSettings] = useState<SmsBillingSettings>({
    isGlobal: false,
    billingFrequency: 'daily',
    maxAmount: 100,
    maxMessages: 1000,
    autoProcessing: true,
    notificationEnabled: true,
    notificationThreshold: 80,
    isActive: true,
  });

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('management');

  const fetchBillings = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(statusFilter && { status: statusFilter }),
        ...(userFilter && { userId: userFilter }),
      });

      const response = await fetch(`/api/admin/sms/billing?${params}`);
      if (!response.ok) throw new Error('Failed to fetch billings');
      
      const data = await response.json();
      setBillings(data.billings);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      toast.error('Failed to fetch SMS billings');
      console.error('Error:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/sms/billing-stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

    const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/sms/billing-settings?includeGlobal=true');
      if (!response.ok) throw new Error('Failed to fetch settings');
      
      const data = await response.json();
      
      // Separate global and user settings  
      const global = data.settings.find((s: any) => !s.user);
      const userSpecific = data.settings.filter((s: any) => s.user);
      
      if (global) {
        setGlobalSettings({
          _id: global._id,
          isGlobal: true,
          billingFrequency: global.billingFrequency,
          maxAmount: global.maxAmount,
          maxMessages: global.maxMessages,
          autoProcessing: global.autoProcessing,
          notificationEnabled: global.notificationEnabled,
          notificationThreshold: global.notificationThreshold,
          billingDayOfWeek: global.billingDayOfWeek,
          billingDayOfMonth: global.billingDayOfMonth,
          isActive: global.isActive,
          createdAt: global.createdAt,
          updatedAt: global.updatedAt,
        });
      }
      setUserSettings(userSpecific);
      
    } catch (error) {
      toast.error('Failed to fetch billing settings');
      console.error('Error:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users?limit=1000');
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      setUsers(data.users || []);
      
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const processBilling = async (billingId: string) => {
    setProcessing(billingId);
    try {
      const response = await fetch('/api/admin/sms/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process billing');
      }

      const data = await response.json();
      toast.success('Billing processed successfully');
      
      // Refresh data
      await fetchBillings();
      await fetchStats();
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process billing');
    } finally {
      setProcessing(null);
    }
  };

  const triggerCronJob = async (type: 'daily' | 'weekly' | 'monthly' = 'daily') => {
    setTriggeringBilling(type);
    try {
      const response = await fetch(`/api/cron/process-sms-billing?type=${type}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process SMS billing');
      }

      const data = await response.json();
      toast.success(
        `${type.charAt(0).toUpperCase() + type.slice(1)} SMS billing processed: ` +
        `${data.summary.billingsCreated} created, ${data.summary.billingsProcessed} processed`
      );
      
      // Refresh data
      await fetchBillings();
      await fetchStats();
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process SMS billing');
    } finally {
      setTriggeringBilling(null);
    }
  };

  const processAllPendingBillings = async () => {
    setTriggeringBilling('pending');
    try {
      const response = await fetch('/api/admin/sms/billing/process-pending', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process pending billings');
      }

      const data = await response.json();
      toast.success(`Processed ${data.processedCount} pending billings`);
      
      // Refresh data
      await fetchBillings();
      await fetchStats();
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process pending billings');
    } finally {
      setTriggeringBilling(null);
    }
  };

  const processTodaysBilling = async () => {
    setTriggeringBilling('today');
    try {
      const response = await fetch('/api/admin/sms/billing/today', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process today\'s billing');
      }

      const data = await response.json();
      toast.success(
        `Today's billing processed: ${data.summary.billingsCreated} created, ` +
        `${data.summary.totalMessagesProcessed} messages, $${data.summary.totalCostProcessed}`
      );
      
      // Refresh data
      await fetchBillings();
      await fetchStats();
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process today\'s billing');
    } finally {
      setTriggeringBilling(null);
    }
  };

  const checkOverallMessages = async () => {
    setTriggeringBilling('check');
    try {
      const response = await fetch('/api/admin/sms/billing/check-messages?days=30');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to check messages');
      }

      const data = await response.json();
      
      // Show concise summary in toast
      const unbilled = data.unbilledAnalysis;
      const total = data.messageStats;
      
      toast.success(
        `Messages analyzed: ${total.total} total, ${unbilled.unbilledMessages} unbilled ($${unbilled.unbilledCost})`
      );
      
      // Log detailed breakdown to console for admin review
      console.log('📊 Detailed SMS Analysis:', data);
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to check messages');
    } finally {
      setTriggeringBilling(null);
    }
  };

  const processCampaignBilling = async () => {
    setTriggeringBilling('campaign');
    try {
      const response = await fetch('/api/admin/sms/billing/process-campaigns', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process campaign billing');
      }

      const data = await response.json();
      toast.success(`Processed ${data.processedCount} completed campaigns for billing`);
      
      // Refresh data
      await fetchBillings();
      await fetchStats();
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process campaign billing');
    } finally {
      setTriggeringBilling(null);
    }
  };

  const saveGlobalSettings = async () => {
    setSaving(true);
    try {
      const method = globalSettings._id ? 'PUT' : 'POST';
      // Transform client data to match API schema
      const apiData = {
        userId: null, // null for global settings
        billingFrequency: globalSettings.billingFrequency,
        maxAmount: globalSettings.maxAmount,
        maxMessages: globalSettings.maxMessages,
        autoProcessing: globalSettings.autoProcessing,
        notificationEnabled: globalSettings.notificationEnabled,
        notificationThreshold: globalSettings.notificationThreshold,
        billingDayOfWeek: globalSettings.billingDayOfWeek,
        billingDayOfMonth: globalSettings.billingDayOfMonth,
      };
      
      const response = await fetch('/api/admin/sms/billing-settings', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }

      const data = await response.json();
      setGlobalSettings(data.settings);
      toast.success('Global settings saved successfully');
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const saveUserSettings = async (settings: SmsBillingSettings) => {
    setSaving(true);
    try {
      const method = settings._id ? 'PUT' : 'POST';
      const response = await fetch('/api/admin/sms/billing-settings', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save user settings');
      }

      toast.success('User settings saved successfully');
      await fetchSettings(); // Refresh settings
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save user settings');
    } finally {
      setSaving(false);
    }
  };

  const addUserSettings = async () => {
    if (!selectedUser) {
      toast.error('Please select a user');
      return;
    }

    const settings = {
      ...newUserSettings,
      userId: selectedUser,
    };

    await saveUserSettings(settings);
    
    // Reset form
    setSelectedUser('');
    setNewUserSettings({
      isGlobal: false,
      billingFrequency: 'daily',
      maxAmount: 100,
      maxMessages: 1000,
      autoProcessing: true,
      notificationEnabled: true,
      notificationThreshold: 80,
      isActive: true,
    });
  };

  const deleteUserSettings = async (settingsId: string) => {
    try {
      const response = await fetch(`/api/admin/sms/billing-settings?id=${settingsId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete settings');
      }

      toast.success('User settings deleted successfully');
      await fetchSettings(); // Refresh settings
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete settings');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchBillings(), fetchStats(), fetchSettings(), fetchUsers()]);
      setLoading(false);
    };
    
    loadData();
  }, [currentPage, statusFilter, userFilter]);

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };

    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const SettingsForm = ({ 
    settings, 
    onChange, 
    onSave, 
    title, 
    description 
  }: {
    settings: SmsBillingSettings;
    onChange: (settings: SmsBillingSettings) => void;
    onSave: () => void;
    title: string;
    description: string;
  }) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Billing Frequency */}
        <div className="space-y-2">
          <Label>Billing Frequency</Label>
          <Select 
            value={settings.billingFrequency} 
            onValueChange={(value: 'daily' | 'weekly' | 'monthly' | 'threshold') => 
              onChange({ ...settings, billingFrequency: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="threshold">Threshold-based</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Threshold Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Max Amount ($)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={settings.maxAmount}
              onChange={(e) => onChange({ 
                ...settings, 
                maxAmount: e.target.value ? parseFloat(e.target.value) : 0
              })}
              placeholder="e.g., 100.00"
            />
          </div>
          <div className="space-y-2">
            <Label>Max Messages</Label>
            <Input
              type="number"
              min="0"
              value={settings.maxMessages}
              onChange={(e) => onChange({ 
                ...settings, 
                maxMessages: e.target.value ? parseInt(e.target.value) : 0
              })}
              placeholder="e.g., 1000"
            />
          </div>
        </div>

        {/* Processing Options */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Process</Label>
              <div className="text-sm text-gray-500">
                Automatically charge via Sippy when billing is created
              </div>
            </div>
            <Switch
              checked={settings.autoProcessing}
              onCheckedChange={(checked) => onChange({ ...settings, autoProcessing: checked })}
            />
          </div>
        </div>

        {/* Notification Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notify User</Label>
              <div className="text-sm text-gray-500">
                Send notifications to the user about billing
              </div>
            </div>
            <Switch
              checked={settings.notificationEnabled}
              onCheckedChange={(checked) => onChange({ ...settings, notificationEnabled: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label>Notification Threshold ($)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={settings.notificationThreshold}
              onChange={(e) => onChange({ 
                ...settings, 
                notificationThreshold: e.target.value ? parseFloat(e.target.value) : 0
              })}
              placeholder="Notify if bill exceeds this amount"
            />
          </div>
        </div>

        {/* Active Status */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Active</Label>
            <div className="text-sm text-gray-500">
              Whether these settings are currently active
            </div>
          </div>
          <Switch
            checked={settings.isActive}
            onCheckedChange={(checked) => onChange({ ...settings, isActive: checked })}
          />
        </div>

        <Button onClick={onSave} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );

  if (loading && billings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="management">
            <CreditCard className="h-4 w-4 mr-2" />
            Billing Management
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Billing Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="space-y-6">
          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                fetchBillings();
                fetchStats();
              }}
              disabled={loading || triggeringBilling !== null}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={triggeringBilling !== null}>
                  {triggeringBilling ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {triggeringBilling ? `Processing ${triggeringBilling}...` : 'Trigger Billing'}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Manual Billing Triggers</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => triggerCronJob('daily')}
                  disabled={triggeringBilling !== null}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  <div className="flex flex-col">
                    <span>Daily Billing</span>
                    <span className="text-xs text-muted-foreground">Process yesterday's usage</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => triggerCronJob('weekly')}
                  disabled={triggeringBilling !== null}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  <div className="flex flex-col">
                    <span>Weekly Billing</span>
                    <span className="text-xs text-muted-foreground">Process last week's usage</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => triggerCronJob('monthly')}
                  disabled={triggeringBilling !== null}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  <div className="flex flex-col">
                    <span>Monthly Billing</span>
                    <span className="text-xs text-muted-foreground">Process last month's usage</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => processTodaysBilling()}
                  disabled={triggeringBilling !== null}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  <div className="flex flex-col">
                    <span>Process Today</span>
                    <span className="text-xs text-muted-foreground">Process today's messages</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => processAllPendingBillings()}
                  disabled={triggeringBilling !== null}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  <div className="flex flex-col">
                    <span>Process Pending</span>
                    <span className="text-xs text-muted-foreground">Charge all pending billings</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => checkOverallMessages()}
                  disabled={triggeringBilling !== null}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  <div className="flex flex-col">
                    <span>Check Messages</span>
                    <span className="text-xs text-muted-foreground">Analyze overall message stats</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => processCampaignBilling()}
                  disabled={triggeringBilling !== null}
                >
                  <Megaphone className="h-4 w-4 mr-2" />
                  <div className="flex flex-col">
                    <span>Process Campaign Billing</span>
                    <span className="text-xs text-muted-foreground">Charge completed campaigns</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Pending Billings Alert */}
          {stats && stats.pending.count > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-800">
                      {stats.pending.count} pending billing{stats.pending.count !== 1 ? 's' : ''} ready for processing
                    </p>
                    <p className="text-sm text-yellow-600">
                      Total: {formatCurrency(stats.pending.totalCost)} • {stats.pending.totalMessages} messages
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pending.count}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(stats.pending.totalCost)} • {stats.pending.totalMessages} msgs
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Paid</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.paid.count}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(stats.paid.totalCost)} • {stats.paid.totalMessages} msgs
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Failed</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.failed.count}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(stats.failed.totalCost)} • {stats.failed.totalMessages} msgs
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.paid.totalCost)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total paid
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Filter by user email..."
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="max-w-sm"
                />

                <Button 
                  variant="outline" 
                  onClick={() => {
                    setStatusFilter('');
                    setUserFilter('');
                    setCurrentPage(1);
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Billing Records Table */}
          <Card>
            <CardHeader>
              <CardTitle>Billing Records</CardTitle>
              <CardDescription>
                SMS billing records and their processing status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billings.map((billing) => (
                    <TableRow key={billing._id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{billing.user.email}</div>
                          {billing.user.name && (
                            <div className="text-sm text-gray-500">{billing.user.name}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(billing.billingPeriodStart).toLocaleDateString()}</div>
                          <div className="text-gray-500">to {new Date(billing.billingPeriodEnd).toLocaleDateString()}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{billing.totalMessages} total</div>
                          <div className="text-green-600">{billing.successfulMessages} sent</div>
                          {billing.failedMessages > 0 && (
                            <div className="text-red-600">{billing.failedMessages} failed</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(billing.totalCost, billing.currency)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(billing.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(billing.billingDate)}</div>
                          {billing.paidDate && (
                            <div className="text-green-600">Paid: {formatDate(billing.paidDate)}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {billing.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => processBilling(billing._id)}
                              disabled={processing === billing._id}
                            >
                              {processing === billing._id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                'Process'
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedBilling(billing)}
                          >
                            Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="py-2 px-4">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing Details Modal */}
          {selectedBilling && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Billing Details</h2>
                  <Button variant="outline" onClick={() => setSelectedBilling(null)}>
                    Close
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">User</label>
                      <div>{selectedBilling.user.email}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <div>{getStatusBadge(selectedBilling.status)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Total Amount</label>
                      <div className="text-lg font-medium">
                        {formatCurrency(selectedBilling.totalCost, selectedBilling.currency)}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Messages</label>
                      <div>{selectedBilling.totalMessages} total</div>
                    </div>
                  </div>

                  {selectedBilling.messageBreakdown && selectedBilling.messageBreakdown.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2">Message Breakdown by Destination</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Country</TableHead>
                            <TableHead>Prefix</TableHead>
                            <TableHead>Messages</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead>Cost</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedBilling.messageBreakdown.map((breakdown, index) => (
                            <TableRow key={index}>
                              <TableCell>{breakdown.country}</TableCell>
                              <TableCell>{breakdown.prefix}</TableCell>
                              <TableCell>{breakdown.messageCount}</TableCell>
                              <TableCell>{formatCurrency(breakdown.rate)}</TableCell>
                              <TableCell>{formatCurrency(breakdown.totalCost)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {selectedBilling.failureReason && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Failure Reason</label>
                      <div className="text-red-600">{selectedBilling.failureReason}</div>
                    </div>
                  )}

                  {selectedBilling.sippyTransactionId && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Sippy Transaction ID</label>
                      <div className="font-mono text-sm">{selectedBilling.sippyTransactionId}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Tabs defaultValue="global" className="w-full">
            <TabsList>
              <TabsTrigger value="global">
                <Settings className="h-4 w-4 mr-2" />
                Global Settings
              </TabsTrigger>
              <TabsTrigger value="users">
                <Users className="h-4 w-4 mr-2" />
                User Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="global" className="space-y-6">
              <SettingsForm
                settings={globalSettings}
                onChange={setGlobalSettings}
                onSave={saveGlobalSettings}
                title="Global SMS Billing Settings"
                description="Default settings that apply to all users unless overridden"
              />
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              {/* Add New User Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Add User-Specific Settings</CardTitle>
                  <CardDescription>
                    Override global settings for specific users
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select User</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter(user => !userSettings.some(s => s.userId === user._id))
                          .map(user => (
                            <SelectItem key={user._id} value={user._id}>
                              {user.email} {user.name && `(${user.name})`}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedUser && (
                    <SettingsForm
                      settings={newUserSettings}
                      onChange={setNewUserSettings}
                      onSave={addUserSettings}
                      title="User Settings"
                      description="Settings for the selected user"
                    />
                  )}
                </CardContent>
              </Card>

              {/* Existing User Settings */}
              {userSettings.map((settings) => {
                const user = users.find(u => u._id === settings.userId);
                return (
                  <Card key={settings._id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle>
                            {user?.email || 'Unknown User'}
                            {user?.name && ` (${user.name})`}
                          </CardTitle>
                          <CardDescription>
                            User-specific billing settings
                          </CardDescription>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => settings._id && deleteUserSettings(settings._id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <SettingsForm
                        settings={settings}
                        onChange={(updatedSettings) => {
                          setUserSettings(prev => 
                            prev.map(s => s._id === settings._id ? updatedSettings : s)
                          );
                        }}
                        onSave={() => saveUserSettings(settings)}
                        title=""
                        description=""
                      />
                    </CardContent>
                  </Card>
                );
              })}

              {userSettings.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No user-specific settings configured yet.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
} 