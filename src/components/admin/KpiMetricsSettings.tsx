'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DollarSign, 
  Activity, 
  Clock, 
  Timer, 
  Settings, 
  RotateCcw, 
  Save, 
  Bell,
  Info,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useKpiSettings } from '@/hooks/useKpiSettings';
import { cn } from '@/lib/utils';

interface FormData {
  costThresholds: {
    low: number;
    medium: number;
  };
  asrThresholds: {
    critical: number;
    poor: number;
    fair: number;
    good: number;
  };
  acdThresholds: {
    short: number;
    normal: number;
    long: number;
  };
  totalMinutesThresholds: {
    light: number;
    moderate: number;
    heavy: number;
  };
  currency: string;
  timezone: string;
  refreshInterval: number;
  enableNotifications: boolean;
  notificationThresholds: {
    highCostAlert: boolean;
    lowAsrAlert: boolean;
    extremeUsageAlert: boolean;
  };
}

const currencies = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'CAD', label: 'Canadian Dollar (C$)' },
  { value: 'AUD', label: 'Australian Dollar (A$)' },
  { value: 'JPY', label: 'Japanese Yen (¥)' },
  { value: 'CHF', label: 'Swiss Franc (CHF)' },
  { value: 'CNY', label: 'Chinese Yuan (¥)' }
];

const timezones = [
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney'
];

