'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Bell, User } from 'lucide-react';
import { toast } from 'sonner';
import { UserNotificationSettings } from '@/models/UserNotificationSettings';

interface UserNotificationSettingsProps {
  userId: string;
  userName: string;
  userEmail: string;
}

export function UserNotificationSettingsComponent({ 
  userId, 
  userName, 
  userEmail 
}: UserNotificationSettingsProps) {
  const [settings, setSettings] = useState<Partial<UserNotificationSettings>>({
    lowBalanceThreshold: 10.0000,
    zeroBalanceThreshold: 0.0000,
    negativeBalanceThreshold: -0.0001,
    enableLowBalanceNotifications: true,
    enableZeroBalanceNotifications: true,
    enableNegativeBalanceNotifications: true,
    notificationFrequencyHours: 24,
    currency: 'EUR'
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [userId]);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/${userId}/notification-settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings({
          lowBalanceThreshold: data.lowBalanceThreshold || 10.0000,
          zeroBalanceThreshold: data.zeroBalanceThreshold || 0.0000,
          negativeBalanceThreshold: data.negativeBalanceThreshold || -0.0001,
          enableLowBalanceNotifications: data.enableLowBalanceNotifications ?? true,
          enableZeroBalanceNotifications: data.enableZeroBalanceNotifications ?? true,
          enableNegativeBalanceNotifications: data.enableNegativeBalanceNotifications ?? true,
          notificationFrequencyHours: data.notificationFrequencyHours || 24,
          currency: data.currency || 'EUR'
        });
      }
    } catch (error) {
      console.error('Error fetching user notification settings:', error);
      toast.error('Failed to load notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/${userId}/notification-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success('Notification settings saved successfully');
        fetchSettings(); // Refresh to get updated data
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save notification settings');
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Failed to save notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof UserNotificationSettings, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading && !settings.lowBalanceThreshold) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="pb-4 border-b">
        <h3 className="text-lg font-medium">Notification Settings for {userName}</h3>
        <p className="text-sm text-muted-foreground">
          Configure notification thresholds and preferences for {userEmail}
        </p>
      </div>

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
              Negative value that triggers critical alerts (e.g., -0.0001)
            </p>
          </div>
        )}
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
    </div>
  );
} 