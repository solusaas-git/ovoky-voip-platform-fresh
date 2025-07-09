'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Info, Palette, Grid3X3, Timer, LockIcon, Eye } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';

interface WidgetSettingsModalProps {
  id: string;
  title: string;
  enabled?: boolean;
  collapsible?: boolean;
  locked?: boolean;
  alwaysVisible?: boolean;
  gridCols?: number;
  gridRows?: number;
  category?: string;
  aspectRatio?: 'auto' | 'square' | 'wide' | 'tall';
  refreshInterval?: number;
  priority?: number;
  showTitle?: boolean;
  totalGridColumns?: number;
  onToggleEnabled?: (enabled: boolean) => void;
  onToggleLock?: (locked: boolean) => void;
  onGridColsChange?: (gridCols: number) => void;
  onGridRowsChange?: (gridRows: number) => void;
  onToggleCollapsible?: (collapsible: boolean) => void;
  onUpdateCategory?: (category: string) => void;
  onUpdateAspectRatio?: (aspectRatio: 'auto' | 'square' | 'wide' | 'tall') => void;
  onUpdateRefreshInterval?: (interval: number) => void;
  onUpdatePriority?: (priority: number) => void;
  onToggleShowTitle?: (showTitle: boolean) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function WidgetSettingsModal({
  id,
  title,
  enabled = true,
  collapsible = true,
  locked = false,
  alwaysVisible = false,
  gridCols = 3,
  gridRows = 1,
  category = 'general',
  aspectRatio = 'auto',
  refreshInterval = 0,
  priority = 5,
  showTitle = true,
  totalGridColumns = 12,
  onToggleEnabled,
  onToggleLock,
  onGridColsChange,
  onGridRowsChange,
  onToggleCollapsible,
  onUpdateCategory,
  onUpdateAspectRatio,
  onUpdateRefreshInterval,
  onUpdatePriority,
  onToggleShowTitle,
  trigger,
  open,
  onOpenChange,
}: WidgetSettingsModalProps) {
  const { t } = useTranslations();
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setIsOpen(newOpen);
    }
  };

  const formatRefreshTime = (seconds: number) => {
    if (seconds === 0) return t('dashboard.widgets.settings.autoRefresh.interval.disabled');
    if (seconds < 60) return t('dashboard.widgets.settings.autoRefresh.timeFormats.seconds', { count: seconds.toString() });
    if (seconds < 3600) return t('dashboard.widgets.settings.autoRefresh.timeFormats.minutes', { count: Math.floor(seconds / 60).toString() });
    return t('dashboard.widgets.settings.autoRefresh.timeFormats.hours', { count: Math.floor(seconds / 3600).toString() });
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 8) return t('dashboard.widgets.settings.categoryPriority.priority.levels.critical');
    if (priority >= 6) return t('dashboard.widgets.settings.categoryPriority.priority.levels.high');
    if (priority >= 4) return t('dashboard.widgets.settings.categoryPriority.priority.levels.medium');
    if (priority >= 2) return t('dashboard.widgets.settings.categoryPriority.priority.levels.low');
    return t('dashboard.widgets.settings.categoryPriority.priority.levels.minimal');
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'text-red-500';
    if (priority >= 6) return 'text-orange-500';
    if (priority >= 4) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <Dialog open={open !== undefined ? open : isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>{t('dashboard.widgets.settings.title')}</span>
            <Badge variant="outline" className="text-xs">{title}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Status Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Info className="h-4 w-4" />
                <span>{t('dashboard.widgets.settings.currentStatus.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span>{t('dashboard.widgets.settings.currentStatus.visibility')}</span>
                  <Badge variant={enabled ? 'default' : 'secondary'}>
                    {enabled ? t('dashboard.widgets.settings.currentStatus.visible') : t('dashboard.widgets.settings.currentStatus.hidden')}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('dashboard.widgets.settings.currentStatus.size')}</span>
                  <Badge variant="outline">{gridCols}×{gridRows}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('dashboard.widgets.settings.currentStatus.category')}</span>
                  <Badge variant="outline" className="capitalize">{category}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('dashboard.widgets.settings.currentStatus.priority')}</span>
                  <Badge variant="outline" className={getPriorityColor(priority)}>
                    {getPriorityLabel(priority)} ({priority})
                  </Badge>
                </div>
              </div>
              
              {/* Status Indicators */}
              <div className="flex flex-wrap gap-2 mt-3">
                {alwaysVisible && (
                  <Badge variant="destructive" className="text-xs">
                    <LockIcon className="h-3 w-3 mr-1" />
                    {t('dashboard.widgets.settings.currentStatus.badges.criticalWidget')}
                  </Badge>
                )}
                {locked && (
                  <Badge variant="outline" className="text-xs text-yellow-600">
                    <LockIcon className="h-3 w-3 mr-1" />
                    {t('dashboard.widgets.settings.currentStatus.badges.locked')}
                  </Badge>
                )}
                {!collapsible && (
                  <Badge variant="outline" className="text-xs text-orange-600">
                    {t('dashboard.widgets.settings.currentStatus.badges.noCollapse')}
                  </Badge>
                )}
                {refreshInterval > 0 && (
                  <Badge variant="outline" className="text-xs text-green-600">
                    <Timer className="h-3 w-3 mr-1" />
                    {t('dashboard.widgets.settings.currentStatus.badges.autoRefresh')}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Visibility & Behavior */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>{t('dashboard.widgets.settings.visibilityBehavior.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">{t('dashboard.widgets.settings.visibilityBehavior.widgetEnabled.label')}</Label>
                    <p className="text-xs text-muted-foreground">{t('dashboard.widgets.settings.visibilityBehavior.widgetEnabled.description')}</p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={onToggleEnabled}
                    disabled={alwaysVisible}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">{t('dashboard.widgets.settings.visibilityBehavior.showTitle.label')}</Label>
                    <p className="text-xs text-muted-foreground">{t('dashboard.widgets.settings.visibilityBehavior.showTitle.description')}</p>
                  </div>
                  <Switch
                    checked={showTitle}
                    onCheckedChange={onToggleShowTitle}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">{t('dashboard.widgets.settings.visibilityBehavior.allowCollapsing.label')}</Label>
                    <p className="text-xs text-muted-foreground">{t('dashboard.widgets.settings.visibilityBehavior.allowCollapsing.description')}</p>
                  </div>
                  <Switch
                    checked={collapsible}
                    onCheckedChange={onToggleCollapsible}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">{t('dashboard.widgets.settings.visibilityBehavior.lockWidget.label')}</Label>
                    <p className="text-xs text-muted-foreground">{t('dashboard.widgets.settings.visibilityBehavior.lockWidget.description')}</p>
                  </div>
                  <Switch
                    checked={locked}
                    onCheckedChange={onToggleLock}
                  />
                </div>

                {alwaysVisible && (
                  <div className="col-span-1 md:col-span-2">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center space-x-2 text-sm text-blue-800 dark:text-blue-200">
                        <Info className="h-4 w-4" />
                        <span>{t('dashboard.widgets.settings.visibilityBehavior.criticalNote')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Layout & Sizing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Grid3X3 className="h-4 w-4" />
                <span>{t('dashboard.widgets.settings.layoutSizing.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Width Control */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{t('dashboard.widgets.settings.layoutSizing.width.label')}</Label>
                    <Badge variant="outline" className="text-xs">
                      {t('dashboard.widgets.settings.layoutSizing.width.badge', { cols: gridCols.toString(), total: totalGridColumns.toString() })}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Slider
                      value={[gridCols]}
                      onValueChange={(value: number[]) => onGridColsChange?.(value[0])}
                      min={1}
                      max={totalGridColumns}
                      step={1}
                      className="w-full"
                      disabled={locked}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{t('dashboard.widgets.settings.layoutSizing.width.min')}</span>
                      <span>{t('dashboard.widgets.settings.layoutSizing.width.max', { total: totalGridColumns.toString() })}</span>
                    </div>
                  </div>
                </div>

                {/* Height Control */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{t('dashboard.widgets.settings.layoutSizing.height.label')}</Label>
                    <Badge variant="outline" className="text-xs">
                      {gridRows !== 1 ? t('dashboard.widgets.settings.layoutSizing.height.badgePlural', { rows: gridRows.toString() }) : t('dashboard.widgets.settings.layoutSizing.height.badge', { rows: gridRows.toString() })}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Slider
                      value={[gridRows]}
                      onValueChange={(value: number[]) => onGridRowsChange?.(value[0])}
                      min={1}
                      max={6}
                      step={1}
                      className="w-full"
                      disabled={locked}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{t('dashboard.widgets.settings.layoutSizing.height.min')}</span>
                      <span>{t('dashboard.widgets.settings.layoutSizing.height.max')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('dashboard.widgets.settings.layoutSizing.aspectRatio.label')}</Label>
                <Select value={aspectRatio} onValueChange={onUpdateAspectRatio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t('dashboard.widgets.settings.layoutSizing.aspectRatio.auto')}</SelectItem>
                    <SelectItem value="square">{t('dashboard.widgets.settings.layoutSizing.aspectRatio.square')}</SelectItem>
                    <SelectItem value="wide">{t('dashboard.widgets.settings.layoutSizing.aspectRatio.wide')}</SelectItem>
                    <SelectItem value="tall">{t('dashboard.widgets.settings.layoutSizing.aspectRatio.tall')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Category & Priority */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Palette className="h-4 w-4" />
                <span>{t('dashboard.widgets.settings.categoryPriority.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('dashboard.widgets.settings.categoryPriority.category.label')}</Label>
                  <Select value={category} onValueChange={onUpdateCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">{t('dashboard.widgets.settings.categoryPriority.category.general')}</SelectItem>
                      <SelectItem value="overview">{t('dashboard.widgets.settings.categoryPriority.category.overview')}</SelectItem>
                      <SelectItem value="admin">{t('dashboard.widgets.settings.categoryPriority.category.admin')}</SelectItem>
                      <SelectItem value="metrics">{t('dashboard.widgets.settings.categoryPriority.category.metrics')}</SelectItem>
                      <SelectItem value="analytics">{t('dashboard.widgets.settings.categoryPriority.category.analytics')}</SelectItem>
                      <SelectItem value="reports">{t('dashboard.widgets.settings.categoryPriority.category.reports')}</SelectItem>
                      <SelectItem value="settings">{t('dashboard.widgets.settings.categoryPriority.category.settings')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{t('dashboard.widgets.settings.categoryPriority.priority.label')}</Label>
                    <Badge variant="outline" className={`text-xs ${getPriorityColor(priority)}`}>
                      {getPriorityLabel(priority)} ({priority})
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Slider
                      value={[priority]}
                      onValueChange={(value: number[]) => onUpdatePriority?.(value[0])}
                      min={0}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{t('dashboard.widgets.settings.categoryPriority.priority.min')}</span>
                      <span>{t('dashboard.widgets.settings.categoryPriority.priority.max')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto-Refresh */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Timer className="h-4 w-4" />
                <span>{t('dashboard.widgets.settings.autoRefresh.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{t('dashboard.widgets.settings.autoRefresh.interval.label')}</Label>
                  <Badge variant="outline" className="text-xs">
                    {formatRefreshTime(refreshInterval)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Slider
                    value={[refreshInterval]}
                    onValueChange={(value: number[]) => onUpdateRefreshInterval?.(value[0])}
                    min={0}
                    max={3600}
                    step={60}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t('dashboard.widgets.settings.autoRefresh.interval.min')}</span>
                    <span>{t('dashboard.widgets.settings.autoRefresh.interval.max')}</span>
                  </div>
                </div>
                {refreshInterval > 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center space-x-2 text-sm text-green-800 dark:text-green-200">
                      <Timer className="h-4 w-4" />
                      <span>{t('dashboard.widgets.settings.autoRefresh.note', { time: formatRefreshTime(refreshInterval) })}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('dashboard.widgets.settings.preview.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="text-sm space-y-2">
                  <div className="font-medium">{t('dashboard.widgets.settings.preview.widget', { title })}</div>
                  <div className="text-muted-foreground">
                    {t('dashboard.widgets.settings.preview.details', { cols: gridCols.toString(), rows: gridRows.toString(), category, priority: priority.toString() })}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {enabled && <Badge variant="default" className="text-xs">{t('dashboard.widgets.settings.preview.badges.visible')}</Badge>}
                    {!enabled && <Badge variant="secondary" className="text-xs">{t('dashboard.widgets.settings.preview.badges.hidden')}</Badge>}
                    {showTitle && <Badge variant="outline" className="text-xs">{t('dashboard.widgets.settings.preview.badges.titleShown')}</Badge>}
                    {!showTitle && <Badge variant="outline" className="text-xs text-orange-600">{t('dashboard.widgets.settings.preview.badges.titleHidden')}</Badge>}
                    {collapsible && <Badge variant="outline" className="text-xs">{t('dashboard.widgets.settings.preview.badges.collapsible')}</Badge>}
                    {locked && <Badge variant="outline" className="text-xs text-yellow-600">{t('dashboard.widgets.settings.preview.badges.locked')}</Badge>}
                    {refreshInterval > 0 && <Badge variant="outline" className="text-xs text-green-600">{t('dashboard.widgets.settings.preview.badges.autoRefresh')}</Badge>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
} 