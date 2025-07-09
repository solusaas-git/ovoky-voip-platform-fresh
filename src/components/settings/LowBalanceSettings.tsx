'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, AlertTriangle, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { ILowBalanceSettings } from '@/models/NotificationLog';

export function LowBalanceSettings() {
  const [settings, setSettings] = useState<Partial<ILowBalanceSettings>>({
    lowBalanceThreshold: 10.0000,
    zeroBalanceThreshold: 0.0000,
    negativeBalanceThreshold: -1.0000,
    enableLowBalanceNotifications: true,
    enableZeroBalanceNotifications: true,
    enableNegativeBalanceNotifications: true,
    notificationFrequencyHours: 24
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings/low-balance');
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setSettings({
            lowBalanceThreshold: data.lowBalanceThreshold || 10.0000,
            zeroBalanceThreshold: data.zeroBalanceThreshold || 0.0000,
            negativeBalanceThreshold: data.negativeBalanceThreshold || -1.0000,
            enableLowBalanceNotifications: data.enableLowBalanceNotifications || false,
            enableZeroBalanceNotifications: data.enableZeroBalanceNotifications || false,
            enableNegativeBalanceNotifications: data.enableNegativeBalanceNotifications || false,
            notificationFrequencyHours: data.notificationFrequencyHours || 24
          });
        } else {
          // If no data is returned, keep the default values
          setSettings({
            lowBalanceThreshold: 10.0000,
            zeroBalanceThreshold: 0.0000,
            negativeBalanceThreshold: -1.0000,
            enableLowBalanceNotifications: true,
            enableZeroBalanceNotifications: true,
            enableNegativeBalanceNotifications: true,
            notificationFrequencyHours: 24
          });
        }
      }
    } catch (error) {
      console.error('Error fetching low balance settings:', error);
      toast.error('Failed to load low balance settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings/low-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success('Low balance settings saved successfully');
        fetchSettings(); // Refresh to get updated data
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save low balance settings');
      }
    } catch (error) {
      console.error('Error saving low balance settings:', error);
      toast.error('Failed to save low balance settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof ILowBalanceSettings, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading && !settings.lowBalanceThreshold) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bell className="h-5 w-5" />
          <span>Low Balance Notifications</span>
        </CardTitle>
        <CardDescription>
          Configure thresholds and settings for automatic balance notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Frequency */}
        <div className="space-y-2">
          <Label htmlFor="frequency">Notification Frequency (hours)</Label>
          <Input
            id="frequency"
            type="number"
            min="1"
            max="168"
            value={settings.notificationFrequencyHours}
            onChange={(e) => handleInputChange('notificationFrequencyHours', parseInt(e.target.value))}
          />
          <p className="text-sm text-muted-foreground">
            How often to send notifications for the same condition (1-168 hours)
          </p>
        </div>

        {/* Low Balance Notifications */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">Low Balance Alert</Label>
              <p className="text-sm text-muted-foreground">
                Send notifications when balance falls below threshold
              </p>
            </div>
            <Switch
              checked={settings.enableLowBalanceNotifications}
              onCheckedChange={(checked: boolean) => handleInputChange('enableLowBalanceNotifications', checked)}
            />
          </div>
          
          {settings.enableLowBalanceNotifications && (
            <div className="space-y-2">
              <Label htmlFor="lowThreshold">Low Balance Threshold (EUR)</Label>
              <Input
                id="lowThreshold"
                type="number"
                step="0.0001"
                min="0"
                value={settings.lowBalanceThreshold}
                onChange={(e) => handleInputChange('lowBalanceThreshold', parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Send alert when balance drops below this amount
              </p>
            </div>
          )}
        </div>

        {/* Zero Balance Notifications */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">Zero Balance Alert</Label>
              <p className="text-sm text-muted-foreground">
                Send notifications when balance reaches zero
              </p>
            </div>
            <Switch
              checked={settings.enableZeroBalanceNotifications}
              onCheckedChange={(checked: boolean) => handleInputChange('enableZeroBalanceNotifications', checked)}
            />
          </div>
          
          {settings.enableZeroBalanceNotifications && (
            <div className="space-y-2">
              <Label htmlFor="zeroThreshold">Zero Balance Threshold (EUR)</Label>
              <Input
                id="zeroThreshold"
                type="number"
                step="0.0001"
                value={settings.zeroBalanceThreshold}
                onChange={(e) => handleInputChange('zeroBalanceThreshold', parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Usually set to 0.0000, but can be adjusted for early warning
              </p>
            </div>
          )}
        </div>

        {/* Negative Balance Notifications */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">Negative Balance Alert</Label>
              <p className="text-sm text-muted-foreground">
                Send critical notifications when balance goes negative
              </p>
            </div>
            <Switch
              checked={settings.enableNegativeBalanceNotifications}
              onCheckedChange={(checked: boolean) => handleInputChange('enableNegativeBalanceNotifications', checked)}
            />
          </div>
          
          {settings.enableNegativeBalanceNotifications && (
            <div className="space-y-2">
              <Label htmlFor="negativeThreshold">Negative Balance Threshold (EUR)</Label>
              <Input
                id="negativeThreshold"
                type="number"
                step="0.0001"
                value={settings.negativeBalanceThreshold}
                onChange={(e) => handleInputChange('negativeBalanceThreshold', parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Negative value that triggers critical alerts (e.g., -1.0000)
              </p>
            </div>
          )}
        </div>

        {/* Warning Note */}
        <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-1">Important Notes:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>SMTP must be configured and enabled for notifications to work</li>
                <li>Notifications are sent to the primary email address of each account</li>
                <li>Frequency setting prevents spam by limiting repeated notifications</li>
                <li>All thresholds are inclusive (balance ≤ threshold triggers notification)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 