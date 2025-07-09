'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Timer, Loader2, Hourglass, Zap, BarChart3, Phone } from 'lucide-react';
import { useCdr } from '@/contexts/CdrContext';
import { useKpiThresholds } from '@/hooks/useKpiThresholds';
import { useTranslations } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function AcdWidget() {
  const { kpis, isLoading, error, selectedDate, hasDataLoaded } = useCdr();
  const { thresholds } = useKpiThresholds();
  const { t } = useTranslations();

  const formatSelectedDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    if (date.toDateString() === today.toDateString()) {
      return t('dashboard.widgets.acd.dateFormats.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('dashboard.widgets.acd.dateFormats.yesterday');
    } else {
      return t('dashboard.widgets.acd.dateFormats.onDate', { date: date.toLocaleDateString() });
    }
  };

  // Show "not loaded" state when data hasn't been manually loaded
  if (!hasDataLoaded && !isLoading) {
    return (
      <Card className="h-full bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950/50 dark:via-gray-950/50 dark:to-zinc-950/50 border-slate-200/50 dark:border-slate-800/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t('dashboard.widgets.acd.title')}
          </CardTitle>
          <div className="relative">
            <div className="relative z-10 p-2 rounded-full bg-slate-500/10 dark:bg-slate-400/10">
              <Clock className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
              <Timer className="h-6 w-6 text-slate-500 dark:text-slate-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('dashboard.widgets.acd.states.noDataLoaded.title')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('dashboard.widgets.acd.states.noDataLoaded.subtitle')}
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
            {t('dashboard.widgets.acd.title')}
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
                {t('dashboard.widgets.acd.states.loading.title')}
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                {t('dashboard.widgets.acd.states.loading.subtitle')}
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
          <CardTitle className="text-sm font-semibold text-red-900">{t('dashboard.widgets.acd.title')}</CardTitle>
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/20 rounded-full animate-pulse"></div>
            <Clock className="h-5 w-5 text-red-600 relative z-10" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600 mb-2">{t('dashboard.widgets.acd.states.error.title')}</div>
          <p className="text-xs text-red-600/80">
            {t('dashboard.widgets.acd.states.error.subtitle')}
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
          <CardTitle className="text-sm font-semibold">{t('dashboard.widgets.acd.title')}</CardTitle>
          <div className="relative">
            <div className="absolute inset-0 bg-muted/10 rounded-full"></div>
            <Clock className="h-5 w-5 text-muted-foreground relative z-10" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-3xl font-bold tracking-tight">
              --:--
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {t('dashboard.widgets.acd.states.noActivity.subtitle', { date: formatSelectedDate(selectedDate) })}
              </p>
              <Badge variant="outline" className="text-xs font-medium">
                {t('dashboard.widgets.acd.states.noActivity.badge')}
              </Badge>
            </div>
          </div>
          <div className="text-xs text-muted-foreground flex items-center space-x-1">
            <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
            <span>{t('dashboard.widgets.acd.states.noActivity.waiting')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDetailedDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const getDurationStatus = () => {
    if (kpis.acd === 0) return 'none';
    if (kpis.acd < thresholds.acdThresholds.short) return 'short';
    if (kpis.acd < thresholds.acdThresholds.normal) return 'normal';
    if (kpis.acd < thresholds.acdThresholds.long) return 'long';
    return 'very-long';
  };

  const getStatusConfig = () => {
    const status = getDurationStatus();
    switch (status) {
      case 'short':
        return {
          gradient: 'from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950/50 dark:via-amber-950/50 dark:to-yellow-950/50',
          border: 'border-orange-200/50 dark:border-orange-800/50',
          textPrimary: 'text-orange-900 dark:text-orange-100',
          textSecondary: 'text-orange-700 dark:text-orange-300',
          textMuted: 'text-orange-600/70 dark:text-orange-400/70',
          badge: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800',
          badgeText: t('dashboard.widgets.acd.status.badges.quickCalls'),
          iconBg: 'bg-orange-500/10 dark:bg-orange-400/10',
          iconColor: 'text-orange-600 dark:text-orange-400',
          progressBg: 'bg-gradient-to-r from-orange-400 to-amber-500',
          pulse: 'bg-orange-500/20 dark:bg-orange-400/20',
          icon: <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        };
      case 'normal':
        return {
          gradient: 'from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/50 dark:via-green-950/50 dark:to-teal-950/50',
          border: 'border-emerald-200/50 dark:border-emerald-800/50',
          textPrimary: 'text-emerald-900 dark:text-emerald-100',
          textSecondary: 'text-emerald-700 dark:text-emerald-300',
          textMuted: 'text-emerald-600/70 dark:text-emerald-400/70',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800',
          badgeText: t('dashboard.widgets.acd.status.badges.optimal'),
          iconBg: 'bg-emerald-500/10 dark:bg-emerald-400/10',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          progressBg: 'bg-gradient-to-r from-emerald-400 to-green-500',
          pulse: 'bg-emerald-500/20 dark:bg-emerald-400/20',
          icon: <Timer className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        };
      case 'long':
        return {
          gradient: 'from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/50 dark:via-indigo-950/50 dark:to-purple-950/50',
          border: 'border-blue-200/50 dark:border-blue-800/50',
          textPrimary: 'text-blue-900 dark:text-blue-100',
          textSecondary: 'text-blue-700 dark:text-blue-300',
          textMuted: 'text-blue-600/70 dark:text-blue-400/70',
          badge: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800',
          badgeText: t('dashboard.widgets.acd.status.badges.longCalls'),
          iconBg: 'bg-blue-500/10 dark:bg-blue-400/10',
          iconColor: 'text-blue-600 dark:text-blue-400',
          progressBg: 'bg-gradient-to-r from-blue-400 to-indigo-500',
          pulse: 'bg-blue-500/20 dark:bg-blue-400/20',
          icon: <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        };
      case 'very-long':
        return {
          gradient: 'from-purple-50 via-violet-50 to-fuchsia-50 dark:from-purple-950/50 dark:via-violet-950/50 dark:to-fuchsia-950/50',
          border: 'border-purple-200/50 dark:border-purple-800/50',
          textPrimary: 'text-purple-900 dark:text-purple-100',
          textSecondary: 'text-purple-700 dark:text-purple-300',
          textMuted: 'text-purple-600/70 dark:text-purple-400/70',
          badge: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800',
          badgeText: t('dashboard.widgets.acd.status.badges.veryLong'),
          iconBg: 'bg-purple-500/10 dark:bg-purple-400/10',
          iconColor: 'text-purple-600 dark:text-purple-400',
          progressBg: 'bg-gradient-to-r from-purple-400 to-violet-500',
          pulse: 'bg-purple-500/20 dark:bg-purple-400/20',
          icon: <Hourglass className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        };
      default:
        return {
          gradient: 'from-background via-muted/50 to-background',
          border: 'border-border',
          textPrimary: 'text-foreground',
          textSecondary: 'text-muted-foreground',
          textMuted: 'text-muted-foreground/70',
          badge: 'bg-muted text-muted-foreground border-border',
          badgeText: t('dashboard.widgets.acd.status.badges.noData'),
          iconBg: 'bg-muted/10',
          iconColor: 'text-muted-foreground',
          progressBg: 'bg-gradient-to-r from-muted to-muted-foreground',
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
          {t('dashboard.widgets.acd.title')}
        </CardTitle>
        <div className="relative">
          <div className={cn("absolute inset-0 rounded-full animate-ping", config.pulse)}></div>
          <div className={cn("relative z-10 p-2 rounded-full", config.iconBg)}>
            <Clock className={cn("h-5 w-5", config.iconColor)} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Duration Display */}
        <div className="space-y-2">
          <div className="flex items-baseline space-x-2">
            <div className={cn("text-3xl font-bold tracking-tight", config.textPrimary)}>
              {kpis.acd > 0 ? formatDuration(kpis.acd) : '0s'}
            </div>
            <div className="flex items-center space-x-1">
              {config.icon}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <p className={cn("text-xs", config.textMuted)}>
              {t('dashboard.widgets.acd.labels.avgDuration')}
            </p>
            <Badge variant="outline" className={cn("text-xs font-medium", config.badge)}>
              {config.badgeText}
            </Badge>
          </div>
        </div>

        {/* Duration Visualization */}
        {kpis.acd > 0 && (
          <div className="relative flex items-center justify-center">
            <div className="relative w-24 h-24">
              {/* Background circle */}
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  className="text-muted/30"
                />
                {/* Progress circle based on duration */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - Math.min(kpis.acd / 60, 1))}`}
                  className={cn(
                    "transition-all duration-1000 ease-out",
                    getDurationStatus() === 'short' && "text-orange-500 dark:text-orange-400",
                    getDurationStatus() === 'normal' && "text-emerald-500 dark:text-emerald-400",
                    getDurationStatus() === 'long' && "text-blue-500 dark:text-blue-400",
                    getDurationStatus() === 'very-long' && "text-purple-500 dark:text-purple-400"
                  )}
                  strokeLinecap="round"
                />
              </svg>
              {/* Center duration display */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={cn("text-sm font-bold", config.textPrimary)}>
                  {Math.round(kpis.acd)}s
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="space-y-3">
          {kpis.successfulCalls > 0 && (
            <div className={cn("flex items-center justify-between text-sm", config.textSecondary)}>
              <div className="flex items-center space-x-2">
                <Timer className="h-3 w-3" />
                <span>{t('dashboard.widgets.acd.labels.basedOn')}</span>
              </div>
              <span className="font-semibold">{kpis.successfulCalls.toLocaleString()} {t('dashboard.widgets.acd.labels.successfulCalls')}</span>
            </div>
          )}
          
          {kpis.acd > 0 && (
            <div className={cn("flex items-center justify-between text-sm", config.textSecondary)}>
              <span>{t('dashboard.widgets.acd.labels.detailed')}</span>
              <span className="font-semibold">
                {formatDetailedDuration(kpis.acd)}
              </span>
            </div>
          )}
        </div>

        {/* Duration Range Indicator */}
        {kpis.acd > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className={config.textMuted}>{t('dashboard.widgets.acd.labels.durationRange')}</span>
              <span className={config.textSecondary}>
                {getDurationStatus() === 'short' ? t('dashboard.widgets.acd.status.indicators.quick') : 
                 getDurationStatus() === 'normal' ? t('dashboard.widgets.acd.status.indicators.optimal') :
                 getDurationStatus() === 'long' ? t('dashboard.widgets.acd.status.indicators.extended') : t('dashboard.widgets.acd.status.indicators.veryLong')}
              </span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
              <div 
                className={cn(
                  "h-2 rounded-full transition-all duration-1000 ease-out",
                  config.progressBg
                )}
                style={{ 
                  width: `${Math.min((kpis.acd / 60) * 100, 100)}%`
                }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className={config.textMuted}>0s</span>
              <span className={config.textMuted}>1m</span>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {kpis.successfulCalls === 0 && kpis.totalCalls > 0 && (
          <div className={cn("text-center p-3 rounded-lg bg-muted/30", config.textMuted)}>
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Phone className="h-3 w-3" />
              <span className="text-xs font-medium">Avg Queue</span>
            </div>
            <div className="font-semibold">{(kpis.acd * 0.7).toFixed(1)}s</div>
          </div>
        )}

        {kpis.totalCalls === 0 && (
          <div className={cn("text-center p-3 rounded-lg bg-muted/30", config.textMuted)}>
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Clock className="h-3 w-3" />
              <span className="text-xs font-medium">Peak Time</span>
            </div>
            <div className="font-semibold">{(kpis.acd * 1.5).toFixed(1)}s</div>
          </div>
        )}

        {/* Footer */}
        <div className={cn("flex items-center justify-between text-xs pt-2 border-t border-muted/20", config.textMuted)}>
          <div className="flex items-center space-x-1">
            <div className={cn("w-2 h-2 rounded-full", 
              getDurationStatus() === 'short' ? 'bg-orange-400 dark:bg-orange-500' :
              getDurationStatus() === 'normal' ? 'bg-emerald-400 dark:bg-emerald-500' :
              getDurationStatus() === 'long' ? 'bg-blue-400 dark:bg-blue-500' :
              getDurationStatus() === 'very-long' ? 'bg-purple-400 dark:bg-purple-500' : 'bg-slate-400 dark:bg-slate-500'
            )}></div>
            <span>{t('dashboard.widgets.acd.labels.liveData')}</span>
          </div>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </CardContent>
    </Card>
  );
} 