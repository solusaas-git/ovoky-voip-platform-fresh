'use client';

import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { useAuth } from '@/lib/AuthContext';
import { useSippyAccount } from '@/hooks/useSippyAccount';
import { useDashboardPreferences } from '@/hooks/useDashboardPreferences';
import { useUserNotificationSettings } from '@/hooks/useUserNotificationSettings';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { DashboardSettings } from '@/components/dashboard/DashboardSettings';
import { UserAttentionCard } from '@/components/admin/UserAttentionCard';
import { LowBalanceUsersCard } from '@/components/admin/LowBalanceUsersCard';
import { CostOfDayWidget } from '@/components/dashboard/CostOfDayWidget';
import { AsrWidget } from '@/components/dashboard/AsrWidget';
import { AcdWidget } from '@/components/dashboard/AcdWidget';
import { TotalMinutesWidget } from '@/components/dashboard/TotalMinutesWidget';
import { CdrProvider, useCdr } from '@/contexts/CdrContext';
import { BalanceTopup } from '@/components/payments/BalanceTopup';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from '@/lib/i18n';

import { User, TrendingUp, Activity, Clock, Wallet, AlertTriangle, TrendingDown, DollarSign, Ticket, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  rectSortingStrategy 
} from '@dnd-kit/sortable';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { IWidgetConfig } from '@/models/DashboardPreferences';
import { DateSelector } from '@/components/dashboard/DateSelector';
import { UnsolvedTicketsCard } from '@/components/admin/UnsolvedTicketsCard';
import { PhoneNumberRequestsCard } from '@/components/admin/PhoneNumberRequestsCard';

