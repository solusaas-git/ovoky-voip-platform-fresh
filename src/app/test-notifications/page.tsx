'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NotificationType } from '@/types/notifications';
import { Bell, Volume2, Settings, TestTube } from 'lucide-react';
import { toast } from 'sonner';
import InternalNotificationService from '@/services/InternalNotificationService';

export default function TestNotificationsPage() {
  const { user } = useAuth();
  const { 
    stats, 
    requestPushPermission,
    preferences 
  } = useNotifications();

  // Get notification service instance
  const notificationService = InternalNotificationService.getInstance();

  const notificationTypes: { type: NotificationType; label: string; description: string }[] = [
    { type: 'ticket_created', label: 'New Ticket', description: 'Test a new support ticket notification' },
    { type: 'payment_success', label: 'Payment Success', description: 'Test a successful payment notification' },
    { type: 'payment_failed', label: 'Payment Failed', description: 'Test a failed payment notification' },
    { type: 'low_balance', label: 'Low Balance', description: 'Test a low balance warning' },
    { type: 'zero_balance', label: 'Zero Balance', description: 'Test a zero balance alert' },
    { type: 'phone_number_approved', label: 'Number Approved', description: 'Test phone number approval' },
    { type: 'system_maintenance', label: 'Maintenance', description: 'Test system maintenance alert' },
    { type: 'security_alert', label: 'Security Alert', description: 'Test security notification' },
  ];

  const handleTestNotification = async (type: NotificationType) => {
    if (!user?.id) {
      toast.error('You must be logged in to test notifications');
      return;
    }
    
    try {
      await notificationService.testNotification(user.id, type);
      toast.success('Test notification sent');
      
      // Also test push notification directly if enabled
      if (preferences?.enablePushNotifications) {
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

  const handleRequestPushPermission = async () => {
    const granted = await requestPushPermission();
    if (granted) {
      console.log('Push notifications enabled!');
      
      // Also enable push notifications in user preferences
      try {
        const response = await fetch('/api/notifications/enable-push-for-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          console.log('Push notifications enabled in preferences');
          // Refresh preferences
          window.location.reload();
        }
      } catch (error) {
        console.error('Error enabling push in preferences:', error);
      }
    } else {
      console.log('Push notifications denied');
    }
  };

  return (
    <MainLayout>
      <PageLayout
        title="Notification System Test"
        description="Test and demonstrate the internal notification system features"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Test Notifications' }
        ]}
      >
        <div className="grid gap-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unread</CardTitle>
                <Badge variant="destructive">{stats.unread}</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.unread}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.todayCount}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.weekCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Settings Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Current Settings
              </CardTitle>
              <CardDescription>
                Your current notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Toast Notifications</span>
                  <Badge variant={preferences?.showToasts ? "default" : "secondary"}>
                    {preferences?.showToasts ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Sound Notifications</span>
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    <Badge variant={preferences?.enableSounds ? "default" : "secondary"}>
                      {preferences?.enableSounds ? `${Math.round((preferences?.soundVolume || 0) * 100)}%` : "Disabled"}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Push Notifications</span>
                  <Badge variant={preferences?.enablePushNotifications ? "default" : "secondary"}>
                    {preferences?.enablePushNotifications ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Test Notifications
              </CardTitle>
              <CardDescription>
                Click any button below to test different notification types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notificationTypes.map((item) => (
                  <Card key={item.type} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{item.label}</CardTitle>
                      <CardDescription className="text-xs">
                        {item.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Button 
                        onClick={() => handleTestNotification(item.type)}
                        size="sm"
                        className="w-full"
                      >
                        Test {item.label}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Push Permission */}
          <Card>
            <CardHeader>
              <CardTitle>Push Notifications</CardTitle>
              <CardDescription>
                Enable browser push notifications for alerts when the app is not active
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={handleRequestPushPermission}>
                  Request Push Permission
                </Button>
                
                {/* Debug Section */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">Debug Push Notifications</h4>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          console.log('Notification permission:', Notification?.permission);
                          console.log('Service worker supported:', 'serviceWorker' in navigator);
                          console.log('Push manager supported:', 'PushManager' in window);
                          console.log('Current user:', user);
                          
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
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/user/notification-permission-requested', {
                              method: 'DELETE',
                              credentials: 'include'
                            });
                            
                            if (response.ok) {
                              toast.success('Permission request status reset - refresh page to see modal again');
                            } else {
                              toast.error('Failed to reset status');
                            }
                          } catch {
                            toast.error('Error resetting status');
                          }
                        }}
                      >
                        Reset Modal Status
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    </MainLayout>
  );
} 