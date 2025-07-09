'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { IKpiSettings } from '@/models/KpiSettings';

interface UseKpiSettingsReturn {
  settings: IKpiSettings | null;
  isLoading: boolean;
  error: string | null;
  updateSettings: (updates: Partial<IKpiSettings>) => Promise<boolean>;
  resetToDefaults: () => Promise<boolean>;
  refetch: () => void;
}

export function useKpiSettings(): UseKpiSettingsReturn {
  const [settings, setSettings] = useState<IKpiSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/kpi-settings', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch KPI settings`);
      }

      const data = await response.json();
      setSettings(data);
    } catch (err) {
      console.error('Error fetching KPI settings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch KPI settings';
      setError(errorMessage);
      toast.error('Failed to load KPI settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (updates: Partial<IKpiSettings>): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch('/api/admin/kpi-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to update KPI settings`);
      }

      const data = await response.json();
      setSettings(data.settings);
      toast.success('KPI settings updated successfully');
      return true;
    } catch (err) {
      console.error('Error updating KPI settings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update KPI settings';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, []);

  const resetToDefaults = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch('/api/admin/kpi-settings', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to reset KPI settings`);
      }

      // Refetch settings to get the defaults
      await fetchSettings();
      toast.success('KPI settings reset to defaults');
      return true;
    } catch (err) {
      console.error('Error resetting KPI settings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset KPI settings';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, [fetchSettings]);

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
    updateSettings,
    resetToDefaults,
    refetch,
  };
} 