'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { 
  NotificationContextType,
  InternalNotification,
  NotificationPreferences,
  NotificationStats,
  NotificationFilter,
  NotificationType
} from '@/types/notifications';
import InternalNotificationService from '@/services/InternalNotificationService';
import NotificationSoundService from '@/services/NotificationSoundService';
import { useNotificationToast } from '@/components/notifications/NotificationToastContainer';
import NotificationToastContainer from '@/components/notifications/NotificationToastContainer';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  // State
  const [notifications, setNotifications] = useState<InternalNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    byType: {} as Record<NotificationType, number>,
    byPriority: {} as Record<string, number>,
    todayCount: 0,
    weekCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotificationCenterOpen, setNotificationCenterOpen] = useState(false);
  
  // Filter state
  const [filter, setFilter] = useState<NotificationFilter>({});
  const [filteredNotifications, setFilteredNotifications] = useState<InternalNotification[]>([]);

  // Services
  const notificationService = useRef(InternalNotificationService.getInstance());
  const soundService = useRef(NotificationSoundService.getInstance());
  
  // Custom toast system
  const { showToast } = useNotificationToast();
  
  // Auth context
  const { user, isLoading: authLoading } = useAuth();

  // Polling interval for real-time updates
  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const POLL_INTERVAL = 10000; // 10 seconds

  // Track last notification count for detecting new notifications
  const lastNotificationCount = useRef(0);
  const isInitialized = useRef(false);
  const lastNotificationTimestamp = useRef<Date | null>(null);

  // Initialize when user is authenticated
  useEffect(() => {
    if (!authLoading && user) {
      initializeNotifications();
      startPolling();
    } else if (!authLoading && !user) {
      // Reset state when user logs out
      resetNotificationState();
      stopPolling();
    }

    return stopPolling;
  }, [user, authLoading]);

  // Update filtered notifications when notifications or filter changes
  useEffect(() => {
    applyFilters();
  }, [notifications, filter]);

  // Handle new notifications for toast display (only for real-time updates, not initial load)
  useEffect(() => {
    if (!isInitialized.current || !preferences?.showToasts) {
      return;
    }

    // Only show toasts for notifications that are genuinely new
    // We add a small buffer (30 seconds) to account for slight timing differences
    const bufferTime = 30 * 1000; // 30 seconds in milliseconds
    const cutoffTime = lastNotificationTimestamp.current ? 
      new Date(lastNotificationTimestamp.current.getTime() - bufferTime) : 
      new Date();

    const newNotifications = notifications.filter(notification => {
      // Only show notifications created after our last known timestamp
      const notificationTime = new Date(notification.createdAt);
      return notificationTime > cutoffTime &&
             notification.showToast &&
             notification.status === 'unread'; // Only show unread notifications as toasts
    });

    if (newNotifications.length > 0) {
      // Update the timestamp to the most recent notification
      const mostRecentTime = new Date(Math.max(...newNotifications.map(n => new Date(n.createdAt).getTime())));
      
      // Only update timestamp if this notification is actually newer
      if (!lastNotificationTimestamp.current || mostRecentTime > lastNotificationTimestamp.current) {
        lastNotificationTimestamp.current = mostRecentTime;

        if (process.env.NODE_ENV === 'development') {
          console.log(`Showing ${newNotifications.length} new notification toasts. Updated timestamp to:`, mostRecentTime);
        }

        // Show toasts for new notifications
        newNotifications.forEach(notification => {
          showNotificationToast(notification);
        });
      }
    }
  }, [notifications, preferences?.showToasts, showToast]);

  const resetNotificationState = () => {
    setNotifications([]);
    setPreferences(null);
    setStats({
      total: 0,
      unread: 0,
      byType: {} as Record<NotificationType, number>,
      byPriority: {} as Record<string, number>,
      todayCount: 0,
      weekCount: 0
    });
    setError(null);
    setIsLoading(false);
    lastNotificationCount.current = 0;
    isInitialized.current = false;
    lastNotificationTimestamp.current = null;
  };

  const initializeNotifications = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Load user preferences
      const userPrefs = await notificationService.current.getUserPreferences(user.id);
      setPreferences(userPrefs);

      // Apply preferences to sound service
      if (userPrefs) {
        soundService.current.setEnabled(userPrefs.enableSounds);
        soundService.current.setVolume(userPrefs.soundVolume);
      }

      // Load notifications
      await refreshNotifications();

      // Load stats
      const userStats = await notificationService.current.getUserStats(user.id);
      setStats(userStats as any);

      // Mark as initialized and set the timestamp to now
      // This prevents existing notifications from being shown as toasts
      isInitialized.current = true;
      lastNotificationTimestamp.current = new Date();

      if (process.env.NODE_ENV === 'development') {
        console.log('Notifications initialized. Timestamp set to:', lastNotificationTimestamp.current);
      }

    } catch (err) {
      console.error('Error initializing notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshNotifications = async () => {
    if (!user) return;

    try {
      const { notifications: userNotifications } = await notificationService.current.getUserNotifications(
        user.id,
        { limit: 100 }
      );
      
      setNotifications(userNotifications as InternalNotification[]);
      
      // Update stats
      const userStats = await notificationService.current.getUserStats(user.id);
      setStats(userStats as any);
      
    } catch (err) {
      console.error('Error refreshing notifications:', err);
    }
  };

  const startPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
    }
    
    pollInterval.current = setInterval(() => {
      if (!document.hidden && user) {
        refreshNotifications();
      }
    }, POLL_INTERVAL);
  };

  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  };

  const applyFilters = () => {
    let filtered = [...notifications];

    if (filter.types?.length) {
      filtered = filtered.filter(n => filter.types!.includes(n.type));
    }

    if (filter.priorities?.length) {
      filtered = filtered.filter(n => filter.priorities!.includes(n.priority));
    }

    if (filter.status?.length) {
      filtered = filtered.filter(n => filter.status!.includes(n.status));
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(searchLower) ||
        n.message.toLowerCase().includes(searchLower)
      );
    }

    if (filter.dateFrom) {
      filtered = filtered.filter(n => new Date(n.createdAt) >= filter.dateFrom!);
    }

    if (filter.dateTo) {
      filtered = filtered.filter(n => new Date(n.createdAt) <= filter.dateTo!);
    }

    setFilteredNotifications(filtered);
  };

  const showNotificationToast = (notification: InternalNotification) => {
    if (!preferences?.showToasts) return;
    
    // Use our custom toast system
    showToast(notification, {
      position: preferences.toastPosition,
      duration: (preferences.toastDuration || 5) * 1000
    });
  };

  // Context actions
  const addNotification = async (notification: Omit<InternalNotification, 'id' | 'createdAt'>) => {
    if (!user) {
      console.warn('Cannot add notification: user not authenticated');
      return;
    }

    try {
      const newNotification = await notificationService.current.createNotification(
        user.id,
        notification.type,
        notification.data
      );
      
      if (newNotification) {
        setNotifications(prev => [newNotification as InternalNotification, ...prev]);
        
        setStats(prev => ({
          ...prev,
          total: prev.total + 1,
          unread: notification.status === 'unread' ? prev.unread + 1 : prev.unread
        }));

        // Update the timestamp for this new notification
        const notificationTime = new Date(newNotification.createdAt);
        lastNotificationTimestamp.current = notificationTime;

        // Show toast if enabled (this will be handled by the useEffect)
        // No need to manually show toast here as the useEffect will catch it

        // Play sound if enabled
        if (preferences?.enableSounds && newNotification.sound) {
          await soundService.current.playSound(
            newNotification.sound,
            preferences.soundVolume
          );
        }
      }
    } catch (err) {
      console.error('Error adding notification:', err);
      throw err;
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) {
      console.warn('Cannot mark notification as read: user not authenticated');
      return;
    }

    try {
      const success = await notificationService.current.markAsRead(notificationId, user.id);
      
      if (success) {
        setNotifications(prev => prev.map(n => 
          n.id === notificationId 
            ? { ...n, status: 'read' as const, readAt: new Date() }
            : n
        ));

        setStats(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1)
        }));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  };

  const markAllAsRead = async () => {
    if (!user) {
      console.warn('Cannot mark all notifications as read: user not authenticated');
      return;
    }

    try {
      const count = await notificationService.current.markAllAsRead(user.id);
      
      if (count > 0) {
        setNotifications(prev => prev.map(n => 
          n.status === 'unread' 
            ? { ...n, status: 'read' as const, readAt: new Date() }
            : n
        ));

        setStats(prev => ({
          ...prev,
          unread: 0
        }));
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  };

  const archiveNotification = async (notificationId: string) => {
    if (!user) {
      console.warn('Cannot archive notification: user not authenticated');
      return;
    }

    try {
      const success = await notificationService.current.archiveNotification(notificationId, user.id);
      
      if (success) {
        setNotifications(prev => prev.map(n => 
          n.id === notificationId 
            ? { ...n, status: 'archived' as const, archivedAt: new Date() }
            : n
        ));
      }
    } catch (err) {
      console.error('Error archiving notification:', err);
      throw err;
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user) {
      console.warn('Cannot delete notification: user not authenticated');
      return;
    }

    try {
      const success = await notificationService.current.deleteNotification(notificationId, user.id);
      
      if (success) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        setStats(prev => ({
          ...prev,
          total: Math.max(0, prev.total - 1)
        }));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      throw err;
    }
  };

  const clearAllNotifications = async () => {
    if (!user) {
      console.warn('Cannot clear notifications: user not authenticated');
      return;
    }

    try {
      const count = await notificationService.current.clearAllNotifications(user.id);
      
      if (count > 0) {
        setNotifications([]);
        setStats({
          total: 0,
          unread: 0,
          byType: {} as Record<NotificationType, number>,
          byPriority: {} as Record<string, number>,
          todayCount: 0,
          weekCount: 0
        });
      }
    } catch (err) {
      console.error('Error clearing all notifications:', err);
      throw err;
    }
  };

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!user) {
      console.warn('Cannot update preferences: user not authenticated');
      return;
    }

    try {
      const updated = await notificationService.current.updateUserPreferences(user.id, updates);
      
      if (updated) {
        setPreferences(updated as NotificationPreferences);
      }
    } catch (err) {
      console.error('Error updating preferences:', err);
      throw err;
    }
  };

  const requestPushPermission = async () => {
    try {
      return await notificationService.current.requestPushPermission();
    } catch (err) {
      console.error('Error requesting push permission:', err);
      return false;
    }
  };

  const testNotification = async (type: NotificationType) => {
    if (!user) {
      console.warn('Cannot test notification: user not authenticated');
      return;
    }

    try {
      await notificationService.current.testNotification(user.id, type);
    } catch (err) {
      console.error('Error testing notification:', err);
      throw err;
    }
  };

  const contextValue: NotificationContextType = {
    // State
    notifications,
    preferences,
    stats,
    isLoading,
    error,
    
    // Notification Center
    isNotificationCenterOpen,
    setNotificationCenterOpen,
    
    // Actions
    addNotification,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    clearAllNotifications,
    
    // Preferences
    updatePreferences,
    
    // Filtering
    filter,
    setFilter,
    filteredNotifications,
    
    // Utility
    refreshNotifications,
    requestPushPermission,
    testNotification
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationToastContainer 
        position={preferences?.toastPosition || 'top-right'}
        maxToasts={5}
        defaultDuration={(preferences?.toastDuration || 5) * 1000}
      />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext; 