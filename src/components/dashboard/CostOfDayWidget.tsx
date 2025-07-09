'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, Loader2, Sparkles, ArrowUpRight, ArrowDownRight, BarChart3 } from 'lucide-react';
import { useCdr } from '@/contexts/CdrContext';
import { useKpiThresholds } from '@/hooks/useKpiThresholds';
import { useTranslations } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function CostOfDayWidget() {
  const { kpis, isLoading, error, selectedDate, hasDataLoaded } = useCdr();
  const { thresholds } = useKpiThresholds();
  const { t } = useTranslations();

  const formatCurrency = (amount: number, currency: string) => {
    // Format the number with 4 decimal places
    const formattedAmount = amount.toFixed(4);
    // Return the amount followed by the Euro symbol
    return `${formattedAmount} €`;
  };

  const formatSelectedDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    if (date.toDateString() === today.toDateString()) {
      return t('dashboard.widgets.costOfDay.dateFormats.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('dashboard.widgets.costOfDay.dateFormats.yesterday');
    } else {
      return t('dashboard.widgets.costOfDay.dateFormats.onDate', { date: date.toLocaleDateString() });
    }
  };

  // Show "not loaded" state when data hasn't been manually loaded
  if (!hasDataLoaded && !isLoading) {
    return (
      <Card className="h-full bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950/50 dark:via-gray-950/50 dark:to-zinc-950/50 border-slate-200/50 dark:border-slate-800/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t('dashboard.widgets.costOfDay.title')}
          </CardTitle>
          <div className="relative">
            <div className="relative z-10 p-2 rounded-full bg-slate-500/10 dark:bg-slate-400/10">
              <DollarSign className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
              <BarChart3 className="h-6 w-6 text-slate-500 dark:text-slate-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('dashboard.widgets.costOfDay.states.noDataLoaded.title')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('dashboard.widgets.costOfDay.states.noDataLoaded.subtitle')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="h-full bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-blue-950/50 dark:via-cyan-950/50 dark:to-teal-950/50 border-blue-200/50 dark:border-blue-800/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            {t('dashboard.widgets.costOfDay.title')}
          </CardTitle>
          <div className="relative">
            <div className="absolute inset-0 rounded-full animate-ping bg-blue-500/20 dark:bg-blue-400/20"></div>
            <div className="relative z-10 p-2 rounded-full bg-blue-500/10 dark:bg-blue-400/10">
              <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {t('dashboard.widgets.costOfDay.states.loading.title')}
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                {t('dashboard.widgets.costOfDay.states.loading.subtitle')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !kpis) {
    return (
      <Card className="h-full bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 border-red-200/50 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-red-900">{t('dashboard.widgets.costOfDay.title')}</CardTitle>
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/20 rounded-full animate-pulse"></div>
            <DollarSign className="h-5 w-5 text-red-600 relative z-10" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600 mb-2">{t('dashboard.widgets.costOfDay.states.error.title')}</div>
          <p className="text-xs text-red-600/80">
            {t('dashboard.widgets.costOfDay.states.error.subtitle')}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show "no data" state when there are no calls today
  if (kpis && kpis.totalCalls === 0) {
    return (
      <Card className="h-full bg-card border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold">{t('dashboard.widgets.costOfDay.title')}</CardTitle>
          <div className="relative">
            <div className="absolute inset-0 bg-muted/10 rounded-full"></div>
            <DollarSign className="h-5 w-5 text-muted-foreground relative z-10" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-3xl font-bold tracking-tight">
              {formatCurrency(0, kpis.currency)}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {t('dashboard.widgets.costOfDay.states.noActivity.subtitle', { date: formatSelectedDate(selectedDate) })}
              </p>
              <Badge variant="outline" className="text-xs font-medium">
                {t('dashboard.widgets.costOfDay.states.noActivity.badge')}
              </Badge>
            </div>
          </div>
          <div className="text-xs text-muted-foreground flex items-center space-x-1">
            <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
            <span>{t('dashboard.widgets.costOfDay.states.noActivity.waiting')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getCostStatus = () => {
    if (kpis.costOfDay === 0) return 'neutral';
    if (kpis.costOfDay < thresholds.costThresholds.low) return 'low';
    if (kpis.costOfDay < thresholds.costThresholds.medium) return 'medium';
    return 'high';
  };

  const getStatusConfig = () => {
    const status = getCostStatus();
    switch (status) {
      case 'low':
        return {
          gradient: 'from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/50 dark:via-green-950/50 dark:to-teal-950/50',
          border: 'border-emerald-200/50 dark:border-emerald-800/50',
          textPrimary: 'text-emerald-900 dark:text-emerald-100',
          textSecondary: 'text-emerald-700 dark:text-emerald-300',
          textMuted: 'text-emerald-600/70 dark:text-emerald-400/70',
          icon: <TrendingDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800',
          badgeText: t('dashboard.widgets.costOfDay.status.badges.lowCost'),
          iconBg: 'bg-emerald-500/10 dark:bg-emerald-400/10',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          arrow: <ArrowDownRight className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />,
          pulse: 'bg-emerald-500/20 dark:bg-emerald-400/20'
        };
      case 'medium':
        return {
          gradient: 'from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/50 dark:via-yellow-950/50 dark:to-orange-950/50',
          border: 'border-amber-200/50 dark:border-amber-800/50',
          textPrimary: 'text-amber-900 dark:text-amber-100',
          textSecondary: 'text-amber-700 dark:text-amber-300',
          textMuted: 'text-amber-600/70 dark:text-amber-400/70',
          icon: <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
          badge: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800',
          badgeText: t('dashboard.widgets.costOfDay.status.badges.moderate'),
          iconBg: 'bg-amber-500/10 dark:bg-amber-400/10',
          iconColor: 'text-amber-600 dark:text-amber-400',
          arrow: <ArrowUpRight className="h-3 w-3 text-amber-600 dark:text-amber-400" />,
          pulse: 'bg-amber-500/20 dark:bg-amber-400/20'
        };
      case 'high':
        return {
          gradient: 'from-red-50 via-rose-50 to-pink-50 dark:from-red-950/50 dark:via-rose-950/50 dark:to-pink-950/50',
          border: 'border-red-200/50 dark:border-red-800/50',
          textPrimary: 'text-red-900 dark:text-red-100',
          textSecondary: 'text-red-700 dark:text-red-300',
          textMuted: 'text-red-600/70 dark:text-red-400/70',
          icon: <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400" />,
          badge: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
          badgeText: t('dashboard.widgets.costOfDay.status.badges.highCost'),
          iconBg: 'bg-red-500/10 dark:bg-red-400/10',
          iconColor: 'text-red-600 dark:text-red-400',
          arrow: <ArrowUpRight className="h-3 w-3 text-red-600 dark:text-red-400" />,
          pulse: 'bg-red-500/20 dark:bg-red-400/20'
        };
      default:
        return {
          gradient: 'from-background via-muted/50 to-background',
          border: 'border-border',
          textPrimary: 'text-foreground',
          textSecondary: 'text-muted-foreground',
          textMuted: 'text-muted-foreground/70',
          icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
          badge: 'bg-muted text-muted-foreground border-border',
          badgeText: t('dashboard.widgets.costOfDay.status.badges.noData'),
          iconBg: 'bg-muted/10',
          iconColor: 'text-muted-foreground',
          arrow: null,
          pulse: 'bg-muted/20'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Card className={cn(
      "h-full bg-gradient-to-br shadow-lg hover:shadow-xl transition-all duration-300 group",
      config.gradient,
      config.border
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className={cn("text-sm font-semibold", config.textPrimary)}>
          {t('dashboard.widgets.costOfDay.title')}
        </CardTitle>
        <div className="relative">
          <div className={cn("absolute inset-0 rounded-full animate-ping", config.pulse)}></div>
          <div className={cn("relative z-10 p-2 rounded-full", config.iconBg)}>
            <DollarSign className={cn("h-5 w-5", config.iconColor)} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Cost Display */}
        <div className="space-y-2">
          <div className="flex items-baseline space-x-2">
            <div className={cn("text-3xl font-bold tracking-tight", config.textPrimary)}>
              {formatCurrency(kpis.costOfDay, kpis.currency)}
            </div>
            {config.arrow && (
              <div className="flex items-center space-x-1">
                {config.arrow}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <p className={cn("text-xs", config.textMuted)}>
              {t('dashboard.widgets.costOfDay.labels.totalChargedToday')}
            </p>
            <Badge variant="outline" className={cn("text-xs font-medium", config.badge)}>
              {config.badgeText}
            </Badge>
          </div>
        </div>

        {/* Statistics */}
        <div className="space-y-3">
          <div className={cn("flex items-center justify-between text-sm", config.textSecondary)}>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-3 w-3" />
              <span>{t('dashboard.widgets.costOfDay.labels.totalCalls')}</span>
            </div>
            <span className="font-semibold">{kpis.totalCalls.toLocaleString()}</span>
          </div>
          
          {kpis.costOfDay > 0 && (
            <div className={cn("flex items-center justify-between text-sm", config.textSecondary)}>
              <span>{t('dashboard.widgets.costOfDay.labels.avgPerCall')}</span>
              <span className="font-semibold">
                {formatCurrency(kpis.costOfDay / kpis.totalCalls, kpis.currency)}
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {kpis.costOfDay > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className={config.textMuted}>{t('dashboard.widgets.costOfDay.labels.dailyUsage')}</span>
              <span className={config.textSecondary}>
                {getCostStatus() === 'low' ? t('dashboard.widgets.costOfDay.status.usage.efficient') : 
                 getCostStatus() === 'medium' ? t('dashboard.widgets.costOfDay.status.usage.moderate') : 
                 t('dashboard.widgets.costOfDay.status.usage.highUsage')}
              </span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
              <div 
                className={cn(
                  "h-2 rounded-full transition-all duration-1000 ease-out",
                  getCostStatus() === 'low' && "bg-gradient-to-r from-emerald-400 to-green-500",
                  getCostStatus() === 'medium' && "bg-gradient-to-r from-amber-400 to-orange-500",
                  getCostStatus() === 'high' && "bg-gradient-to-r from-red-400 to-rose-500"
                )}
                style={{ 
                  width: `${Math.min((kpis.costOfDay / (thresholds.costThresholds.medium * 2)) * 100, 100)}%`
                }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={cn("flex items-center justify-between text-xs pt-2 border-t border-muted/20", config.textMuted)}>
          <div className="flex items-center space-x-1">
            <div className={cn("w-2 h-2 rounded-full", 
              getCostStatus() === 'low' ? 'bg-emerald-400' :
              getCostStatus() === 'medium' ? 'bg-amber-400' :
              getCostStatus() === 'high' ? 'bg-red-400' : 'bg-slate-400'
            )}></div>
            <span>{t('dashboard.widgets.costOfDay.labels.liveData')}</span>
          </div>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </CardContent>
    </Card>
  );
} 