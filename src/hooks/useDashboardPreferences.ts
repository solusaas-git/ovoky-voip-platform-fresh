'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { WidgetConfig, DashboardPreferences } from '@/models/DashboardPreferences';

interface UseDashboardPreferencesReturn {
  preferences: DashboardPreferences | null;
  isLoading: boolean;
  updateWidgetConfig: (widgetId: string, updates: Partial<WidgetConfig>) => void;
  updateMultipleWidgets: (updates: WidgetConfig[]) => void;
  reorderWidgets: (reorderedWidgets: WidgetConfig[]) => void;
  toggleWidget: (widgetId: string) => void;
  toggleWidgetCollapse: (widgetId: string) => void;
  toggleWidgetLock: (widgetId: string) => void;
  resizeWidget: (widgetId: string, size: 'small' | 'medium' | 'large' | 'full') => void;
  resizeWidgetGrid: (widgetId: string, gridCols: number, gridRows?: number) => void;
  updateWidgetCategory: (widgetId: string, category: string) => void;
  updateWidgetRefreshInterval: (widgetId: string, interval: number) => void;
  updateWidgetPriority: (widgetId: string, priority: number) => void;
  updateWidgetCollapsible: (widgetId: string, collapsible: boolean) => void;
  updateWidgetGridRows: (widgetId: string, gridRows: number) => void;
  updateWidgetAspectRatio: (widgetId: string, aspectRatio: 'auto' | 'square' | 'wide' | 'tall') => void;
  updateWidgetShowTitle: (widgetId: string, showTitle: boolean) => void;
  updateLayout: (layout: 'grid' | 'list' | 'masonry' | 'custom') => void;
  updateGridColumns: (columns: number) => void;
  toggleCompactMode: () => void;
  toggleAutoSave: () => void;
  toggleShowCategories: () => void;
  updateCategoryOrder: (order: string[]) => void;
  savePreferences: () => Promise<void>;
  refreshWidget: (widgetId: string) => void;
  resetWidget: (widgetId: string) => void;
  resetToDefaults: () => Promise<void>;
  exportPreferences: () => string;
  importPreferences: (data: string) => Promise<boolean>;
  refetch: () => void;
  updateWidgetGridCols: (widgetId: string, gridCols: number) => void;
  forceRefresh: () => Promise<void>;
}