export function KpiMetricsSettings() {
  const { settings, isLoading, error, updateSettings, resetToDefaults } = useKpiSettings();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData({
        costThresholds: { ...settings.costThresholds },
        asrThresholds: { ...settings.asrThresholds },
        acdThresholds: { ...settings.acdThresholds },
        totalMinutesThresholds: { ...settings.totalMinutesThresholds },
        currency: settings.currency,
        timezone: settings.timezone,
        refreshInterval: settings.refreshInterval,
        enableNotifications: settings.enableNotifications,
        notificationThresholds: { ...settings.notificationThresholds }
      });
      setHasChanges(false);
    }
  }, [settings]);

  const handleInputChange = (section: keyof FormData, field: string, value: string | number | boolean) => {
    if (!formData) return;

    setFormData(prev => {
      if (!prev) return null;
      
      if (typeof prev[section] === 'object' && prev[section] !== null) {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: value
          }
        };
      } else {
        return {
          ...prev,
          [section]: value
        };
      }
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!formData) return;

    setIsSaving(true);
    const success = await updateSettings(formData);
    if (success) {
      setHasChanges(false);
    }
    setIsSaving(false);
  };

  const handleReset = async () => {
    const success = await resetToDefaults();
    if (success) {
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading KPI settings...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load KPI settings: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!formData) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          No KPI settings found. Default settings will be created automatically.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">KPI Metrics Configuration</h2>
          <p className="text-muted-foreground">
            Configure thresholds and limits for dashboard KPI widgets
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {hasChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-200">
              Unsaved Changes
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSaving}
            className="flex items-center space-x-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset to Defaults</span>
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex items-center space-x-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </div>

      {/* Cost of Day Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span>Cost of Day Thresholds</span>
          </CardTitle>
          <CardDescription>
            Configure when to consider daily costs as low, medium, or high
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost-low">Low Cost Threshold</Label>
              <Input
                id="cost-low"
                type="number"
                step="0.01"
                min="0"
                value={formData.costThresholds.low}
                onChange={(e) => handleInputChange('costThresholds', 'low', parseFloat(e.target.value) || 0)}
                placeholder="1.00"
              />
              <p className="text-xs text-muted-foreground">
                Below this amount = Low Cost (Green)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost-medium">Medium Cost Threshold</Label>
              <Input
                id="cost-medium"
                type="number"
                step="0.01"
                min="0"
                value={formData.costThresholds.medium}
                onChange={(e) => handleInputChange('costThresholds', 'medium', parseFloat(e.target.value) || 0)}
                placeholder="10.00"
              />
              <p className="text-xs text-muted-foreground">
                Above this amount = High Cost (Red)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              Range: {formData.costThresholds.low} - {formData.costThresholds.medium} = Medium Cost (Yellow)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ASR Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <span>ASR (Success Rate) Thresholds</span>
          </CardTitle>
          <CardDescription>
            Configure success rate percentages for different performance levels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asr-critical">Critical (%)</Label>
              <Input
                id="asr-critical"
                type="number"
                min="0"
                max="100"
                value={formData.asrThresholds.critical}
                onChange={(e) => handleInputChange('asrThresholds', 'critical', parseInt(e.target.value) || 0)}
                placeholder="50"
              />
              <Badge variant="destructive" className="text-xs">Below = Critical</Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="asr-poor">Poor (%)</Label>
              <Input
                id="asr-poor"
                type="number"
                min="0"
                max="100"
                value={formData.asrThresholds.poor}
                onChange={(e) => handleInputChange('asrThresholds', 'poor', parseInt(e.target.value) || 0)}
                placeholder="70"
              />
              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">Up to = Poor</Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="asr-fair">Fair (%)</Label>
              <Input
                id="asr-fair"
                type="number"
                min="0"
                max="100"
                value={formData.asrThresholds.fair}
                onChange={(e) => handleInputChange('asrThresholds', 'fair', parseInt(e.target.value) || 0)}
                placeholder="85"
              />
              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">Up to = Fair</Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="asr-good">Good (%)</Label>
              <Input
                id="asr-good"
                type="number"
                min="0"
                max="100"
                value={formData.asrThresholds.good}
                onChange={(e) => handleInputChange('asrThresholds', 'good', parseInt(e.target.value) || 0)}
                placeholder="95"
              />
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Above = Excellent</Badge>
            </div>
          </div>
          <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              Performance levels: Critical &lt; {formData.asrThresholds.critical}% &lt; Poor &lt; {formData.asrThresholds.poor}% &lt; Fair &lt; {formData.asrThresholds.fair}% &lt; Good &lt; {formData.asrThresholds.good}% &lt; Excellent
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ACD Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-purple-600" />
            <span>ACD (Average Call Duration) Thresholds</span>
          </CardTitle>
          <CardDescription>
            Configure call duration thresholds in seconds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="acd-short">Short Calls (seconds)</Label>
              <Input
                id="acd-short"
                type="number"
                min="0"
                value={formData.acdThresholds.short}
                onChange={(e) => handleInputChange('acdThresholds', 'short', parseInt(e.target.value) || 0)}
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground">
                Below this = Quick Calls (Orange)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="acd-normal">Normal Calls (seconds)</Label>
              <Input
                id="acd-normal"
                type="number"
                min="0"
                value={formData.acdThresholds.normal}
                onChange={(e) => handleInputChange('acdThresholds', 'normal', parseInt(e.target.value) || 0)}
                placeholder="120"
              />
              <p className="text-xs text-muted-foreground">
                Up to this = Optimal (Green)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="acd-long">Long Calls (seconds)</Label>
              <Input
                id="acd-long"
                type="number"
                min="0"
                value={formData.acdThresholds.long}
                onChange={(e) => handleInputChange('acdThresholds', 'long', parseInt(e.target.value) || 0)}
                placeholder="300"
              />
              <p className="text-xs text-muted-foreground">
                Above this = Very Long (Purple)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              Duration ranges: Quick &lt; {formData.acdThresholds.short}s &lt; Optimal &lt; {formData.acdThresholds.normal}s &lt; Extended &lt; {formData.acdThresholds.long}s &lt; Very Long
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Total Minutes Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Timer className="h-5 w-5 text-teal-600" />
            <span>Total Minutes Usage Thresholds</span>
          </CardTitle>
          <CardDescription>
            Configure daily usage thresholds in minutes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minutes-light">Light Usage (minutes)</Label>
              <Input
                id="minutes-light"
                type="number"
                min="0"
                value={formData.totalMinutesThresholds.light}
                onChange={(e) => handleInputChange('totalMinutesThresholds', 'light', parseInt(e.target.value) || 0)}
                placeholder="60"
              />
              <p className="text-xs text-muted-foreground">
                Below this = Light Usage (Green)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minutes-moderate">Moderate Usage (minutes)</Label>
              <Input
                id="minutes-moderate"
                type="number"
                min="0"
                value={formData.totalMinutesThresholds.moderate}
                onChange={(e) => handleInputChange('totalMinutesThresholds', 'moderate', parseInt(e.target.value) || 0)}
                placeholder="300"
              />
              <p className="text-xs text-muted-foreground">
                Up to this = Moderate Usage (Blue)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minutes-heavy">Heavy Usage (minutes)</Label>
              <Input
                id="minutes-heavy"
                type="number"
                min="0"
                value={formData.totalMinutesThresholds.heavy}
                onChange={(e) => handleInputChange('totalMinutesThresholds', 'heavy', parseInt(e.target.value) || 0)}
                placeholder="600"
              />
              <p className="text-xs text-muted-foreground">
                Above this = Very Heavy Usage (Red)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              Usage levels: Light &lt; {formData.totalMinutesThresholds.light}m &lt; Moderate &lt; {formData.totalMinutesThresholds.moderate}m &lt; Heavy &lt; {formData.totalMinutesThresholds.heavy}m &lt; Very Heavy
            </span>
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-gray-600" />
            <span>General Settings</span>
          </CardTitle>
          <CardDescription>
            Configure currency, timezone, and refresh settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => handleInputChange('currency', '', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => handleInputChange('timezone', '', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="refresh-interval">Auto-refresh Interval (seconds)</Label>
              <Input
                id="refresh-interval"
                type="number"
                min="30"
                max="3600"
                value={formData.refreshInterval}
                onChange={(e) => handleInputChange('refreshInterval', '', parseInt(e.target.value) || 300)}
                placeholder="300"
              />
              <p className="text-xs text-muted-foreground">
                Between 30 and 3600 seconds
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-yellow-600" />
            <span>Notification Settings</span>
          </CardTitle>
          <CardDescription>
            Configure alerts and notifications for KPI thresholds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enable-notifications">Enable Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Turn on/off all KPI-related notifications
              </p>
            </div>
            <Switch
              id="enable-notifications"
              checked={formData.enableNotifications}
              onCheckedChange={(checked) => handleInputChange('enableNotifications', '', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Alert Types</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="high-cost-alert">High Cost Alert</Label>
                  <p className="text-xs text-muted-foreground">
                    Alert when daily costs exceed the high threshold
                  </p>
                </div>
                <Switch
                  id="high-cost-alert"
                  checked={formData.notificationThresholds.highCostAlert}
                  onCheckedChange={(checked) => handleInputChange('notificationThresholds', 'highCostAlert', checked)}
                  disabled={!formData.enableNotifications}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="low-asr-alert">Low ASR Alert</Label>
                  <p className="text-xs text-muted-foreground">
                    Alert when success rate falls below fair threshold
                  </p>
                </div>
                <Switch
                  id="low-asr-alert"
                  checked={formData.notificationThresholds.lowAsrAlert}
                  onCheckedChange={(checked) => handleInputChange('notificationThresholds', 'lowAsrAlert', checked)}
                  disabled={!formData.enableNotifications}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="extreme-usage-alert">Extreme Usage Alert</Label>
                  <p className="text-xs text-muted-foreground">
                    Alert when daily minutes exceed very heavy threshold
                  </p>
                </div>
                <Switch
                  id="extreme-usage-alert"
                  checked={formData.notificationThresholds.extremeUsageAlert}
                  onCheckedChange={(checked) => handleInputChange('notificationThresholds', 'extremeUsageAlert', checked)}
                  disabled={!formData.enableNotifications}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isSaving}
          className="flex items-center space-x-2"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Reset to Defaults</span>
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="flex items-center space-x-2"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
        </Button>
      </div>

      {/* Test Alerts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <span>Test Alert System</span>
          </CardTitle>
          <CardDescription>
            Test the KPI alert system with current data or forced alert conditions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TestAlertButton 
              type="natural" 
              title="Test with Current Data"
              description="Test alerts using your actual current KPI data"
              icon={<Activity className="h-4 w-4" />}
            />
            <TestAlertButton 
              type="forced" 
              title="Force Test Alerts"
              description="Force trigger all alert types for testing email delivery"
              icon={<AlertTriangle className="h-4 w-4" />}
            />
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Testing Notes:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Natural testing uses your actual CDR data and current thresholds</li>
                  <li>Forced testing temporarily modifies values to trigger all alert types</li>
                  <li>Alerts are only sent if notifications are enabled and SMTP is configured</li>
                  <li>Each alert type is sent only once per day to prevent spam</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface TestAlertButtonProps {
  type: 'natural' | 'forced';
  title: string;
  description: string;
  icon: React.ReactNode;
}

function TestAlertButton({ type, title, description, icon }: TestAlertButtonProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/admin/kpi-alerts/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          forceAlert: type === 'forced'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult(`✅ ${data.message}`);
        console.log('Alert test result:', data);
      } else {
        setTestResult(`❌ ${data.error || 'Test failed'}`);
      }
    } catch (error) {
      console.error('Error testing alerts:', error);
      setTestResult('❌ Failed to test alerts');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start space-x-3">
        <div className={cn(
          "p-2 rounded-full",
          type === 'natural' ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
        )}>
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-sm">{title}</h4>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
      
      <Button
        onClick={handleTest}
        disabled={isTesting}
        size="sm"
        variant={type === 'natural' ? 'default' : 'destructive'}
        className="w-full"
      >
        {isTesting ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin mr-2" />
            Testing...
          </>
        ) : (
          <>
            {icon}
            <span className="ml-2">Run Test</span>
          </>
        )}
      </Button>
      
      {testResult && (
        <div className={cn(
          "text-xs p-2 rounded border",
          testResult.startsWith('✅') 
            ? "bg-green-50 text-green-800 border-green-200" 
            : "bg-red-50 text-red-800 border-red-200"
        )}>
          {testResult}
        </div>
      )}
    </div>
  );
} 