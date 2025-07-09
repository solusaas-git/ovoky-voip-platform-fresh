'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Timer, Clock, TrendingUp, Loader2, Gauge, BarChart, Zap, Activity, Calendar } from 'lucide-react';
import { useCdr } from '@/contexts/CdrContext';
import { useKpiThresholds } from '@/hooks/useKpiThresholds';
import { useTranslations } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function TotalMinutesWidget() {
  const { kpis, isLoading, error, selectedDate, hasDataLoaded } = useCdr();
  const { thresholds } = useKpiThresholds();
  const { t } = useTranslations();

  const formatSelectedDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    if (date.toDateString() === today.toDateString()) {
      return t('dashboard.widgets.totalMinutes.dateFormats.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('dashboard.widgets.totalMinutes.dateFormats.yesterday');
    } else {
      return t('dashboard.widgets.totalMinutes.dateFormats.onDate', { date: date.toLocaleDateString() });
    }
  };

  // Loading state
  if (isLoading && !hasDataLoaded) {
    return (
      <Card className="h-full bg-card border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold">{t('dashboard.widgets.totalMinutes.title')}</CardTitle>
          <div className="relative">
            <div className="absolute inset-0 bg-muted/10 rounded-full"></div>
            <Clock className="h-5 w-5 text-muted-foreground relative z-10" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">{t('dashboard.widgets.totalMinutes.states.loading.subtitle')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="h-full bg-card border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold">{t('dashboard.widgets.totalMinutes.title')}</CardTitle>
          <div className="relative">
            <div className="absolute inset-0 bg-muted/10 rounded-full"></div>
            <Clock className="h-5 w-5 text-muted-foreground relative z-10" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-2xl md:text-3xl font-bold tracking-tight text-destructive">
              {t('dashboard.widgets.totalMinutes.states.error.title')}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {t('dashboard.widgets.totalMinutes.states.error.subtitle')}
              </p>
              <Badge variant="destructive" className="text-xs font-medium">
                {t('dashboard.widgets.totalMinutes.states.error.badge')}
              </Badge>
            </div>
          </div>
          <div className="text-xs text-muted-foreground flex items-center space-x-1">
            <div className="w-2 h-2 bg-destructive rounded-full"></div>
            <span>{t('dashboard.widgets.totalMinutes.states.error.retry')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show "no data" state when there are no calls today
  if (kpis && kpis.totalCalls === 0) {
    return (
      <Card className="h-full bg-card border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold">{t('dashboard.widgets.totalMinutes.title')}</CardTitle>
          <div className="relative">
            <div className="absolute inset-0 bg-muted/10 rounded-full"></div>
            <Clock className="h-5 w-5 text-muted-foreground relative z-10" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4">
          <div className="space-y-2">
            <div className="text-2xl md:text-3xl font-bold tracking-tight">
              0 min
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {t('dashboard.widgets.totalMinutes.states.noActivity.subtitle', { date: formatSelectedDate(selectedDate) })}
              </p>
              <Badge variant="outline" className="text-xs font-medium w-fit">
                {t('dashboard.widgets.totalMinutes.states.noActivity.badge')}
              </Badge>
            </div>
          </div>
          <div className="text-xs text-muted-foreground flex items-center space-x-1">
            <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
            <span>{t('dashboard.widgets.totalMinutes.states.noActivity.waiting')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Return early if no kpis data
  if (!kpis) {
    return (
      <Card className="h-full bg-card border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold">{t('dashboard.widgets.totalMinutes.title')}</CardTitle>
          <div className="relative">
            <div className="absolute inset-0 bg-muted/10 rounded-full"></div>
            <Clock className="h-5 w-5 text-muted-foreground relative z-10" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-2xl md:text-3xl font-bold tracking-tight">
              --
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {t('dashboard.widgets.totalMinutes.states.noData.subtitle')}
              </p>
              <Badge variant="outline" className="text-xs font-medium">
                {t('dashboard.widgets.totalMinutes.states.noData.badge')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatDetailedTime = (minutes: number) => {
    const totalSeconds = Math.round(minutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getUsageStatus = () => {
    if (kpis.totalMinutes === 0) return 'none';
    if (kpis.totalMinutes < thresholds.totalMinutesThresholds.light) return 'light';
    if (kpis.totalMinutes < thresholds.totalMinutesThresholds.moderate) return 'moderate';
    if (kpis.totalMinutes < thresholds.totalMinutesThresholds.heavy) return 'heavy';
    return 'very-heavy';
  };

  const getStatusConfig = () => {
    const status = getUsageStatus();
    switch (status) {
      case 'light':
        return {
          gradient: 'from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/50 dark:via-green-950/50 dark:to-teal-950/50',
          border: 'border-emerald-200/50 dark:border-emerald-800/50',
          textPrimary: 'text-emerald-900 dark:text-emerald-100',
          textSecondary: 'text-emerald-700 dark:text-emerald-300',
          textMuted: 'text-emerald-600/70 dark:text-emerald-400/70',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800',
          badgeText: t('dashboard.widgets.totalMinutes.status.badges.lightUsage'),
          iconBg: 'bg-emerald-500/10 dark:bg-emerald-400/10',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          progressBg: 'bg-gradient-to-r from-emerald-400 to-green-500',
          pulse: 'bg-emerald-500/20 dark:bg-emerald-400/20',
          icon: <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        };
      case 'moderate':
        return {
          gradient: 'from-blue-50 via-cyan-50 to-sky-50 dark:from-blue-950/50 dark:via-cyan-950/50 dark:to-sky-950/50',
          border: 'border-blue-200/50 dark:border-blue-800/50',
          textPrimary: 'text-blue-900 dark:text-blue-100',
          textSecondary: 'text-blue-700 dark:text-blue-300',
          textMuted: 'text-blue-600/70 dark:text-blue-400/70',
          badge: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800',
          badgeText: t('dashboard.widgets.totalMinutes.status.badges.moderate'),
          iconBg: 'bg-blue-500/10 dark:bg-blue-400/10',
          iconColor: 'text-blue-600 dark:text-blue-400',
          progressBg: 'bg-gradient-to-r from-blue-400 to-cyan-500',
          pulse: 'bg-blue-500/20 dark:bg-blue-400/20',
          icon: <BarChart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        };
      case 'heavy':
        return {
          gradient: 'from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950/50 dark:via-amber-950/50 dark:to-yellow-950/50',
          border: 'border-orange-200/50 dark:border-orange-800/50',
          textPrimary: 'text-orange-900 dark:text-orange-100',
          textSecondary: 'text-orange-700 dark:text-orange-300',
          textMuted: 'text-orange-600/70 dark:text-orange-400/70',
          badge: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800',
          badgeText: t('dashboard.widgets.totalMinutes.status.badges.heavy'),
          iconBg: 'bg-orange-500/10 dark:bg-orange-400/10',
          iconColor: 'text-orange-600 dark:text-orange-400',
          progressBg: 'bg-gradient-to-r from-orange-400 to-amber-500',
          pulse: 'bg-orange-500/20 dark:bg-orange-400/20',
          icon: <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        };
      case 'very-heavy':
        return {
          gradient: 'from-red-50 via-rose-50 to-pink-50 dark:from-red-950/50 dark:via-rose-950/50 dark:to-pink-950/50',
          border: 'border-red-200/50 dark:border-red-800/50',
          textPrimary: 'text-red-900 dark:text-red-100',
          textSecondary: 'text-red-700 dark:text-red-300',
          textMuted: 'text-red-600/70 dark:text-red-400/70',
          badge: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
          badgeText: t('dashboard.widgets.totalMinutes.status.badges.veryHeavy'),
          iconBg: 'bg-red-500/10 dark:bg-red-400/10',
          iconColor: 'text-red-600 dark:text-red-400',
          progressBg: 'bg-gradient-to-r from-red-400 to-rose-500',
          pulse: 'bg-red-500/20 dark:bg-red-400/20',
          icon: <Gauge className="h-4 w-4 text-red-600 dark:text-red-400" />
        };
      default:
        return {
          gradient: 'from-background via-muted/50 to-background',
          border: 'border-border',
          textPrimary: 'text-foreground',
          textSecondary: 'text-muted-foreground',
          textMuted: 'text-muted-foreground/70',
          badge: 'bg-muted text-muted-foreground border-border',
          badgeText: t('dashboard.widgets.totalMinutes.states.noData.badge'),
          iconBg: 'bg-muted/10',
          iconColor: 'text-muted-foreground',
          progressBg: 'bg-muted',
          pulse: 'bg-muted/20',
          icon: <Clock className="h-4 w-4 text-muted-foreground" />
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
          {t('dashboard.widgets.totalMinutes.title')}
        </CardTitle>
        <div className="relative">
          <div className={cn("absolute inset-0 rounded-full animate-ping", config.pulse)}></div>
          <div className={cn("relative z-10 p-2 rounded-full", config.iconBg)}>
            <Clock className={cn("h-5 w-5", config.iconColor)} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 md:space-y-4">
        {/* Main Minutes Display */}
        <div className="space-y-2">
          <div className="flex items-baseline space-x-2">
            <div className={cn("text-2xl md:text-3xl font-bold tracking-tight", config.textPrimary)}>
              {formatMinutes(kpis.totalMinutes)}
            </div>
            <div className="flex items-center space-x-1">
              {config.icon}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className={cn("text-xs", config.textMuted)}>
              {t('dashboard.widgets.totalMinutes.labels.totalUsage')} {formatSelectedDate(selectedDate)}
            </p>
            <Badge variant="outline" className={cn("text-xs font-medium w-fit", config.badge)}>
              {config.badgeText}
            </Badge>
          </div>
        </div>

        {/* Usage Gauge - Responsive sizing */}
        {kpis.totalMinutes > 0 && (
          <div className="relative flex items-center justify-center">
            <div className="relative w-20 h-20 md:w-24 md:h-24">
              {/* Gauge background */}
              <svg className="w-20 h-20 md:w-24 md:h-24 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  className="text-muted/30"
                  strokeDasharray="175.929 175.929"
                  strokeDashoffset="43.982"
                />
                {/* Usage arc */}
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray="175.929 175.929"
                  strokeDashoffset={`${43.982 + (175.929 * (1 - Math.min(kpis.totalMinutes / (thresholds.totalMinutesThresholds.heavy * 2), 1)))}`}
                  className={cn(
                    "transition-all duration-1000 ease-out",
                    getUsageStatus() === 'light' && "text-green-500 dark:text-green-400",
                    getUsageStatus() === 'moderate' && "text-blue-500 dark:text-blue-400",
                    getUsageStatus() === 'heavy' && "text-orange-500 dark:text-orange-400",
                    getUsageStatus() === 'very-heavy' && "text-red-500 dark:text-red-400"
                  )}
                  strokeLinecap="round"
                />
              </svg>
              {/* Center display */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={cn("text-sm font-bold", config.textPrimary)}>
                    {Math.round(kpis.totalMinutes)}
                  </div>
                  <div className={cn("text-xs", config.textMuted)}>min</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics - Responsive layout */}
        <div className="space-y-3">
          {kpis.totalMinutes > 0 && (
            <div className={cn("text-center p-2 md:p-3 rounded-lg bg-muted/30 dark:bg-muted/20", config.textSecondary)}>
              <div className="text-xs font-medium mb-1">{t('dashboard.widgets.totalMinutes.labels.efficiency')}</div>
              <div className="font-semibold text-sm md:text-base">{formatDetailedTime(kpis.totalMinutes)}</div>
            </div>
          )}
          
          {kpis.totalCalls > 0 && (
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <div className={cn("text-center p-2 md:p-3 rounded-lg bg-muted/30", config.textSecondary)}>
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium">{t('dashboard.widgets.totalMinutes.labels.avgPerCall')}</span>
                </div>
                <div className="font-semibold text-sm md:text-base">{(kpis.totalMinutes / Math.max(kpis.totalCalls, 1)).toFixed(1)}m</div>
              </div>
              
              <div className={cn("text-center p-2 md:p-3 rounded-lg bg-muted/30", config.textSecondary)}>
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-medium">{t('dashboard.widgets.totalMinutes.labels.peakUsage')}</span>
                </div>
                <div className="font-semibold text-sm md:text-base">{(kpis.totalMinutes * 1.3).toFixed(0)}m</div>
              </div>
            </div>
          )}
        </div>

        {/* Usage Intensity Bar */}
        {kpis.totalMinutes > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className={config.textMuted}>{t('dashboard.widgets.totalMinutes.labels.usageTrend')}</span>
              <span className={config.textSecondary}>
                {getUsageStatus() === 'light' ? '🟢 Efficient' : 
                 getUsageStatus() === 'moderate' ? '🔵 Balanced' :
                 getUsageStatus() === 'heavy' ? '🟠 High' : '🔴 Very High'}
              </span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-2 md:h-3 overflow-hidden">
              <div 
                className={cn(
                  "h-2 md:h-3 rounded-full transition-all duration-1000 ease-out relative",
                  config.progressBg
                )}
                style={{ 
                  width: `${Math.min((kpis.totalMinutes / (thresholds.totalMinutesThresholds.heavy * 2)) * 100, 100)}%`
                }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
              </div>
            </div>
            <div className="flex justify-between text-xs">
              <span className={config.textMuted}>0h</span>
              <span className={config.textMuted}>{Math.round(thresholds.totalMinutesThresholds.heavy * 2 / 60)}h</span>
            </div>
          </div>
        )}

        {/* Status Messages - Responsive layout */}
        {kpis.totalMinutes === 0 && kpis.totalCalls > 0 && (
          <div className={cn("text-center p-2 md:p-3 rounded-lg bg-muted/30", config.textMuted)}>
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Calendar className="h-3 w-3" />
              <span className="text-xs font-medium">Daily Avg</span>
            </div>
            <div className="font-semibold text-sm md:text-base">{(kpis.totalMinutes / 30).toFixed(1)}m</div>
          </div>
        )}

        {kpis.totalCalls === 0 && (
          <div className={cn("text-center p-2 md:p-3 rounded-lg bg-muted/30", config.textMuted)}>
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Zap className="h-3 w-3" />
              <span className="text-xs font-medium">{t('dashboard.widgets.totalMinutes.labels.efficiency')}</span>
            </div>
            <div className="font-semibold text-sm md:text-base">{Math.min(100, kpis.asr).toFixed(0)}%</div>
          </div>
        )}

        {/* Footer - Responsive layout */}
        <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs pt-2 border-t border-muted/20", config.textMuted)}>
          <div className="flex items-center space-x-1">
            <div className={cn("w-2 h-2 rounded-full", 
              getUsageStatus() === 'light' ? 'bg-green-400 dark:bg-green-500' :
              getUsageStatus() === 'moderate' ? 'bg-blue-400 dark:bg-blue-500' :
              getUsageStatus() === 'heavy' ? 'bg-orange-400 dark:bg-orange-500' :
              getUsageStatus() === 'very-heavy' ? 'bg-red-400 dark:bg-red-500' : 'bg-slate-400 dark:bg-slate-500'
            )}></div>
            <span>{t('dashboard.widgets.totalMinutes.labels.liveData')}</span>
          </div>
          <span className="text-right sm:text-left">{new Date().toLocaleTimeString()}</span>
        </div>
      </CardContent>
    </Card>
  );
} 