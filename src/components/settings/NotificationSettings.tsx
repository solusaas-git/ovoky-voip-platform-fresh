'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationPreferences, NotificationType, NotificationTemplates, createDefaultPreferences } from '@/types/notifications';
import { LowBalanceSettings } from '@/components/settings/LowBalanceSettings';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import InternalNotificationService from '@/services/InternalNotificationService';
import { 
  Save, 
  RotateCcw, 
  TestTube, 
  Volume2, 
  Settings,
  Info,
  AlertTriangle,
  Users,
  Shield
} from 'lucide-react';

// Group notification types by category
const NOTIFICATION_CATEGORIES = {
  support: ['ticket_created', 'ticket_updated', 'ticket_assigned', 'ticket_reply', 'ticket_resolved'],
  billing: ['payment_success', 'payment_failed', 'low_balance', 'zero_balance'],
  numbers: ['phone_number_approved', 'phone_number_rejected', 'phone_number_purchased', 'phone_number_assigned'],
  system: ['system_maintenance', 'user_verification', 'admin_alert', 'rate_deck_updated'],
  security: ['call_quality_alert', 'security_alert']
};

interface AdminStats {
  totalUsers: number;
  enabledPushUsers: number;
  enabledSoundUsers: number;
}

export function NotificationSettings() {
  const { user } = useAuth();
  const { } = useNotifications(); // We'll access the service directly
  const [localPreferences, setLocalPreferences] = useState<Partial<NotificationPreferences> | null>(null);
  const [preferencesDirty, setPreferencesDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Admin-specific state
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [applyToAllUsers, setApplyToAllUsers] = useState(false);
  const [resetingUsers, setResetingUsers] = useState(false);

  // Get notification service instance
  const notificationService = InternalNotificationService.getInstance();

  // Load preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        if (user.role === 'admin') {
          // Load admin preferences and stats
          const response = await fetch('/api/notifications/preferences/admin', {
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            setLocalPreferences(data.globalDefaults);
            setAdminStats(data.stats);
          } else {
            // Fallback to regular preferences
            const prefs = await notificationService.getUserPreferences(user.id);
            setLocalPreferences(prefs);
          }
        } else {
          // Regular user preferences
          const prefs = await notificationService.getUserPreferences(user.id);
          setLocalPreferences(prefs);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
        toast.error('Failed to load notification preferences');
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [notificationService, user]);

  // Save preferences
  const handleSave = async () => {
    if (!localPreferences || !user?.id) return;
    
    setSaving(true);
    try {
      if (user.role === 'admin') {
        // Save admin preferences
        const response = await fetch('/api/notifications/preferences/admin', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            ...localPreferences,
            applyToAllUsers
          })
        });

        if (response.ok) {
          const result = await response.json();
          toast.success(result.message);
          setPreferencesDirty(false);
          setApplyToAllUsers(false);
          
          // Refresh stats
          if (result.appliedToUsers > 0) {
            setAdminStats(prev => prev ? {
              ...prev,
              // Stats might have changed, refetch them
            } : null);
          }
        } else {
          throw new Error('Failed to save admin preferences');
        }
      } else {
        // Save regular user preferences
        const updated = await notificationService.updateUserPreferences(user.id, localPreferences);
        if (updated) {
          toast.success('Notification preferences saved');
          setPreferencesDirty(false);
        } else {
          throw new Error('Failed to save preferences');
        }
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  // Reset all users to admin defaults
  const handleResetAllUsers = async () => {
    if (user?.role !== 'admin') return;
    
    setResetingUsers(true);
    try {
      const response = await fetch('/api/notifications/preferences/admin', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
      } else {
        throw new Error('Failed to reset user preferences');
      }
    } catch (error) {
      console.error('Error resetting user preferences:', error);
      toast.error('Failed to reset user preferences');
    } finally {
      setResetingUsers(false);
    }
  };

  // Reset preferences
  const handleReset = () => {
    if (!user?.id) return;
    
    // Reset to defaults
    const defaults = createDefaultPreferences(user.id);
    setLocalPreferences(defaults);
    setPreferencesDirty(true);
    toast.info('Preferences reset to defaults');
  };

  // Handle preference changes
  const handleGlobalPreferenceChange = (key: keyof NotificationPreferences, value: unknown) => {
    if (!localPreferences) return;
    
    setLocalPreferences(prev => ({ 
      ...prev, 
      [key]: value 
    }));
    setPreferencesDirty(true);
  };

  const handleTypePreferenceChange = (
    type: NotificationType, 
    key: keyof NotificationPreferences['typePreferences'][NotificationType], 
    value: unknown
  ) => {
    if (!localPreferences) return;
    
    setLocalPreferences(prev => {
      if (!prev || !prev.typePreferences || !prev.typePreferences[type]) return prev;
      return {
        ...prev,
        typePreferences: {
          ...prev.typePreferences,
          [type]: {
            ...prev.typePreferences[type],
            [key]: value
          }
        }
      } as Partial<NotificationPreferences>;
    });
    setPreferencesDirty(true);
  };

  // Test notification
  const handleTestNotification = async (type: NotificationType) => {
    if (!user?.id) return;
    
    try {
      await notificationService.testNotification(user.id, type);
      toast.success('Test notification sent');
      
      // Also test push notification directly if enabled
      if (localPreferences?.enablePushNotifications) {
        // Check if we have push permission
        if ('Notification' in window && Notification.permission === 'granted') {
          // Test direct browser notification
          setTimeout(() => {
            new Notification('Direct Test Notification', {
              body: `Testing ${type} notification type`,
              icon: '/icons/notification-icon.svg',
              badge: '/icons/notification-badge.svg'
            });
          }, 1000);
        } else {
          console.log('Push notifications not permitted or not available');
        }
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!localPreferences) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-500">
          Failed to load notification preferences. Please try refreshing the page.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue={user?.role === 'admin' ? 'admin' : 'balance-alerts'} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="balance-alerts">Balance Alerts</TabsTrigger>
          <TabsTrigger value="user-preferences">User Preferences</TabsTrigger>
          {user?.role === 'admin' && (
            <TabsTrigger value="admin">
              <Users className="w-4 h-4 mr-2" />
              Admin Controls
            </TabsTrigger>
          )}
        </TabsList>

        {/* Balance Alerts Tab */}
        <TabsContent value="balance-alerts">
          <LowBalanceSettings />
        </TabsContent>

        {/* User Preferences Tab */}
        <TabsContent value="user-preferences" className="space-y-6">
          {/* Save/Reset Controls */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Customize how you receive notifications
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {preferencesDirty && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      Unsaved changes
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    disabled={saving}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!preferencesDirty || saving}
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Global Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Global Settings
              </CardTitle>
              <CardDescription>
                Overall notification preferences that apply to all notification types
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Toast Notifications */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Toast Notifications</Label>
                    <p className="text-sm text-gray-500">Show popup notifications in the browser</p>
                  </div>
                  <Switch
                    checked={localPreferences.showToasts}
                    onCheckedChange={(checked) => 
                      handleGlobalPreferenceChange('showToasts', checked)
                    }
                  />
                </div>
                
                {localPreferences.showToasts && (
                  <div className="grid grid-cols-2 gap-4 ml-6">
                    <div>
                      <Label htmlFor="toast-duration" className="text-sm">Duration (seconds)</Label>
                      <Input
                        id="toast-duration"
                        type="number"
                        min="1"
                        max="30"
                        value={localPreferences.toastDuration || 5}
                        onChange={(e) => 
                          handleGlobalPreferenceChange('toastDuration', parseInt(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="toast-position" className="text-sm">Position</Label>
                      <Select
                        value={localPreferences.toastPosition || 'top-right'}
                        onValueChange={(value) => 
                          handleGlobalPreferenceChange('toastPosition', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top-left">Top Left</SelectItem>
                          <SelectItem value="top-right">Top Right</SelectItem>
                          <SelectItem value="bottom-left">Bottom Left</SelectItem>
                          <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Sound Notifications */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Sound Notifications</Label>
                    <p className="text-sm text-gray-500">Play sounds when notifications arrive</p>
                  </div>
                  <Switch
                    checked={localPreferences.enableSounds}
                    onCheckedChange={(checked) => 
                      handleGlobalPreferenceChange('enableSounds', checked)
                    }
                  />
                </div>
                
                {localPreferences.enableSounds && (
                  <div className="space-y-4 ml-6">
                    <div>
                      <Label className="text-sm">Volume</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <Volume2 className="w-4 h-4" />
                        <Slider
                          value={[Math.round((localPreferences.soundVolume || 0.7) * 100)]}
                          onValueChange={([value]) => 
                            handleGlobalPreferenceChange('soundVolume', value / 100)
                          }
                          max={100}
                          step={5}
                          className="flex-1"
                        />
                        <span className="text-sm text-gray-500 min-w-[2rem]">
                          {Math.round((localPreferences.soundVolume || 0.7) * 100)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="sound-theme" className="text-sm">Sound Theme</Label>
                      <Select
                        value={localPreferences.soundTheme || 'default'}
                        onValueChange={(value) => 
                          handleGlobalPreferenceChange('soundTheme', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="subtle">Subtle</SelectItem>
                          <SelectItem value="chime">Chime (Pleasant)</SelectItem>
                          <SelectItem value="bell">Bell (Gentle)</SelectItem>
                          <SelectItem value="piano">Piano (Soft)</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Push Notifications */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Push Notifications</Label>
                    <p className="text-sm text-gray-500">Browser push notifications when tab is not active</p>
                  </div>
                  <Switch
                    checked={localPreferences.enablePushNotifications}
                    onCheckedChange={(checked) => 
                      handleGlobalPreferenceChange('enablePushNotifications', checked)
                    }
                  />
                </div>
                
                {localPreferences.enablePushNotifications && (
                  <div className="ml-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Only when away</Label>
                        <p className="text-xs text-gray-500">Only send push notifications when tab is not focused</p>
                      </div>
                      <Switch
                        checked={localPreferences.pushOnlyWhenAway}
                        onCheckedChange={(checked) => 
                          handleGlobalPreferenceChange('pushOnlyWhenAway', checked)
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Do Not Disturb */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Do Not Disturb</Label>
                    <p className="text-sm text-gray-500">Schedule quiet hours for notifications</p>
                  </div>
                  <Switch
                    checked={localPreferences.doNotDisturbEnabled}
                    onCheckedChange={(checked) => 
                      handleGlobalPreferenceChange('doNotDisturbEnabled', checked)
                    }
                  />
                </div>
                
                {localPreferences.doNotDisturbEnabled && (
                  <div className="grid grid-cols-2 gap-4 ml-6">
                    <div>
                      <Label htmlFor="dnd-start" className="text-sm">Start Time</Label>
                      <Input
                        id="dnd-start"
                        type="time"
                        value={localPreferences.doNotDisturbStart || '22:00'}
                        onChange={(e) => 
                          handleGlobalPreferenceChange('doNotDisturbStart', e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="dnd-end" className="text-sm">End Time</Label>
                      <Input
                        id="dnd-end"
                        type="time"
                        value={localPreferences.doNotDisturbEnd || '08:00'}
                        onChange={(e) => 
                          handleGlobalPreferenceChange('doNotDisturbEnd', e.target.value)
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Per-Type Settings */}
          {Object.entries(NOTIFICATION_CATEGORIES).map(([category, types]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="capitalize">{category.replace('_', ' ')} Notifications</CardTitle>
                <CardDescription>
                  Configure settings for {category} related notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {types.map((type) => {
                    const template = NotificationTemplates[type as NotificationType];
                    const typePrefs = localPreferences.typePreferences?.[type as NotificationType];
                    
                    if (!template || !typePrefs) return null;
                    
                    return (
                      <div key={type} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{template.getTitle()}</span>
                              <Badge variant="outline" className="text-xs">
                                {typePrefs.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500">{template.getMessage()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTestNotification(type as NotificationType)}
                            >
                              <TestTube className="w-4 h-4 mr-1" />
                              Test
                            </Button>
                            <Switch
                              checked={typePrefs.enabled}
                              onCheckedChange={(checked) => 
                                handleTypePreferenceChange(type as NotificationType, 'enabled', checked)
                              }
                            />
                          </div>
                        </div>
                        
                        {typePrefs.enabled && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm">Toast</Label>
                              <Switch
                                checked={typePrefs.showToast}
                                onCheckedChange={(checked) => 
                                  handleTypePreferenceChange(type as NotificationType, 'showToast', checked)
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label className="text-sm">Sound</Label>
                              <Switch
                                checked={typePrefs.playSound}
                                onCheckedChange={(checked) => 
                                  handleTypePreferenceChange(type as NotificationType, 'playSound', checked)
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label className="text-sm">Push</Label>
                              <Switch
                                checked={typePrefs.enablePush}
                                onCheckedChange={(checked) => 
                                  handleTypePreferenceChange(type as NotificationType, 'enablePush', checked)
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Priority</Label>
                              <Select
                                value={typePrefs.priority}
                                onValueChange={(value) => 
                                  handleTypePreferenceChange(type as NotificationType, 'priority', value)
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Admin Controls Tab */}
        {user?.role === 'admin' && (
          <TabsContent value="admin" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Admin Controls
                </CardTitle>
                <CardDescription>
                  Manage global notification preferences for all users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stats */}
                {adminStats && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{adminStats.totalUsers}</div>
                      <div className="text-sm text-gray-500">Total Users</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{adminStats.enabledPushUsers}</div>
                      <div className="text-sm text-gray-500">Push Enabled</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{adminStats.enabledSoundUsers}</div>
                      <div className="text-sm text-gray-500">Sound Enabled</div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Apply to All Users Option */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Your current preferences serve as the global defaults for new users. 
                    You can also apply your current settings to all existing users.
                  </AlertDescription>
                </Alert>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base font-medium">Apply to All Users</Label>
                    <p className="text-sm text-gray-500">
                      When saving, apply these settings to all existing users
                    </p>
                  </div>
                  <Switch
                    checked={applyToAllUsers}
                    onCheckedChange={setApplyToAllUsers}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-4">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : (
                      applyToAllUsers 
                        ? 'Apply to All Users' 
                        : preferencesDirty 
                          ? 'Save Admin Defaults' 
                          : 'Set as Global Defaults'
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleResetAllUsers}
                    disabled={resetingUsers}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {resetingUsers ? 'Resetting...' : 'Reset All Users'}
                  </Button>
                </div>

                {/* Debug Section */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="border-t pt-6">
                    <h4 className="text-sm font-medium mb-3">Debug Push Notifications</h4>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          console.log('Notification permission:', Notification?.permission);
                          console.log('Service worker supported:', 'serviceWorker' in navigator);
                          console.log('Push manager supported:', 'PushManager' in window);
                          
                          if ('serviceWorker' in navigator) {
                            const registration = await navigator.serviceWorker.getRegistration();
                            console.log('Service worker registration:', registration);
                            
                            if (registration) {
                              const subscription = await registration.pushManager.getSubscription();
                              console.log('Push subscription:', subscription);
                            }
                          }
                          
                          toast.info('Check console for debug info');
                        }}
                      >
                        Debug Status
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if ('Notification' in window) {
                            const permission = await Notification.requestPermission();
                            toast.info(`Permission: ${permission}`);
                          }
                        }}
                      >
                        Request Permission
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification('Direct Test', {
                              body: 'Testing direct browser notification',
                              icon: '/icons/notification-icon.svg'
                            });
                          } else {
                            toast.error('Permission not granted');
                          }
                        }}
                      >
                        Test Direct
                      </Button>
                    </div>
                  </div>
                )}

                {applyToAllUsers && (
                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Warning:</strong> This will overwrite notification preferences for all existing users.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
} 