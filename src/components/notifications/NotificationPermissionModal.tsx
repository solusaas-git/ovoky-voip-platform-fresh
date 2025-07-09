'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import InternalNotificationService from '@/services/InternalNotificationService';
import { Bell, Volume2, Smartphone, X, Check } from 'lucide-react';

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (granted: boolean) => void;
}

export function NotificationPermissionModal({ 
  isOpen, 
  onComplete 
}: NotificationPermissionModalProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  
  const notificationService = InternalNotificationService.getInstance();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications are not supported in this browser');
      onComplete(false);
      return;
    }

    setIsRequesting(true);
    try {
      // Request browser notification permission
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);

      if (permission === 'granted') {
        // Request push notification permission through our service
        const pushGranted = await notificationService.requestPushPermission();
        
        if (pushGranted) {
          // Enable push notifications in user preferences
          await fetch('/api/notifications/enable-push-for-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          });

          // Show a test notification
          setTimeout(() => {
            new Notification('Welcome to OVO!', {
              body: 'You&apos;ll now receive important notifications about your account.',
              icon: '/icons/notification-icon.svg',
              badge: '/icons/notification-badge.svg'
            });
          }, 1000);

          toast.success('Notifications enabled successfully!');
        } else {
          toast.warning('Basic notifications enabled, but push notifications may not work properly');
        }

        // Only mark as "asked" when permission is granted
        await fetch('/api/user/notification-permission-requested', {
          method: 'POST',
          credentials: 'include'
        });

        onComplete(true);
      } else {
        // Permission denied - don't mark as asked so modal can appear again
        toast.info('You can enable notifications later by clicking the notification icon in your browser&apos;s address bar');
        onComplete(false);
      }

    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to set up notifications');
      onComplete(false);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = async () => {
    // Don't mark as "asked" when user skips, so modal can appear again
    toast.info('You can enable notifications later in Settings');
    onComplete(false);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Stay Updated with Notifications
          </DialogTitle>
          <DialogDescription>
            Enable notifications to receive important updates about your account, 
            support tickets, and payment activities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Notification Types */}
          <div className="grid grid-cols-1 gap-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Desktop Notifications
                </CardTitle>
                <CardDescription className="text-xs">
                  Get instant alerts in your browser for important events
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Sound Alerts
                </CardTitle>
                <CardDescription className="text-xs">
                  Audio notifications for urgent messages and alerts
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Push Notifications
                </CardTitle>
                <CardDescription className="text-xs">
                  Receive notifications even when the app is closed
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Current Status */}
          {permissionStatus !== 'default' && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Current Permission Status:</span>
                <Badge variant={permissionStatus === 'granted' ? 'default' : 'secondary'}>
                  {permissionStatus === 'granted' ? (
                    <>
                      <Check className="w-3 h-3 mr-1" />
                      Granted
                    </>
                  ) : (
                    <>
                      <X className="w-3 h-3 mr-1" />
                      Denied
                    </>
                  )}
                </Badge>
              </div>
            </div>
          )}

          {/* Benefits */}
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-2">You'll be notified about:</p>
            <ul className="space-y-1 text-xs">
              <li>• Support ticket updates and responses</li>
              <li>• Payment confirmations and billing alerts</li>
              <li>• Account balance and low balance warnings</li>
              <li>• Phone number approvals and assignments</li>
              <li>• System maintenance and security alerts</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isRequesting}
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleRequestPermission}
            disabled={isRequesting || permissionStatus === 'granted'}
            className="flex-1"
          >
            {isRequesting ? (
              'Setting up...'
            ) : permissionStatus === 'granted' ? (
              'Already Enabled'
            ) : (
              'Enable Notifications'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 