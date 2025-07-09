'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface SmsSettings {
  enabled: boolean;
  defaultRetryAttempts: number;
  defaultRetryDelay: number;
  maxMessageLength: number;
  allowedSenderIdTypes: string[];
  requireSenderIdApproval: boolean;
  globalRateLimit: {
    messagesPerSecond: number;
    messagesPerMinute: number;
    messagesPerHour: number;
  };
  keywordBlacklist: string[];
  enableDeliveryReports: boolean;
  deliveryReportWebhook: string;
  enableLogging: boolean;
  logRetentionDays: number;
}

export function AdminSmsSettings() {
  const { t } = useTranslations();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SmsSettings>({
    enabled: true,
    defaultRetryAttempts: 3,
    defaultRetryDelay: 60,
    maxMessageLength: 160,
    allowedSenderIdTypes: ['alphanumeric', 'numeric'],
    requireSenderIdApproval: true,
    globalRateLimit: {
      messagesPerSecond: 100,
      messagesPerMinute: 1000,
      messagesPerHour: 10000
    },
    keywordBlacklist: [],
    enableDeliveryReports: true,
    deliveryReportWebhook: '',
    enableLogging: true,
    logRetentionDays: 30
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/sms/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings({ ...settings, ...data.settings });
      } else {
        toast.error('Failed to load SMS settings');
      }
    } catch (error) {
      console.error('Failed to load SMS settings:', error);
      toast.error('Failed to load SMS settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/sms/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        toast.success('SMS settings updated successfully');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update SMS settings');
      }
    } catch (error) {
      console.error('Failed to update SMS settings:', error);
      toast.error('Failed to update SMS settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      setSettings({
        enabled: true,
        defaultRetryAttempts: 3,
        defaultRetryDelay: 60,
        maxMessageLength: 160,
        allowedSenderIdTypes: ['alphanumeric', 'numeric'],
        requireSenderIdApproval: true,
        globalRateLimit: {
          messagesPerSecond: 100,
          messagesPerMinute: 1000,
          messagesPerHour: 10000
        },
        keywordBlacklist: [],
        enableDeliveryReports: true,
        deliveryReportWebhook: '',
        enableLogging: true,
        logRetentionDays: 30
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading SMS settings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                SMS System Settings
              </CardTitle>
              <CardDescription>
                Configure global SMS system settings and behavior
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* General Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">General Settings</h3>
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enabled">Enable SMS System</Label>
                  <p className="text-sm text-muted-foreground">
                    Master switch for the entire SMS system
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={settings.enabled}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, enabled: checked })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxMessageLength">Max Message Length</Label>
                  <Input
                    id="maxMessageLength"
                    type="number"
                    value={settings.maxMessageLength}
                    onChange={(e) => 
                      setSettings({ ...settings, maxMessageLength: parseInt(e.target.value) || 160 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultRetryAttempts">Default Retry Attempts</Label>
                  <Input
                    id="defaultRetryAttempts"
                    type="number"
                    value={settings.defaultRetryAttempts}
                    onChange={(e) => 
                      setSettings({ ...settings, defaultRetryAttempts: parseInt(e.target.value) || 3 })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Rate Limits */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Global Rate Limits</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="perSecond">Messages Per Second</Label>
                <Input
                  id="perSecond"
                  type="number"
                  value={settings.globalRateLimit.messagesPerSecond}
                  onChange={(e) => 
                    setSettings({ 
                      ...settings, 
                      globalRateLimit: { 
                        ...settings.globalRateLimit, 
                        messagesPerSecond: parseInt(e.target.value) || 0 
                      }
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="perMinute">Messages Per Minute</Label>
                <Input
                  id="perMinute"
                  type="number"
                  value={settings.globalRateLimit.messagesPerMinute}
                  onChange={(e) => 
                    setSettings({ 
                      ...settings, 
                      globalRateLimit: { 
                        ...settings.globalRateLimit, 
                        messagesPerMinute: parseInt(e.target.value) || 0 
                      }
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="perHour">Messages Per Hour</Label>
                <Input
                  id="perHour"
                  type="number"
                  value={settings.globalRateLimit.messagesPerHour}
                  onChange={(e) => 
                    setSettings({ 
                      ...settings, 
                      globalRateLimit: { 
                        ...settings.globalRateLimit, 
                        messagesPerHour: parseInt(e.target.value) || 0 
                      }
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Sender ID Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Sender ID Settings</h3>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="requireApproval">Require Sender ID Approval</Label>
                <p className="text-sm text-muted-foreground">
                  All sender ID requests must be approved by an admin
                </p>
              </div>
              <Switch
                id="requireApproval"
                checked={settings.requireSenderIdApproval}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, requireSenderIdApproval: checked })
                }
              />
            </div>
          </div>

          {/* Logging & Monitoring */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Logging & Monitoring</h3>
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableLogging">Enable SMS Logging</Label>
                  <p className="text-sm text-muted-foreground">
                    Log all SMS messages for audit and debugging
                  </p>
                </div>
                <Switch
                  id="enableLogging"
                  checked={settings.enableLogging}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, enableLogging: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableDeliveryReports">Enable Delivery Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Track delivery status of SMS messages
                  </p>
                </div>
                <Switch
                  id="enableDeliveryReports"
                  checked={settings.enableDeliveryReports}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, enableDeliveryReports: checked })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="logRetentionDays">Log Retention (Days)</Label>
                  <Input
                    id="logRetentionDays"
                    type="number"
                    value={settings.logRetentionDays}
                    onChange={(e) => 
                      setSettings({ ...settings, logRetentionDays: parseInt(e.target.value) || 30 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryWebhook">Delivery Report Webhook</Label>
                  <Input
                    id="deliveryWebhook"
                    type="url"
                    value={settings.deliveryReportWebhook}
                    onChange={(e) => 
                      setSettings({ ...settings, deliveryReportWebhook: e.target.value })
                    }
                    placeholder="https://your-webhook.com/sms-delivery"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 