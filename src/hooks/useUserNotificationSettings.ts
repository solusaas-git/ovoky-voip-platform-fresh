'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserNotificationSettings } from '@/models/UserNotificationSettings';
import { useAuth } from '@/lib/AuthContext';

interface UseUserNotificationSettingsReturn {
  settings: UserNotificationSettings | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useUserNotificationSettings(): UseUserNotificationSettingsReturn {
  const [settings, setSettings] = useState<UserNotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchSettings = useCallback(async () => {
    // Don't fetch if user is not authenticated
    if (!user) {
      setIsLoading(false);
      setSettings(null);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/user/notification-settings', {
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else if (response.status === 404) {
        // No settings found, use defaults
        setSettings({
          userId: user.id,
          userEmail: user.email,
          lowBalanceThreshold: 10.0000,
          zeroBalanceThreshold: 0.0000,
          negativeBalanceThreshold: -0.0001,
          enableLowBalanceNotifications: true,
          enableZeroBalanceNotifications: true,
          enableNegativeBalanceNotifications: true,
          notificationFrequencyHours: 24,
          currency: 'EUR',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to fetch notification settings');
      }
    } catch (err) {
      console.error('Error fetching notification settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notification settings');
      
      // Use defaults on error only if user is still authenticated
      if (user) {
        setSettings({
          userId: user.id,
          userEmail: user.email,
          lowBalanceThreshold: 10.0000,
          zeroBalanceThreshold: 0.0000,
          negativeBalanceThreshold: -0.0001,
          enableLowBalanceNotifications: true,
          enableZeroBalanceNotifications: true,
          enableNegativeBalanceNotifications: true,
          notificationFrequencyHours: 24,
          currency: 'EUR',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const refetch = useCallback(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    error,
    refetch
  };
} 