export function useDashboardPreferences(): UseDashboardPreferencesReturn {
  const [preferences, setPreferences] = useState<DashboardPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch preferences from API
  const fetchPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/dashboard/preferences', {
        cache: 'no-store' // Ensure we don't get cached data
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
        setHasUnsavedChanges(false); // Reset unsaved changes when loading fresh data
      } else {
        const errorData = await response.json();
        
        // Don't show toast for suspension errors - let the global handler manage this
        if (response.status === 403 && errorData.code === 'ACCOUNT_SUSPENDED') {
          return; // Let the global suspension handler take over
        }
        
        toast.error(`Failed to load: ${errorData.error || 'Unknown error'}`);
      }
    } catch {
      toast.error('Failed to load dashboard preferences');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save preferences to API
  const savePreferences = useCallback(async () => {
    if (!preferences) return;

    try {
      const response = await fetch('/api/dashboard/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        await response.json();
        setHasUnsavedChanges(false);
        toast.success('Dashboard preferences saved');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        // Don't show toast for suspension errors - let the global handler manage this
        if (response.status === 403 && errorData.code === 'ACCOUNT_SUSPENDED') {
          return; // Let the global suspension handler take over
        }
        
        // Handle specific error cases
        if (response.status === 409) {
          toast.error('Conflict detected. Please refresh the page and try again.');
        } else if (response.status === 400) {
          toast.error(`Invalid data: ${errorData.error || 'Please check your settings'}`);
        } else if (response.status === 401) {
          toast.error('You are not authorized to save preferences. Please log in again.');
        } else {
          toast.error(`Failed to save: ${errorData.error || 'Unknown error'}`);
        }
      }
    } catch {
      toast.error('Failed to save dashboard preferences');
    }
  }, [preferences]);

  // Update a single widget configuration
  const updateWidgetConfig = useCallback((widgetId: string, updates: Partial<WidgetConfig>) => {
    setPreferences(prev => {
      if (!prev || !prev.widgets) return prev;

      const updatedWidgets = prev.widgets.map(widget =>
        widget.id === widgetId ? { ...widget, ...updates } : widget
      );

      return {
        ...prev,
        widgets: updatedWidgets,
        lastUpdated: new Date(),
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  // Update multiple widgets at once
  const updateMultipleWidgets = useCallback((updates: WidgetConfig[]) => {
    setPreferences(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        widgets: updates,
        lastUpdated: new Date(),
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  // Reorder widgets (for drag and drop)
  const reorderWidgets = useCallback((reorderedWidgets: WidgetConfig[]) => {
    // Update the order property based on the new arrangement
    const updatedWidgets = reorderedWidgets.map((widget, index) => ({
      ...widget,
      order: index,
    }));

    updateMultipleWidgets(updatedWidgets);
  }, [updateMultipleWidgets]);

  // Toggle widget visibility
  const toggleWidget = useCallback((widgetId: string) => {
    const widget = preferences?.widgets?.find(w => w.id === widgetId);
    if (widget?.alwaysVisible) {
      toast.warning('This widget cannot be hidden as it contains critical information');
      return;
    }
    
    updateWidgetConfig(widgetId, { 
      enabled: preferences?.widgets?.find(w => w.id === widgetId)?.enabled ? false : true 
    });
  }, [updateWidgetConfig, preferences]);

  // Toggle widget collapse state
  const toggleWidgetCollapse = useCallback((widgetId: string) => {
    const widget = preferences?.widgets?.find(w => w.id === widgetId);
    if (!widget?.collapsible) {
      toast.warning('This widget cannot be collapsed');
      return;
    }
    
    updateWidgetConfig(widgetId, { 
      collapsed: preferences?.widgets?.find(w => w.id === widgetId)?.collapsed ? false : true 
    });
  }, [updateWidgetConfig, preferences]);

  // Toggle widget lock state
  const toggleWidgetLock = useCallback((widgetId: string) => {
    updateWidgetConfig(widgetId, { 
      locked: preferences?.widgets?.find(w => w.id === widgetId)?.locked ? false : true 
    });
  }, [updateWidgetConfig, preferences]);

  // Resize widget
  const resizeWidget = useCallback((widgetId: string, size: 'small' | 'medium' | 'large' | 'full') => {
    const widget = preferences?.widgets?.find(w => w.id === widgetId);
    if (widget?.locked) {
      toast.warning('This widget is locked and cannot be resized');
      return;
    }
    
    updateWidgetConfig(widgetId, { size });
  }, [updateWidgetConfig, preferences]);

  // Resize widget with grid columns/rows
  const resizeWidgetGrid = useCallback((widgetId: string, gridCols: number, gridRows?: number) => {
    const widget = preferences?.widgets?.find(w => w.id === widgetId);
    if (widget?.locked) {
      toast.warning('This widget is locked and cannot be resized');
      return;
    }
    
    // Clamp values to valid ranges
    const clampedCols = Math.max(1, Math.min(gridCols, 12));
    const clampedRows = gridRows ? Math.max(1, Math.min(gridRows, 6)) : undefined;
    
    const updates: Partial<WidgetConfig> = { gridCols: clampedCols };
    if (clampedRows !== undefined) {
      updates.gridRows = clampedRows;
    }
    
    updateWidgetConfig(widgetId, updates);
  }, [updateWidgetConfig, preferences]);

  // Update widget grid columns specifically
  const updateWidgetGridCols = useCallback((widgetId: string, gridCols: number) => {
    resizeWidgetGrid(widgetId, gridCols);
  }, [resizeWidgetGrid]);

  // Update widget category
  const updateWidgetCategory = useCallback((widgetId: string, category: string) => {
    updateWidgetConfig(widgetId, { category });
  }, [updateWidgetConfig]);

  // Update widget refresh interval
  const updateWidgetRefreshInterval = useCallback((widgetId: string, interval: number) => {
    updateWidgetConfig(widgetId, { refreshInterval: interval });
  }, [updateWidgetConfig]);

  // Update widget priority
  const updateWidgetPriority = useCallback((widgetId: string, priority: number) => {
    updateWidgetConfig(widgetId, { priority });
  }, [updateWidgetConfig]);

  // Update widget collapsible property
  const updateWidgetCollapsible = useCallback((widgetId: string, collapsible: boolean) => {
    updateWidgetConfig(widgetId, { collapsible });
  }, [updateWidgetConfig]);

  // Update widget grid rows
  const updateWidgetGridRows = useCallback((widgetId: string, gridRows: number) => {
    const widget = preferences?.widgets.find(w => w.id === widgetId);
    if (widget?.locked) {
      toast.warning('This widget is locked and cannot be resized');
      return;
    }
    
    // Clamp values to valid range
    const clampedRows = Math.max(1, Math.min(gridRows, 6));
    updateWidgetConfig(widgetId, { gridRows: clampedRows });
  }, [updateWidgetConfig, preferences]);

  // Update widget aspect ratio
  const updateWidgetAspectRatio = useCallback((widgetId: string, aspectRatio: 'auto' | 'square' | 'wide' | 'tall') => {
    updateWidgetConfig(widgetId, { aspectRatio });
  }, [updateWidgetConfig]);

  // Update widget show title
  const updateWidgetShowTitle = useCallback((widgetId: string, showTitle: boolean) => {
    updateWidgetConfig(widgetId, { showTitle });
  }, [updateWidgetConfig]);

  // Update layout
  const updateLayout = useCallback((layout: 'grid' | 'list' | 'masonry' | 'custom') => {
    setPreferences(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        layout,
        lastUpdated: new Date(),
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  // Update grid columns
  const updateGridColumns = useCallback((columns: number) => {
    setPreferences(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        gridColumns: columns,
        lastUpdated: new Date(),
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  // Toggle compact mode
  const toggleCompactMode = useCallback(() => {
    setPreferences(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        compactMode: !prev.compactMode,
        lastUpdated: new Date(),
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  // Toggle auto-save
  const toggleAutoSave = useCallback(() => {
    setPreferences(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        autoSave: !prev.autoSave,
        lastUpdated: new Date(),
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  // Toggle show categories
  const toggleShowCategories = useCallback(() => {
    setPreferences(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        showCategories: !prev.showCategories,
        lastUpdated: new Date(),
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  // Update category order
  const updateCategoryOrder = useCallback((order: string[]) => {
    setPreferences(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        categoryOrder: order,
        lastUpdated: new Date(),
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  // Refresh widget (trigger any refresh logic)
  const refreshWidget = useCallback((widgetId: string) => {
    // This would trigger a refresh event for the specific widget
    // The actual refresh logic would be handled by the widget component
    toast.success(`Refreshed ${widgetId} widget`);
  }, []);

  // Reset single widget to defaults
  const resetWidget = useCallback((widgetId: string) => {
    // Get default configuration for the widget (this would come from the API defaults)
    const defaultConfigs: Record<string, Partial<WidgetConfig>> = {
      'welcome': { gridCols: 6, gridRows: 1, size: 'medium', category: 'overview' },
      'balance': { gridCols: 6, gridRows: 1, size: 'medium', category: 'overview' },
      'user-attention': { gridCols: 12, gridRows: 2, size: 'full', category: 'admin' },
      'low-balance-users': { gridCols: 12, gridRows: 2, size: 'full', category: 'admin' },
      'indicator-1': { gridCols: 3, gridRows: 1, size: 'small', category: 'metrics' },
      'indicator-2': { gridCols: 3, gridRows: 1, size: 'small', category: 'metrics' },
      'indicator-3': { gridCols: 3, gridRows: 1, size: 'small', category: 'metrics' },
      'indicator-4': { gridCols: 3, gridRows: 1, size: 'small', category: 'metrics' },
    };

    const defaultConfig = defaultConfigs[widgetId];
    if (defaultConfig) {
      updateWidgetConfig(widgetId, {
        ...defaultConfig,
        enabled: true,
        collapsed: false,
        locked: false,
      });
      toast.success(`Reset ${widgetId} widget to defaults`);
    }
  }, [updateWidgetConfig]);

  // Reset all preferences to defaults
  const resetToDefaults = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard/preferences', {
        method: 'DELETE', // We'd need to add this method to reset
      });
      
      if (response.ok) {
        await fetchPreferences();
        toast.success('Dashboard reset to defaults');
      } else {
        // If DELETE not implemented, we can manually reset
        setPreferences(prev => {
          if (!prev) return prev;
          
          // Reset all widgets to default state
          const resetWidgets = prev.widgets.map(widget => ({
            ...widget,
            enabled: true,
            collapsed: false,
            locked: false,
            size: 'medium' as const,
            gridCols: widget.id === 'user-attention' || widget.id === 'low-balance-users' ? 12 : widget.id.startsWith('indicator') ? 3 : 6,
            gridRows: widget.id === 'user-attention' || widget.id === 'low-balance-users' ? 2 : 1,
          }));

          return {
            ...prev,
            layout: 'grid' as const,
            gridColumns: 12,
            compactMode: false,
            autoSave: true,
            showCategories: false,
            widgets: resetWidgets,
            lastUpdated: new Date(),
          };
        });
        setHasUnsavedChanges(true);
        toast.success('Dashboard reset to defaults');
      }
    } catch {
      toast.error('Failed to reset dashboard');
    }
  }, [fetchPreferences]);

  // Export preferences as JSON
  const exportPreferences = useCallback(() => {
    if (!preferences) return '';
    
    const exportData = {
      ...preferences,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    return JSON.stringify(exportData, null, 2);
  }, [preferences]);

  // Import preferences from JSON
  const importPreferences = useCallback(async (data: string): Promise<boolean> => {
    try {
      const importedData = JSON.parse(data);
      
      // Validate the imported data
      if (!importedData.widgets || !Array.isArray(importedData.widgets)) {
        toast.error('Invalid preferences data');
        return false;
      }
      
      // Apply imported preferences
      setPreferences(prev => ({
        ...prev,
        ...importedData,
        userId: prev?.userId || '', // Keep current user ID
        lastUpdated: new Date(),
      }));
      
      setHasUnsavedChanges(true);
      toast.success('Preferences imported successfully');
      return true;
    } catch {
      toast.error('Failed to import preferences');
      return false;
    }
  }, []);

  // Refetch preferences
  const refetch = useCallback(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Force refresh (bypasses any caching)
  const forceRefresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/dashboard/preferences?' + new Date().getTime(), {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
        setHasUnsavedChanges(false);
        toast.success('Dashboard refreshed from server');
      } else {
        const errorData = await response.json();
        toast.error(`Refresh failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch {
      toast.error('Failed to refresh dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-save preferences when there are unsaved changes
  useEffect(() => {
    if (hasUnsavedChanges && preferences?.autoSave) {
      const timer = setTimeout(() => {
        savePreferences();
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timer);
    }
  }, [hasUnsavedChanges, savePreferences, preferences?.autoSave]);

  // Initial fetch
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading,
    updateWidgetConfig,
    updateMultipleWidgets,
    reorderWidgets,
    toggleWidget,
    toggleWidgetCollapse,
    toggleWidgetLock,
    resizeWidget,
    resizeWidgetGrid,
    updateWidgetCategory,
    updateWidgetRefreshInterval,
    updateWidgetPriority,
    updateWidgetCollapsible,
    updateWidgetGridRows,
    updateWidgetAspectRatio,
    updateWidgetShowTitle,
    updateLayout,
    updateGridColumns,
    toggleCompactMode,
    toggleAutoSave,
    toggleShowCategories,
    updateCategoryOrder,
    savePreferences,
    refreshWidget,
    resetWidget,
    resetToDefaults,
    exportPreferences,
    importPreferences,
    refetch,
    updateWidgetGridCols,
    forceRefresh,
  };
} 