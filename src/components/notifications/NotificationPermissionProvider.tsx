'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { NotificationPermissionModal } from './NotificationPermissionModal';

interface NotificationPermissionProviderProps {
  children: React.ReactNode;
}

export function NotificationPermissionProvider({ children }: NotificationPermissionProviderProps) {
  const { user, isLoading } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkNotificationPermissionStatus = async () => {
      // Don't check if user is not logged in, still loading, or we've already checked
      if (!user?.id || isLoading || hasChecked) {
        return;
      }

      try {
        // Check browser notification permission status
        const browserPermission: string = 'Notification' in window ? Notification.permission : 'unsupported';
        
        if (browserPermission === 'granted') {
          console.log('Notification permission already granted, skipping modal');
          
          // Mark that we've "asked" the user (since they already have permission)
          // This prevents the modal from showing in future sessions
          await fetch('/api/user/notification-permission-requested', {
            method: 'POST',
            credentials: 'include'
          });
          
          setHasChecked(true);
          return;
        }

        // For users with 'default' (never asked) or 'denied' permission,
        // check if we've asked them before in our system
        const response = await fetch('/api/user/notification-permission-requested', {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          
          // Show modal if:
          // 1. Browser supports notifications
          // 2. We haven't asked this user before in our system
          // 3. Browser permission is not granted (either 'default' or 'denied')
          if (browserPermission !== 'unsupported' && !data.hasBeenAsked && browserPermission !== 'granted') {
            console.log(`Showing notification modal - browser permission: ${browserPermission}, hasBeenAsked: ${data.hasBeenAsked}`);
            
            // Add a small delay to ensure the user has settled in
            setTimeout(() => {
              setShowModal(true);
            }, 2000);
          } else {
            console.log(`Not showing modal - browser permission: ${browserPermission}, hasBeenAsked: ${data.hasBeenAsked}`);
          }
        }
      } catch (error) {
        console.error('Error checking notification permission status:', error);
      } finally {
        setHasChecked(true);
      }
    };

    checkNotificationPermissionStatus();
  }, [user, isLoading, hasChecked]);

  const handleModalComplete = (granted: boolean) => {
    setShowModal(false);
    
    // Optionally show a different message based on whether they granted permission
    if (granted) {
      console.log('User granted notification permissions');
    } else {
      console.log('User declined notification permissions');
    }
  };

  return (
    <>
      {children}
      <NotificationPermissionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onComplete={handleModalComplete}
      />
    </>
  );
} 