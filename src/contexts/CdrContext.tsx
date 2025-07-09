'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { CdrRow } from '@/lib/sippy/core/types';

// Lightweight CDR interface for dashboard widgets - only essential fields
interface CdrWidget {
  cost: string;                    // For Cost of Day calculations
  duration: number;                // For ACD and Total Minutes calculations
  result: number;                  // For ASR (success/failure) calculations
  payment_currency?: string;       // For currency display
  connect_time: string;           // For time filtering
}



interface CdrKpis {
  costOfDay: number;
  asr: number; // Answer Seizure Ratio (Success Rate)
  acd: number; // Average Call Duration
  totalMinutes: number;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  currency: string;
}

interface ProgressState {
  phase: 'initial' | 'background' | 'complete';
  currentBatch: number;
  totalBatches: number;
  recordsLoaded: number;
  estimatedTotal: number;
  isComplete: boolean;
}

interface CdrContextType {
  cdrs: CdrWidget[];  // Use lightweight interface for dashboard widgets
  kpis: CdrKpis | null;
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  selectedDate: Date;
  progress: ProgressState;
  hasDataLoaded: boolean; // New: Track if data has been manually loaded
  refetch: () => void;
  setSelectedDate: (date: Date) => void;
  loadMetrics: () => void; // New: Manual trigger function
}

const CdrContext = createContext<CdrContextType | undefined>(undefined);

// Account-specific configuration for unlimited fetching
const ACCOUNT_CONFIG = {
  '3': {
    // Account 3 is significantly slower (22s vs 1.5s for same request)
    initialTimeout: 60000,    // 60 seconds for initial requests
    backgroundTimeout: 90000, // 90 seconds for background requests
    initialBatchSize: 500,    // First batch size for quick display
    unlimitedBatchSize: 10000, // Large batches for unlimited fetching
    batchDelay: 2000,        // Longer delays between requests
    description: 'Slow performance account - requires longer timeouts'
  },
  '27': {
    // Account 27 has normal performance
    initialTimeout: 45000,    // 45 seconds for initial requests
    backgroundTimeout: 60000, // 60 seconds for background requests
    initialBatchSize: 500,    // First batch size for quick display
    unlimitedBatchSize: 10000, // Large batches for unlimited fetching
    batchDelay: 500,         // Normal delays
    description: 'Normal performance account'
  },
  'default': {
    // Default configuration for unknown accounts
    initialTimeout: 60000,    // 60 seconds
    backgroundTimeout: 90000, // 90 seconds
    initialBatchSize: 500,    // First batch size for quick display
    unlimitedBatchSize: 10000, // Large batches for unlimited fetching
    batchDelay: 1000,        // Medium delay
    description: 'Default configuration for unknown accounts'
  }
};

const getAccountConfig = (accountId: string) => {
  return ACCOUNT_CONFIG[accountId as keyof typeof ACCOUNT_CONFIG] || ACCOUNT_CONFIG.default;
};

