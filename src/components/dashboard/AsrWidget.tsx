'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle, XCircle, Loader2, Target, TrendingUp, Zap } from 'lucide-react';
import { useCdr } from '@/contexts/CdrContext';
import { useKpiThresholds } from '@/hooks/useKpiThresholds';
import { useTranslations } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function AsrWidget() {
  const { kpis, isLoading, error, selectedDate, hasDataLoaded } = useCdr();
  const { thresholds } = useKpiThresholds();
  const { t } = useTranslations();

  const formatSelectedDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    if (date.toDateString() === today.toDateString()) {
      return t('dashboard.widgets.asr.dateFormats.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('dashboard.widgets.asr.dateFormats.yesterday');
    } else {
      return t('dashboard.widgets.asr.dateFormats.onDate', { date: date.toLocaleDateString() });
    }
  };

  // Show "not loaded" state when data hasn't been manually loaded
  if (!hasDataLoaded && !isLoading) {
    return (
      <Card className="h-full bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950/50 dark:via-gray-950/50 dark:to-zinc-950/50 border-slate-200/50 dark:border-slate-800/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t('dashboard.widgets.asr.title')}
          </CardTitle>
          <div className="relative">
            <div className="relative z-10 p-2 rounded-full bg-slate-500/10 dark:bg-slate-400/10">
              <TrendingUp className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
              <Target className="h-6 w-6 text-slate-500 dark:text-slate-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('dashboard.widgets.asr.states.noDataLoaded.title')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('dashboard.widgets.asr.states.noDataLoaded.subtitle')}
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
            {t('dashboard.widgets.asr.title')}
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
                {t('dashboard.widgets.asr.states.loading.title')}
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                {t('dashboard.widgets.asr.states.loading.subtitle')}
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
          <CardTitle className="text-sm font-semibold text-red-900">{t('dashboard.widgets.asr.title')}</CardTitle>
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/20 rounded-full animate-pulse"></div>
            <Target className="h-5 w-5 text-red-600 relative z-10" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600 mb-2">{t('dashboard.widgets.asr.states.error.title')}</div>
          <p className="text-xs text-red-600/80">
            {t('dashboard.widgets.asr.states.error.subtitle')}
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
          <CardTitle className="text-sm font-semibold">{t('dashboard.widgets.asr.title')}</CardTitle>
          <div className="relative">
            <div className="absolute inset-0 bg-muted/10 rounded-full"></div>
            <Target className="h-5 w-5 text-muted-foreground relative z-10" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-3xl font-bold tracking-tight">
              ---%
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {t('dashboard.widgets.asr.states.noActivity.subtitle', { date: formatSelectedDate(selectedDate) })}
              </p>
              <Badge variant="outline" className="text-xs font-medium">
                {t('dashboard.widgets.asr.states.noActivity.badge')}
              </Badge>
            </div>
          </div>
          <div className="text-xs text-muted-foreground flex items-center space-x-1">
            <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
            <span>{t('dashboard.widgets.asr.states.noActivity.waiting')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getAsrStatus = () => {
    if (kpis.asr >= thresholds.asrThresholds.good) return 'excellent';
    if (kpis.asr >= thresholds.asrThresholds.fair) return 'good';
    if (kpis.asr >= thresholds.asrThresholds.poor) return 'fair';
    if (kpis.asr >= thresholds.asrThresholds.critical) return 'poor';
    return 'critical';
  };

  const getStatusConfig = () => {
    const status = getAsrStatus();
    switch (status) {
      case 'excellent':
        return {
          gradient: 'from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/50 dark:via-green-950/50 dark:to-teal-950/50',
          border: 'border-emerald-200/50 dark:border-emerald-800/50',
          textPrimary: 'text-emerald-900 dark:text-emerald-100',
          textSecondary: 'text-emerald-700 dark:text-emerald-300',
          textMuted: 'text-emerald-600/70 dark:text-emerald-400/70',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800',
          badgeText: t('dashboard.widgets.asr.status.badges.excellent'),
          iconBg: 'bg-emerald-500/10 dark:bg-emerald-400/10',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          progressBg: 'bg-gradient-to-r from-emerald-400 to-green-500',
          pulse: 'bg-emerald-500/20 dark:bg-emerald-400/20',
          icon: <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        };
      case 'good':
        return {
          gradient: 'from-green-50 via-lime-50 to-emerald-50 dark:from-green-950/50 dark:via-lime-950/50 dark:to-emerald-950/50',
          border: 'border-green-200/50 dark:border-green-800/50',
          textPrimary: 'text-green-900 dark:text-green-100',
          textSecondary: 'text-green-700 dark:text-green-300',
          textMuted: 'text-green-600/70 dark:text-green-400/70',
          badge: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800',
          badgeText: t('dashboard.widgets.asr.status.badges.good'),
          iconBg: 'bg-green-500/10 dark:bg-green-400/10',
          iconColor: 'text-green-600 dark:text-green-400',
          progressBg: 'bg-gradient-to-r from-green-400 to-lime-500',
          pulse: 'bg-green-500/20 dark:bg-green-400/20',
          icon: <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
        };
      case 'fair':
        return {
          gradient: 'from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-950/50 dark:via-amber-950/50 dark:to-orange-950/50',
          border: 'border-yellow-200/50 dark:border-yellow-800/50',
          textPrimary: 'text-yellow-900 dark:text-yellow-100',
          textSecondary: 'text-yellow-700 dark:text-yellow-300',
          textMuted: 'text-yellow-600/70 dark:text-yellow-400/70',
          badge: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800',
          badgeText: t('dashboard.widgets.asr.status.badges.fair'),
          iconBg: 'bg-yellow-500/10 dark:bg-yellow-400/10',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          progressBg: 'bg-gradient-to-r from-yellow-400 to-amber-500',
          pulse: 'bg-yellow-500/20 dark:bg-yellow-400/20',
          icon: <Activity className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        };
      case 'poor':
        return {
          gradient: 'from-orange-50 via-red-50 to-rose-50 dark:from-orange-950/50 dark:via-red-950/50 dark:to-rose-950/50',
          border: 'border-orange-200/50 dark:border-orange-800/50',
          textPrimary: 'text-orange-900 dark:text-orange-100',
          textSecondary: 'text-orange-700 dark:text-orange-300',
          textMuted: 'text-orange-600/70 dark:text-orange-400/70',
          badge: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800',
          badgeText: t('dashboard.widgets.asr.status.badges.poor'),
          iconBg: 'bg-orange-500/10 dark:bg-orange-400/10',
          iconColor: 'text-orange-600 dark:text-orange-400',
          progressBg: 'bg-gradient-to-r from-orange-400 to-red-500',
          pulse: 'bg-orange-500/20 dark:bg-orange-400/20',
          icon: <XCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        };
      case 'critical':
        return {
          gradient: 'from-red-50 via-rose-50 to-pink-50 dark:from-red-950/50 dark:via-rose-950/50 dark:to-pink-950/50',
          border: 'border-red-200/50 dark:border-red-800/50',
          textPrimary: 'text-red-900 dark:text-red-100',
          textSecondary: 'text-red-700 dark:text-red-300',
          textMuted: 'text-red-600/70 dark:text-red-400/70',
          badge: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
          badgeText: t('dashboard.widgets.asr.status.badges.critical'),
          iconBg: 'bg-red-500/10 dark:bg-red-400/10',
          iconColor: 'text-red-600 dark:text-red-400',
          progressBg: 'bg-gradient-to-r from-red-400 to-rose-500',
          pulse: 'bg-red-500/20 dark:bg-red-400/20',
          icon: <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        };
      default:
        return {
          gradient: 'from-background via-muted/50 to-background',
          border: 'border-border',
          textPrimary: 'text-foreground',
          textSecondary: 'text-muted-foreground',
          textMuted: 'text-muted-foreground/70',
          badge: 'bg-muted text-muted-foreground border-border',
          badgeText: 'No Data',
          iconBg: 'bg-muted/10',
          iconColor: 'text-muted-foreground',
          progressBg: 'bg-muted/50',
          pulse: 'bg-muted/20',
          icon: <Target className="h-4 w-4 text-muted-foreground" />
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
          {t('dashboard.widgets.asr.title')}
        </CardTitle>
        <div className="relative">
          <div className={cn("absolute inset-0 rounded-full animate-ping", config.pulse)}></div>
          <div className={cn("relative z-10 p-2 rounded-full", config.iconBg)}>
            <Target className={cn("h-5 w-5", config.iconColor)} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main ASR Display */}
        <div className="space-y-2">
          <div className="flex items-baseline space-x-2">
            <div className={cn("text-3xl font-bold tracking-tight", config.textPrimary)}>
              {kpis.asr.toFixed(2)}%
            </div>
            <div className="flex items-center space-x-1">
              {config.icon}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <p className={cn("text-xs", config.textMuted)}>
              {t('dashboard.widgets.asr.labels.successRate')}
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
              <CheckCircle className="h-3 w-3" />
              <span>{t('dashboard.widgets.asr.labels.successfulCalls')}</span>
            </div>
            <span className="font-semibold">{kpis.successfulCalls.toLocaleString()}</span>
          </div>
          
          <div className={cn("flex items-center justify-between text-sm", config.textSecondary)}>
            <div className="flex items-center space-x-2">
              <XCircle className="h-3 w-3" />
              <span>{t('dashboard.widgets.asr.labels.failedCalls')}</span>
            </div>
            <span className="font-semibold">{kpis.failedCalls.toLocaleString()}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className={config.textMuted}>{t('dashboard.widgets.asr.labels.connectionQuality')}</span>
            <span className={config.textSecondary}>
              {kpis.asr.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
            <div 
              className={cn(
                "h-2 rounded-full transition-all duration-1000 ease-out",
                config.progressBg
              )}
              style={{ 
                width: `${Math.min(kpis.asr, 100)}%`
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className={cn("flex items-center justify-between text-xs pt-2 border-t border-muted/20", config.textMuted)}>
          <div className="flex items-center space-x-1">
            <div className={cn("w-2 h-2 rounded-full", 
              getAsrStatus() === 'excellent' ? 'bg-emerald-400' :
              getAsrStatus() === 'good' ? 'bg-green-400' :
              getAsrStatus() === 'fair' ? 'bg-yellow-400' :
              getAsrStatus() === 'poor' ? 'bg-orange-400' :
              'bg-red-400'
            )}></div>
            <span>{t('dashboard.widgets.asr.labels.liveData')}</span>
          </div>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </CardContent>
    </Card>
  );
} 