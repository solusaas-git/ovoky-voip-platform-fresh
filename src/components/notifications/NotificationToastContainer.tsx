'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { InternalNotification } from '@/types/notifications';
import NotificationToast from './NotificationToast';

// Extend window interface for notification functions
declare global {
  interface Window {
    showNotificationToast?: (notification: InternalNotification, options?: {
      position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
      duration?: number;
    }) => void;
    hideNotificationToast?: (toastId: string) => void;
  }
}

export interface ToastNotification extends InternalNotification {
  toastId: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  duration?: number;
}

interface NotificationToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
  defaultDuration?: number;
}

export default function NotificationToastContainer({ 
  position = 'top-right',
  maxToasts = 5,
  defaultDuration = 5000
}: NotificationToastContainerProps) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Function to add a new toast
  const addToast = useCallback((notification: InternalNotification, options?: {
    position?: typeof position;
    duration?: number;
  }) => {
    const toastId = `${notification.id || Date.now()}-${Math.random()}`;
    const newToast: ToastNotification = {
      ...notification,
      toastId,
      position: options?.position || position,
      duration: options?.duration || defaultDuration
    };

    setToasts(prevToasts => {
      const updatedToasts = [newToast, ...prevToasts];
      
      // Limit the number of toasts
      if (updatedToasts.length > maxToasts) {
        return updatedToasts.slice(0, maxToasts);
      }
      
      return updatedToasts;
    });
  }, [position, defaultDuration, maxToasts]);

  // Function to remove a toast
  const removeToast = useCallback((toastId: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.toastId !== toastId));
  }, []);

  // Expose functions globally for other components to use
  useEffect(() => {
    if (mounted) {
      // Attach to window object for global access
      window.showNotificationToast = addToast;
      window.hideNotificationToast = removeToast;
    }

    return () => {
      if (mounted) {
        delete window.showNotificationToast;
        delete window.hideNotificationToast;
      }
    };
  }, [mounted, addToast, removeToast]);

  // Group toasts by position
  const groupedToasts = toasts.reduce((groups, toast) => {
    const pos = toast.position || position;
    if (!groups[pos]) {
      groups[pos] = [];
    }
    groups[pos].push(toast);
    return groups;
  }, {} as Record<string, ToastNotification[]>);

  if (!mounted) {
    return null;
  }

  const getContainerStyles = (pos: string) => {
    const baseClasses = "fixed z-[60] pointer-events-none";
    const spacing = "space-y-4";
    
    switch (pos) {
      case 'top-left':
        return `${baseClasses} top-6 left-6 ${spacing}`;
      case 'top-right':
        return `${baseClasses} top-6 right-6 ${spacing}`;
      case 'top-center':
        return `${baseClasses} top-6 left-1/2 transform -translate-x-1/2 ${spacing}`;
      case 'bottom-left':
        return `${baseClasses} bottom-6 left-6 ${spacing} flex flex-col-reverse`;
      case 'bottom-right':
        return `${baseClasses} bottom-6 right-6 ${spacing} flex flex-col-reverse`;
      case 'bottom-center':
        return `${baseClasses} bottom-6 left-1/2 transform -translate-x-1/2 ${spacing} flex flex-col-reverse`;
      default:
        return `${baseClasses} top-6 right-6 ${spacing}`;
    }
  };

  return createPortal(
    <>
      {Object.entries(groupedToasts).map(([pos, positionToasts]) => (
        <div key={pos} className={getContainerStyles(pos)}>
          {positionToasts.map((toast) => (
            <NotificationToast
              key={toast.toastId}
              notification={toast}
              onDismiss={() => removeToast(toast.toastId)}
              duration={toast.duration}
              position={toast.position}
            />
          ))}
        </div>
      ))}
    </>,
    document.body
  );
}

// Hook to use the toast system
export function useNotificationToast() {
  const showToast = useCallback((notification: InternalNotification, options?: {
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
    duration?: number;
  }) => {
    if (typeof window !== 'undefined' && window.showNotificationToast) {
      window.showNotificationToast(notification, options);
    }
  }, []);

  const hideToast = useCallback((toastId: string) => {
    if (typeof window !== 'undefined' && window.hideNotificationToast) {
      window.hideNotificationToast(toastId);
    }
  }, []);

  return { showToast, hideToast };
} 