export function CdrProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  const [cdrs, setCdrs] = useState<CdrWidget[]>([]);  // Use lightweight interface
  const [kpis, setKpis] = useState<CdrKpis | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Changed: Start as false, no auto-loading
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [hasDataLoaded, setHasDataLoaded] = useState(false); // New: Track manual loading
  const [progress, setProgress] = useState<ProgressState>({
    phase: 'initial',
    currentBatch: 0,
    totalBatches: 0,
    recordsLoaded: 0,
    estimatedTotal: 0,
    isComplete: false
  });
  
  // Initialize with today's date in local timezone
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    // Reset to start of day in local timezone
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  });

  const calculateKpis = useCallback((cdrs: CdrWidget[]): CdrKpis => {
    if (!cdrs || cdrs.length === 0) {
      return {
        costOfDay: 0,
        asr: 0,
        acd: 0,
        totalMinutes: 0,
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        currency: '',
      };
    }

    let totalCost = 0;
    let totalDuration = 0;
    let successfulCalls = 0;
    let failedCalls = 0;
    let currency = '';

    cdrs.forEach(cdr => {
      const cost = parseFloat(cdr.cost) || 0;
      const duration = cdr.duration || 0;
      
      totalCost += cost;
      totalDuration += duration;
      
      // Get currency from first CDR that has it
      if (!currency && cdr.payment_currency) {
        currency = cdr.payment_currency;
      }
      
      // Count successful vs failed calls based on result code
      // According to Sippy documentation: result 0 or 200 = successful
      if (cdr.result === 0 || cdr.result === 200) {
        successfulCalls++;
      } else {
        failedCalls++;
      }
    });

    const totalCalls = cdrs.length;
    const asr = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
    const acd = successfulCalls > 0 ? totalDuration / successfulCalls : 0;
    const totalMinutes = totalDuration / 60;

    return {
      costOfDay: totalCost,
      asr,
      acd,
      totalMinutes,
      totalCalls,
      successfulCalls,
      failedCalls,
      currency: currency || 'USD',
    };
  }, []);

  // Update KPIs when CDRs change
  useEffect(() => {
    const kpisToUse = calculateKpis(cdrs);
    setKpis(kpisToUse);
    
    if (cdrs.length > 0) {
      setLastRefresh(new Date());
    }
  }, [cdrs, calculateKpis]);

  const fetchCDRBatch = async (
    accountId: string,
    offset: number,
    limit: number,
    startDate?: string,
    endDate?: string,
    isBackground = false
  ): Promise<{ cdrs: CdrWidget[]; hasMore: boolean }> => {
    const config = getAccountConfig(accountId);
    const timeout = isBackground ? config.backgroundTimeout : config.initialTimeout;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Use the same request pattern as the working CDR test page
      const requestBody = {
        i_account: accountId,
        limit: limit.toString(),
        offset: offset.toString(),
        type: 'all', // Get all CDRs for comprehensive KPI calculations
        mode: 'optimized', // Use optimized parsing for dashboard widgets (essential fields only)
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate })
      };

      // Use the working CDR API endpoint (same as test page)
      const response = await fetch(`/api/sippy/account/${accountId}/cdrs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`HTTP ${response.status}: ${errorData.error || 'Failed to fetch CDRs'}`);
      }

      const data = await response.json();
      
      // Handle both old and new API response formats
      const fullCdrs = data.success ? (data.cdrs || []) : (data.cdrs || []);
      
      // Convert full CDR objects to lightweight CdrWidget objects
      const cdrs: CdrWidget[] = fullCdrs.map((cdr: any) => ({
        cost: cdr.cost?.toString() || '0',
        duration: cdr.duration || 0,
        result: cdr.result || 0,
        payment_currency: cdr.payment_currency || undefined,
        connect_time: cdr.connect_time || ''
      }));

      // Determine if there are more CDRs to fetch
      const hasMore = cdrs.length === limit;

      return { cdrs, hasMore };
    } catch (error) {
      // Handle timeout errors gracefully
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`CDR fetch timed out after ${timeout}ms. Try selecting a shorter date range.`);
        }
        
        // Re-throw with context
        throw new Error(`Failed to fetch CDRs: ${error.message}`);
      }
      
      throw new Error('An unknown error occurred while fetching CDRs');
    }
  };

  const fetchCDRsUnlimited = async (accountId: string, startDate?: string, endDate?: string) => {
    const config = getAccountConfig(accountId);

    setIsLoading(true);
    setError(null);
    setProgress({
      phase: 'initial',
      currentBatch: 0,
      totalBatches: 1, // Start with 1, will update as we go
      recordsLoaded: 0,
      estimatedTotal: 0, // No estimation for unlimited
      isComplete: false
    });

    let allCdrs: CdrWidget[] = [];
    let offset = 0;
    let batchCount = 0;
    let hasMore = true;

    try {
      // Phase 1: Initial batch for quick display
      if (hasMore) {
        const result = await fetchCDRBatch(accountId, offset, config.initialBatchSize, startDate, endDate, false);

        allCdrs = [...allCdrs, ...result.cdrs];
        hasMore = result.hasMore;
        offset += result.cdrs.length;
        batchCount++;

        setProgress({
          phase: 'initial',
          currentBatch: 1,
          totalBatches: hasMore ? 2 : 1,
          recordsLoaded: allCdrs.length,
          estimatedTotal: 0,
          isComplete: !hasMore
        });

        setCdrs(allCdrs);

        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, config.batchDelay));
        }
      }

      // Phase 2: UNLIMITED background fetching
      if (hasMore) {
        setProgress(prev => ({
          ...prev,
          phase: 'background'
        }));
        
        let consecutiveEmptyBatches = 0;
        const maxConsecutiveEmpty = 3; // Safety check
        
        while (hasMore && consecutiveEmptyBatches < maxConsecutiveEmpty) {
          const result = await fetchCDRBatch(accountId, offset, config.unlimitedBatchSize, startDate, endDate, true);

          if (result.cdrs.length === 0) {
            consecutiveEmptyBatches++;
          } else {
            consecutiveEmptyBatches = 0; // Reset counter
          }

          allCdrs = [...allCdrs, ...result.cdrs];
          hasMore = result.hasMore && result.cdrs.length > 0;
          offset += result.cdrs.length;
          batchCount++;

          setProgress({
            phase: 'background',
            currentBatch: batchCount,
            totalBatches: hasMore ? batchCount + 1 : batchCount,
            recordsLoaded: allCdrs.length,
            estimatedTotal: 0, // No estimation for unlimited
            isComplete: !hasMore
          });

          setCdrs(allCdrs);

          if (hasMore && consecutiveEmptyBatches === 0) {
            await new Promise(resolve => setTimeout(resolve, config.batchDelay));
          }
        }
      }

      const finalProgress = {
        phase: 'complete' as const,
        currentBatch: batchCount,
        totalBatches: batchCount,
        recordsLoaded: allCdrs.length,
        estimatedTotal: 0,
        isComplete: true
      };

      setProgress(finalProgress);

    } catch (error) {
      console.error('❌ Error in unlimited CDR fetch:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch CDRs');
      setProgress(prev => ({ ...prev, isComplete: true }));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCdrsForDate = useCallback(async (targetDate?: Date) => {
    if (!user?.sippyAccountId) {
      setError('No account ID available');
      setIsLoading(false);
      return;
    }

    // Use the provided targetDate or the current selectedDate
    const dateToFetch = targetDate || selectedDate;

    try {
      setIsLoading(true);
      setError(null);
      setHasDataLoaded(true); // Mark that data has been manually loaded

      // Create date boundaries for the selected date
      const startOfDay = new Date(dateToFetch.getFullYear(), dateToFetch.getMonth(), dateToFetch.getDate(), 0, 0, 0);
      const endOfDay = new Date(dateToFetch.getFullYear(), dateToFetch.getMonth(), dateToFetch.getDate(), 23, 59, 59);

      // Fetch CDRs for the specific date
      await fetchCDRsUnlimited(
        user.sippyAccountId.toString(), 
        startOfDay.toISOString(), 
        endOfDay.toISOString()
      );

      setLastRefresh(new Date());

    } catch (error) {
      console.error('❌ Error in CDR fetch for date:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch CDRs');
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedDate]);

  // Manual date change handler that resets loading state
  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date);
    setHasDataLoaded(false); // Reset loading state when date changes
    setCdrs([]); // Clear previous data
    setKpis(null);
    setError(null);
  }, []);

  return (
    <CdrContext.Provider
      value={{
        cdrs,
        kpis,
        isLoading,
        error,
        lastRefresh,
        selectedDate,
        progress,
        hasDataLoaded,
        refetch: () => fetchCdrsForDate(),
        setSelectedDate: handleDateChange,
        loadMetrics: () => fetchCdrsForDate()
      }}
    >
      {children}
    </CdrContext.Provider>
  );
}

export function useCdr() {
  const context = useContext(CdrContext);
  if (context === undefined) {
    throw new Error('useCdr must be used within a CdrProvider');
  }
  return context;
}