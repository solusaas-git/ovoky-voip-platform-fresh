'use client';

import { useState, useEffect, useCallback } from 'react';

interface KpiThresholds {
  costThresholds: {
    low: number;
    medium: number;
  };
  asrThresholds: {
    critical: number;
    poor: number;
    fair: number;
    good: number;
  };
  acdThresholds: {
    short: number;
    normal: number;
    long: number;
  };
  totalMinutesThresholds: {
    light: number;
    moderate: number;
    heavy: number;
  };
  currency: string;
  refreshInterval: number;
}

// Default thresholds as fallback
const DEFAULT_THRESHOLDS: KpiThresholds = {
  costThresholds: {
    low: 1.0,
    medium: 10.0
  },
  asrThresholds: {
    critical: 50,
    poor: 70,
    fair: 85,
    good: 95
  },
  acdThresholds: {
    short: 30,
    normal: 120,
    long: 300
  },
  totalMinutesThresholds: {
    light: 60,
    moderate: 300,
    heavy: 600
  },
  currency: 'EUR',
  refreshInterval: 300
};

interface UseKpiThresholdsReturn {
  thresholds: KpiThresholds;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useKpiThresholds(): UseKpiThresholdsReturn {
  const [thresholds, setThresholds] = useState<KpiThresholds>(DEFAULT_THRESHOLDS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThresholds = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/kpi-thresholds', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch KPI thresholds`);
      }

      const data = await response.json();
      
      const thresholds = data.thresholds || DEFAULT_THRESHOLDS;
      setIsLoading(false);
      setThresholds(thresholds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch thresholds');
      
      // Fall back to defaults
      setThresholds(DEFAULT_THRESHOLDS);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchThresholds();
  }, [fetchThresholds]);

  useEffect(() => {
    fetchThresholds();
  }, [fetchThresholds]);

  return {
    thresholds,
    isLoading,
    error,
    refetch,
  };
} 