export default function DashboardPage() {
  const { t } = useTranslations();
  
  return (
    <MainLayout>
      <PageLayout
        title={t('dashboard.page.title')}
        description={t('dashboard.page.description')}
      >
        <CdrProvider>
          <DashboardContent />
        </CdrProvider>
      </PageLayout>
    </MainLayout>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const { t } = useTranslations();
  const { accountInfo, isLoading: accountLoading, refetch } = useSippyAccount(user?.sippyAccountId);
  const { settings: notificationSettings, isLoading: notificationLoading } = useUserNotificationSettings();
  const { 
    refetch: refetchCdrData, 
    selectedDate, 
    setSelectedDate, 
    isLoading: cdrLoading,
    progress
  } = useCdr();
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Local state for temporary widget states when edit mode is off
  const [tempWidgetStates, setTempWidgetStates] = useState<Record<string, { collapsed?: boolean }>>({});

  const {
    preferences,
    updateWidgetConfig,
    reorderWidgets,
    toggleWidget,
    toggleWidgetCollapse,
    toggleWidgetLock,
    resizeWidget,
    updateWidgetGridCols,
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
    savePreferences,
    resetToDefaults,
    exportPreferences,
    importPreferences,
    refreshWidget,
  } = useDashboardPreferences();

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Format balance for display
  const formatBalance = (balance: number | undefined) => {
    if (balance === undefined || balance === null) return '0.0000';
    return balance.toFixed(4);
  };

  // Get actual balance (Sippy API returns inverted values)
  const getActualBalance = () => {
    if (!accountInfo?.balance) return 0;
    return -accountInfo.balance;
  };

  const actualBalance = getActualBalance();

  // Format account name for display
  const getAccountDisplayName = () => {
    if (!accountInfo) return 'N/A';
    
    // Priority order: company_name > first_name + last_name > username
    if (accountInfo.company_name?.trim()) {
      return accountInfo.company_name.trim();
    }
    
    if (accountInfo.first_name?.trim() || accountInfo.last_name?.trim()) {
      const firstName = accountInfo.first_name?.trim() || '';
      const lastName = accountInfo.last_name?.trim() || '';
      return `${firstName} ${lastName}`.trim();
    }
    
    if (accountInfo.username?.trim()) {
      return accountInfo.username.trim();
    }
    
    return `Account #${user?.sippyAccountId || 'N/A'}`;
  };

  // Get widget configuration by ID with temporary state overlay
  const getWidgetConfig = (widgetId: string) => {
    const baseConfig = preferences?.widgets.find(w => w.id === widgetId) || {
      id: widgetId,
      enabled: true,
      collapsed: false,
      collapsible: true,
      order: 0,
      size: 'medium' as const,
      gridCols: 3,
      gridRows: 1,
      locked: false,
      alwaysVisible: false,
      category: 'general',
      aspectRatio: 'auto' as const,
      refreshInterval: 0,
      priority: 5,
      showTitle: true,
    };

    // Apply temporary states when not in edit mode
    if (!isEditMode && tempWidgetStates[widgetId]) {
      return {
        ...baseConfig,
        ...tempWidgetStates[widgetId],
      };
    }

    return baseConfig;
  };

  // Sort widgets by order
  const sortedWidgets = useMemo(() => {
    if (!preferences?.widgets) return [];
    return [...preferences.widgets].sort((a, b) => a.order - b.order);
  }, [preferences?.widgets]);

  // Group widgets by category if enabled
  const groupedWidgets = useMemo(() => {
    if (!preferences?.showCategories) {
      return { all: sortedWidgets };
    }

    const groups: Record<string, typeof sortedWidgets> = {};
    sortedWidgets.forEach(widget => {
      const category = widget.category || 'general';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(widget);
    });

    return groups;
  }, [sortedWidgets, preferences?.showCategories]);

  // Get widget IDs for sortable context
  const widgetIds = useMemo(() => {
    return sortedWidgets.map(w => w.id);
  }, [sortedWidgets]);

  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = widgetIds.indexOf(active.id as string);
      const newIndex = widgetIds.indexOf(over.id as string);
      
      const reorderedWidgetIds = arrayMove(widgetIds, oldIndex, newIndex);
      const reorderedWidgets = reorderedWidgetIds.map(id => 
        sortedWidgets.find(w => w.id === id)!
      );
      
      reorderWidgets(reorderedWidgets);
      setHasUnsavedChanges(true);
    }
  };

  // Handle widget actions
  const handleToggleCollapse = (widgetId: string) => {
    if (isEditMode) {
      // In edit mode: save to preferences
      toggleWidgetCollapse(widgetId);
      setHasUnsavedChanges(true);
    } else {
      // Not in edit mode: save to temporary local state only
      setTempWidgetStates(prev => {
        const currentConfig = getWidgetConfig(widgetId);
        return {
          ...prev,
          [widgetId]: {
            ...prev[widgetId],
            collapsed: !currentConfig.collapsed,
          },
        };
      });
    }
  };

  const handleToggleEnabled = (widgetId: string) => {
    if (!isEditMode) return; // Only allow in edit mode
    toggleWidget(widgetId);
    setHasUnsavedChanges(true);
  };

  const handleToggleLock = (widgetId: string) => {
    if (!isEditMode) return; // Only allow in edit mode
    toggleWidgetLock(widgetId);
    setHasUnsavedChanges(true);
  };

  const handleResize = (widgetId: string, size: 'small' | 'medium' | 'large' | 'full') => {
    if (!isEditMode) return; // Only allow in edit mode
    resizeWidget(widgetId, size);
    setHasUnsavedChanges(true);
  };

  const handleGridColsChange = (widgetId: string, gridCols: number) => {
    if (!isEditMode) return; // Only allow in edit mode
    updateWidgetGridCols(widgetId, gridCols);
    setHasUnsavedChanges(true);
  };

  const handleGridRowsChange = (widgetId: string, gridRows: number) => {
    if (!isEditMode) return; // Only allow in edit mode
    updateWidgetGridRows(widgetId, gridRows);
    setHasUnsavedChanges(true);
  };

  const handleToggleCollapsible = (widgetId: string, collapsible: boolean) => {
    if (!isEditMode) return; // Only allow in edit mode
    updateWidgetCollapsible(widgetId, collapsible);
    setHasUnsavedChanges(true);
  };

  const handleUpdateCategory = (widgetId: string, category: string) => {
    if (!isEditMode) return; // Only allow in edit mode
    updateWidgetCategory(widgetId, category);
    setHasUnsavedChanges(true);
  };

  const handleUpdateAspectRatio = (widgetId: string, aspectRatio: 'auto' | 'square' | 'wide' | 'tall') => {
    if (!isEditMode) return; // Only allow in edit mode
    updateWidgetAspectRatio(widgetId, aspectRatio);
    setHasUnsavedChanges(true);
  };

  const handleUpdateRefreshInterval = (widgetId: string, interval: number) => {
    if (!isEditMode) return; // Only allow in edit mode
    updateWidgetRefreshInterval(widgetId, interval);
    setHasUnsavedChanges(true);
  };

  const handleUpdatePriority = (widgetId: string, priority: number) => {
    if (!isEditMode) return; // Only allow in edit mode
    updateWidgetPriority(widgetId, priority);
    setHasUnsavedChanges(true);
  };

  const handleToggleShowTitle = (widgetId: string, showTitle: boolean) => {
    if (!isEditMode) return; // Only allow in edit mode
    updateWidgetShowTitle(widgetId, showTitle);
    setHasUnsavedChanges(true);
  };

  const handleWidgetSettingChange = (widgetId: string, settingKey: string, settingValue: unknown) => {
    updateWidgetConfig(widgetId, { 
      settings: { 
        ...getWidgetConfig(widgetId).settings, 
        [settingKey]: settingValue 
      } 
    });
    setHasUnsavedChanges(true);
  };

  const handleRefreshWidget = (widgetId: string) => {
    refreshWidget(widgetId);
    
    // For balance widget, also refresh the Sippy account data
    if (widgetId === 'balance') {
      refetch();
    }
    
    // For KPI indicator widgets, refresh CDR data using centralized context
    if (['indicator-1', 'indicator-2', 'indicator-3', 'indicator-4'].includes(widgetId)) {
      console.log(`🔄 Refreshing CDR data for widget: ${widgetId}`);
      refetchCdrData();
    }
  };

  // Handle dashboard settings
  const handleToggleEditMode = () => {
    const newEditMode = !isEditMode;
    setIsEditMode(newEditMode);
    
    // Clear temporary states when entering edit mode
    if (newEditMode) {
      setTempWidgetStates({});
    }
  };

  const handleUpdateLayout = (layout: 'grid' | 'list' | 'masonry' | 'custom') => {
    updateLayout(layout);
    setHasUnsavedChanges(true);
  };

  const handleUpdateGridColumns = (columns: number) => {
    updateGridColumns(columns);
    setHasUnsavedChanges(true);
  };

  const handleToggleCompactMode = () => {
    toggleCompactMode();
    setHasUnsavedChanges(true);
  };

  const handleToggleAutoSave = () => {
    toggleAutoSave();
    setHasUnsavedChanges(true);
  };

  const handleToggleShowCategories = () => {
    toggleShowCategories();
    setHasUnsavedChanges(true);
  };

  const handleSavePreferences = async () => {
    await savePreferences();
    setHasUnsavedChanges(false);
  };

  const handleResetToDefaults = async () => {
    await resetToDefaults();
    setHasUnsavedChanges(false);
    setTempWidgetStates({}); // Clear temporary states
  };

  // Widget Components
  const WelcomeWidget = () => (
    <div className="space-y-3">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">{t('dashboard.welcome', { name: user?.name || 'User' })}</h3>
          <p className="text-sm text-muted-foreground capitalize">
            {user?.role || t('common.loading')} {t('dashboard.account')}
          </p>
        </div>
      </div>
    </div>
  );

  const BalanceWidget = () => {
    // Get balance status based on thresholds
    const getBalanceStatus = () => {
      if (accountLoading || notificationLoading) return 'loading';
      
      const threshold = notificationSettings?.lowBalanceThreshold || 10;
      
      if (actualBalance <= 0) return 'critical'; // Red - zero or negative
      if (actualBalance < 5) return 'warning'; // Orange - less than 5 euros
      if (actualBalance < threshold) return 'low'; // Yellow - below threshold
      return 'good'; // Green - above threshold
    };

    const balanceStatus = getBalanceStatus();

    // Get colors and styling based on status
    const getStatusConfig = () => {
      switch (balanceStatus) {
        case 'critical':
          return {
            bgGradient: 'bg-gradient-to-br from-red-500 via-red-600 to-red-700',
            textPrimary: 'text-white',
            textSecondary: 'text-red-100',
            textAmount: 'text-white',
            textCurrency: 'text-red-100',
            textMuted: 'text-red-200',
            icon: <AlertTriangle className="h-6 w-6 text-white" />,
            badge: { variant: 'secondary' as const, text: t('dashboard.widgets.balance.status.critical'), color: 'bg-red-800/50 text-red-100 border-red-700' },
            alert: {
              bg: 'bg-red-800/30',
              border: 'border-red-600',
              text: 'text-red-100',
              message: t('dashboard.widgets.balance.alerts.critical')
            },
            glow: 'shadow-red-500/25',
            pulse: 'animate-pulse'
          };
        case 'warning':
          return {
            bgGradient: 'bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700',
            textPrimary: 'text-white',
            textSecondary: 'text-orange-100',
            textAmount: 'text-white',
            textCurrency: 'text-orange-100',
            textMuted: 'text-orange-200',
            icon: <TrendingDown className="h-6 w-6 text-white" />,
            badge: { variant: 'secondary' as const, text: t('dashboard.widgets.balance.status.warning'), color: 'bg-orange-800/50 text-orange-100 border-orange-700' },
            alert: {
              bg: 'bg-orange-800/30',
              border: 'border-orange-600',
              text: 'text-orange-100',
              message: t('dashboard.widgets.balance.alerts.warning')
            },
            glow: 'shadow-orange-500/25',
            pulse: ''
          };
        case 'low':
          return {
            bgGradient: 'bg-gradient-to-br from-yellow-500 via-yellow-600 to-yellow-700',
            textPrimary: 'text-white',
            textSecondary: 'text-yellow-100',
            textAmount: 'text-white',
            textCurrency: 'text-yellow-100',
            textMuted: 'text-yellow-200',
            icon: <Wallet className="h-6 w-6 text-white" />,
            badge: { variant: 'secondary' as const, text: t('dashboard.widgets.balance.status.low'), color: 'bg-yellow-800/50 text-yellow-100 border-yellow-700' },
            alert: {
              bg: 'bg-yellow-800/30',
              border: 'border-yellow-600',
              text: 'text-yellow-100',
              message: t('dashboard.widgets.balance.alerts.low', { threshold: notificationSettings?.lowBalanceThreshold?.toFixed(2) || '10.00' })
            },
            glow: 'shadow-yellow-500/25',
            pulse: ''
          };
        case 'good':
          return {
            bgGradient: 'bg-gradient-to-br from-emerald-500 via-green-600 to-emerald-700',
            textPrimary: 'text-white',
            textSecondary: 'text-emerald-100',
            textAmount: 'text-white',
            textCurrency: 'text-emerald-100',
            textMuted: 'text-emerald-200',
            icon: <DollarSign className="h-6 w-6 text-white" />,
            badge: { variant: 'secondary' as const, text: t('dashboard.widgets.balance.status.good'), color: 'bg-emerald-800/50 text-emerald-100 border-emerald-700' },
            alert: null,
            glow: 'shadow-emerald-500/25',
            pulse: ''
          };
        default: // loading
          return {
            bgGradient: 'bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600',
            textPrimary: 'text-white',
            textSecondary: 'text-gray-100',
            textAmount: 'text-white',
            textCurrency: 'text-gray-100',
            textMuted: 'text-gray-200',
            icon: <Wallet className="h-6 w-6 text-white animate-pulse" />,
            badge: null,
            alert: null,
            glow: 'shadow-gray-500/25',
            pulse: 'animate-pulse'
          };
      }
    };

    const config = getStatusConfig();

    return (
      <div className={`space-y-4 p-4 rounded-xl ${config.bgGradient} ${config.glow} shadow-lg ${config.pulse}`}>
        {/* Main Balance Display */}
        <div className="relative">
          <div className="flex items-center space-x-4">
            {/* Icon with Glow Effect */}
            <div className={`
              relative w-14 h-14 rounded-xl flex items-center justify-center 
              bg-muted/20 backdrop-blur-sm border border-muted/30
              hover:bg-muted/30 transition-all duration-300
            `}>
              {config.icon}
              {/* Subtle shine effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-muted/20 via-transparent to-transparent" />
            </div>

            {/* Balance Information */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline space-x-2 mb-2">
                {accountLoading || notificationLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-24 bg-muted/20 rounded animate-pulse" />
                    <div className="h-6 w-12 bg-muted/20 rounded animate-pulse" />
                  </div>
                ) : (
                  <>
                    <span className={`text-3xl font-bold tracking-tight ${config.textAmount}`}>
                      €{formatBalance(actualBalance)}
                    </span>
                    <span className={`text-sm font-medium ${config.textCurrency}`}>
                      EUR
                    </span>
                  </>
                )}
              </div>

              {/* Status Badge - Only show in edit mode */}
              {isEditMode && config.badge && (
                <Badge 
                  variant={config.badge.variant} 
                  className={`text-xs font-medium ${config.badge.color}`}
                >
                  {config.badge.text}
                </Badge>
              )}
            </div>

            {/* Threshold Indicator */}
            {!accountLoading && !notificationLoading && notificationSettings && (
              <div className="text-right">
                <div className={`text-xs ${config.textMuted} mb-1`}>{t('dashboard.widgets.balance.alerts.threshold')}</div>
                <div className={`text-sm font-medium ${config.textSecondary}`}>
                  €{notificationSettings.lowBalanceThreshold.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Account Information */}
        <div className={`flex items-center justify-between text-xs ${config.textMuted} px-1`}>
          <span className="flex items-center space-x-1">
            <span>{t('dashboard.widgets.balance.alerts.account')}</span>
            <code className="bg-muted/20 px-1 py-0.5 rounded text-xs backdrop-blur-sm">
              {getAccountDisplayName()}
            </code>
          </span>
          <span className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${
              accountLoading ? 'bg-yellow-300 animate-pulse' : 'bg-muted'
            }`} />
            <span>{accountLoading ? t('dashboard.widgets.balance.alerts.updating') : t('dashboard.widgets.balance.alerts.live')}</span>
          </span>
        </div>

        {/* Alert Message */}
        {config.alert && (
          <div className={`
            p-3 rounded-lg border ${config.alert.bg} ${config.alert.border}
            transition-all duration-300 hover:shadow-md backdrop-blur-sm
          `}>
            <div className={`flex items-start space-x-2 text-xs ${config.alert.text}`}>
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium mb-1">{config.alert.message}</div>
                <div className="text-xs opacity-75">
                  {t('dashboard.widgets.balance.alerts.topupMessage')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Balance Trend Visualization */}
        {!accountLoading && !notificationLoading && (
          <div className={`flex items-center justify-between text-xs ${config.textMuted}`}>
            <div className="flex items-center space-x-2">
              <span>{t('dashboard.widgets.balance.alerts.statusLabel')}</span>
              <div className={`flex items-center space-x-1 ${config.textSecondary}`}>
                {balanceStatus === 'good' && <TrendingUp className="w-3 h-3" />}
                {balanceStatus === 'low' && <Activity className="w-3 h-3" />}
                {(balanceStatus === 'warning' || balanceStatus === 'critical') && <TrendingDown className="w-3 h-3" />}
                <span className="capitalize font-medium">{balanceStatus}</span>
              </div>
            </div>
            <div>
              {t('dashboard.widgets.balance.alerts.lastUpdated', { time: new Date().toLocaleTimeString() })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render widgets grouped by category or all together
  const renderWidgets = () => {
    if (preferences?.showCategories) {
      return (
        <div className="space-y-6">
          {Object.entries(groupedWidgets).map(([category, widgets]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-4 capitalize">{category}</h3>
              <div className={cn(
                "grid gap-6 transition-all duration-200 auto-rows-min",
                getGridContainerClasses(),
                preferences?.compactMode && "gap-4"
              )}>
                {widgets.map(widget => renderWidget(widget))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className={cn(
        "grid gap-6 transition-all duration-200 auto-rows-min",
        getGridContainerClasses(),
        preferences?.compactMode && "gap-4"
      )}>
        {sortedWidgets.map(widget => renderWidget(widget))}
      </div>
    );
  };

  // Get grid container classes based on layout and grid columns
  const getGridContainerClasses = () => {
    const gridCols = preferences?.gridColumns || 12;
    
    switch (preferences?.layout) {
      case 'list':
        return 'grid-cols-1';
      case 'masonry':
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 'custom':
      case 'grid':
      default:
        // Use CSS Grid with the specified number of columns
        if (gridCols <= 12) {
          switch (gridCols) {
            case 6: return 'grid-cols-6';
            case 8: return 'grid-cols-8';
            case 10: return 'grid-cols-10';
            case 12: return 'grid-cols-12';
            default: return 'grid-cols-12';
          }
        } else {
          // For more than 12 columns, use a custom CSS variable approach
          return 'grid-cols-12'; // Fallback to 12 for now
        }
    }
  };

  // Render individual widget
  const renderWidget = (widget: IWidgetConfig) => {
    const widgetConfig = getWidgetConfig(widget.id);

    // Skip disabled widgets unless in edit mode
    if (!widgetConfig.enabled && !isEditMode) {
      return null;
    }

    // Role-based access control for admin widgets
    if ((widget.id === 'user-attention' || widget.id === 'low-balance-users' || widget.id === 'unsolved-tickets') && user?.role !== 'admin') {
      console.log(`🔒 Hiding admin widget '${widget.id}' from user role: ${user?.role}`);
      return null;
    }

    const commonProps = {
      id: widget.id,
      collapsed: widgetConfig.collapsed,
      collapsible: widgetConfig.collapsible,
      enabled: widgetConfig.enabled,
      size: widgetConfig.size,
      gridCols: widgetConfig.gridCols,
      gridRows: widgetConfig.gridRows,
      locked: widgetConfig.locked,
      alwaysVisible: widgetConfig.alwaysVisible,
      minSize: widgetConfig.minSize,
      maxSize: widgetConfig.maxSize,
      category: widgetConfig.category,
      aspectRatio: widgetConfig.aspectRatio,
      refreshInterval: widgetConfig.refreshInterval,
      priority: widgetConfig.priority,
      showTitle: widgetConfig.showTitle,
      onToggleCollapse: () => handleToggleCollapse(widget.id),
      onToggleEnabled: () => handleToggleEnabled(widget.id),
      onToggleLock: () => handleToggleLock(widget.id),
      onResize: (size: 'small' | 'medium' | 'large' | 'full') => handleResize(widget.id, size),
      onGridColsChange: (gridCols: number) => handleGridColsChange(widget.id, gridCols),
      onGridRowsChange: (gridRows: number) => handleGridRowsChange(widget.id, gridRows),
      onToggleCollapsible: (collapsible: boolean) => handleToggleCollapsible(widget.id, collapsible),
      onUpdateCategory: (category: string) => handleUpdateCategory(widget.id, category),
      onUpdateAspectRatio: (aspectRatio: 'auto' | 'square' | 'wide' | 'tall') => handleUpdateAspectRatio(widget.id, aspectRatio),
      onUpdateRefreshInterval: (interval: number) => handleUpdateRefreshInterval(widget.id, interval),
      onUpdatePriority: (priority: number) => handleUpdatePriority(widget.id, priority),
      onToggleShowTitle: (showTitle: boolean) => handleToggleShowTitle(widget.id, showTitle),
      onSettingChange: (settingKey: string, settingValue: unknown) => handleWidgetSettingChange(widget.id, settingKey, settingValue),
      onRefresh: () => handleRefreshWidget(widget.id),
      isEditMode,
      isDraggable: true,
      compactMode: preferences?.compactMode || false,
    };

    switch (widget.id) {
      case 'welcome':
        return (
          <DashboardCard
            key={widget.id}
            title={t('dashboard.widgets.welcome.title')}
            icon={<User className="h-4 w-4" />}
            {...commonProps}
          >
            <WelcomeWidget />
          </DashboardCard>
        );

      case 'balance':
        return (
          <DashboardCard
            key={widget.id}
            title={t('dashboard.widgets.balance.title')}
            icon={<Wallet className="h-4 w-4" />}
            headerActions={<BalanceTopup size="sm" onPaymentSuccess={() => refetch()} />}
            {...commonProps}
          >
            <BalanceWidget />
          </DashboardCard>
        );

      case 'indicator-1':
        return (
          <DashboardCard
            key={widget.id}
            title={t('dashboard.widgets.costOfDay.title')}
            icon={<DollarSign className="h-4 w-4" />}
            {...commonProps}
          >
            <CostOfDayWidget />
          </DashboardCard>
        );

      case 'indicator-2':
        return (
          <DashboardCard
            key={widget.id}
            title={t('dashboard.widgets.asr.title')}
            icon={<TrendingUp className="h-4 w-4" />}
            {...commonProps}
          >
            <AsrWidget />
          </DashboardCard>
        );

      case 'indicator-3':
        return (
          <DashboardCard
            key={widget.id}
            title={t('dashboard.widgets.acd.title')}
            icon={<Clock className="h-4 w-4" />}
            {...commonProps}
          >
            <AcdWidget />
          </DashboardCard>
        );

      case 'indicator-4':
        return (
          <DashboardCard
            key={widget.id}
            title={t('dashboard.widgets.totalMinutes.title')}
            icon={<Activity className="h-4 w-4" />}
            {...commonProps}
          >
            <TotalMinutesWidget />
          </DashboardCard>
        );

      case 'user-attention':
        return user?.role === 'admin' ? (
          <DashboardCard
            key={widget.id}
            title={t('dashboard.widgets.userAttention.title')}
            icon={<AlertTriangle className="h-4 w-4" />}
            {...commonProps}
          >
            <UserAttentionCard />
          </DashboardCard>
        ) : null;

      case 'low-balance-users':
        return user?.role === 'admin' ? (
          <DashboardCard
            key={widget.id}
            title={t('dashboard.widgets.lowBalanceUsers.title')}
            icon={<Wallet className="h-4 w-4" />}
            {...commonProps}
          >
            <LowBalanceUsersCard />
          </DashboardCard>
        ) : null;

      case 'date-selector':
        return (
          <DashboardCard
            key={widget.id}
            title={t('dashboard.widgets.dateSelector.title')}
            icon={<Clock className="h-4 w-4" />}
            {...commonProps}
          >
            <DateSelector
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              isLoading={cdrLoading}
              progress={progress}
            />
          </DashboardCard>
        );

      case 'unsolved-tickets':
        return user?.role === 'admin' ? (
          <DashboardCard
            key={widget.id}
            title={t('dashboard.widgets.unsolvedTickets.title')}
            icon={<Ticket className="h-4 w-4" />}
            {...commonProps}
          >
            <UnsolvedTicketsCard 
              onRefresh={() => handleRefreshWidget(widget.id)}
              limit={10}
              isEditMode={isEditMode}
            />
          </DashboardCard>
        ) : null;

      case 'phone-number-requests':
        return user?.role === 'admin' ? (
          <DashboardCard
            key={widget.id}
            title={t('dashboard.widgets.phoneNumberRequests.title')}
            icon={<Phone className="h-4 w-4" />}
            {...commonProps}
          >
            <PhoneNumberRequestsCard 
              onRefresh={() => handleRefreshWidget(widget.id)}
              limit={10}
              isEditMode={isEditMode}
            />
          </DashboardCard>
        ) : null;

      default:
        return (
          <DashboardCard
            key={widget.id}
            title={`Widget ${widget.id}`}
            icon={<Activity className="h-4 w-4" />}
            {...commonProps}
          >
            <div className="space-y-2">
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">{t('dashboard.widgets.placeholder.content', { widgetId: widget.id })}</p>
            </div>
          </DashboardCard>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Settings */}
      <DashboardSettings
        preferences={preferences}
        isEditMode={isEditMode}
        hasUnsavedChanges={hasUnsavedChanges}
        onToggleEditMode={handleToggleEditMode}
        onToggleWidget={handleToggleEnabled}
        onUpdateLayout={handleUpdateLayout}
        onUpdateGridColumns={handleUpdateGridColumns}
        onToggleCompactMode={handleToggleCompactMode}
        onToggleAutoSave={handleToggleAutoSave}
        onToggleShowCategories={handleToggleShowCategories}
        onSavePreferences={handleSavePreferences}
        onResetToDefaults={handleResetToDefaults}
        onExportPreferences={exportPreferences}
        onImportPreferences={importPreferences}
      />

      {/* Dashboard Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToParentElement]}
      >
        <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
          {renderWidgets()}
        </SortableContext>
      </DndContext>
    </div>
  );
} 