'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Settings, 
  Edit3, 
  Save, 
  RotateCcw, 
  Layout, 
  Palette, 
  Maximize2,
  Eye,
  EyeOff,
  Grid3X3,
  Tags,
  Download,
  Upload,
  FileText,
  Lock,
  Timer,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardPreferences } from '@/models/DashboardPreferences';
import { toast } from 'sonner';
import { ThemeSettingsWidget } from '@/components/ThemeSettingsWidget';
import { useTranslations } from '@/lib/i18n';

interface DashboardSettingsProps {
  preferences: DashboardPreferences | null;
  isEditMode: boolean;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  onToggleEditMode: () => void;
  onToggleWidget: (widgetId: string) => void;
  onUpdateLayout: (layout: 'grid' | 'list' | 'masonry' | 'custom') => void;
  onUpdateGridColumns: (columns: number) => void;
  onToggleCompactMode: () => void;
  onToggleAutoSave: () => void;
  onToggleShowCategories: () => void;
  onSavePreferences: () => Promise<void>;
  onResetToDefaults: () => Promise<void>;
  onExportPreferences: () => string;
  onImportPreferences: (data: string) => Promise<boolean>;
}

export function DashboardSettings({
  preferences,
  isEditMode,
  hasUnsavedChanges = false,
  isSaving = false,
  onToggleEditMode,
  onToggleWidget,
  onUpdateLayout,
  onUpdateGridColumns,
  onToggleCompactMode,
  onToggleAutoSave,
  onToggleShowCategories,
  onSavePreferences,
  onResetToDefaults,
  onExportPreferences,
  onImportPreferences,
}: DashboardSettingsProps) {
  const { t } = useTranslations();
  const [isExpanded, setIsExpanded] = useState(false);
  const [importData, setImportData] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);

  const getEnabledWidgetsCount = () => {
    return preferences?.widgets?.filter(w => w.enabled).length || 0;
  };

  const getTotalWidgetsCount = () => {
    return preferences?.widgets?.length || 0;
  };

  const getCollapsedWidgetsCount = () => {
    return preferences?.widgets?.filter(w => w.collapsed).length || 0;
  };

  const getLockedWidgetsCount = () => {
    return preferences?.widgets?.filter(w => w.locked).length || 0;
  };

  const getCriticalWidgetsCount = () => {
    return preferences?.widgets?.filter(w => w.alwaysVisible).length || 0;
  };

  const getAutoRefreshWidgetsCount = () => {
    return preferences?.widgets?.filter(w => w.refreshInterval && w.refreshInterval > 0).length || 0;
  };

  const getCategories = () => {
    const categories = new Set(preferences?.widgets?.map(w => w.category).filter(Boolean) || []);
    return Array.from(categories);
  };

  const getWidgetDisplayName = (widgetId: string): string => {
    const widgetNames: Record<string, string> = {
      'welcome': t('dashboard.widgets.welcome.title'),
      'balance': t('dashboard.widgets.balance.title'),
      'indicator-1': t('dashboard.widgets.costOfDay.title'),
      'indicator-2': t('dashboard.widgets.asr.title'),
      'indicator-3': t('dashboard.widgets.acd.title'),
      'indicator-4': t('dashboard.widgets.totalMinutes.title'),
      'user-attention': t('dashboard.widgets.userAttention.title'),
      'low-balance-users': t('dashboard.widgets.lowBalanceUsers.title'),
      'unsolved-tickets': t('dashboard.widgets.unsolvedTickets.title'),
      'phone-number-requests': t('dashboard.widgets.phoneNumberRequests.title'),
      'date-selector': t('dashboard.widgets.dateSelector.title'),
    };

    return widgetNames[widgetId] || widgetId.charAt(0).toUpperCase() + widgetId.slice(1).replace(/-/g, ' ');
  };

  const handleExport = () => {
    const data = onExportPreferences();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-preferences-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!importData.trim()) return;
    
    const success = await onImportPreferences(importData);
    if (success) {
      setImportData('');
      setShowImportDialog(false);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 hidden md:block">
      <div className={cn(
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "border rounded-lg shadow-lg transition-all duration-200",
        isExpanded ? "w-96 max-h-[calc(100vh-2rem)] overflow-y-auto" : "w-auto"
      )}>
        {/* Toggle Button */}
        <div className="p-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              {isExpanded && <span>{t('dashboard.settings.title')}</span>}
              {hasUnsavedChanges && (
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              )}
            </Button>
            
            {!isExpanded && (
              <div className="flex items-center space-x-1">
                {isEditMode && (
                  <Badge variant="secondary" className="text-xs">
                    {t('dashboard.settings.status.editMode')}
                  </Badge>
                )}
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="text-xs">
                    {t('dashboard.settings.status.unsaved')}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Expanded Settings */}
        {isExpanded && (
          <div className="px-3 pb-3 space-y-4">
            <Separator />
            
            {/* Edit Mode Toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Edit3 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('dashboard.settings.editMode.label')}</span>
                </div>
                <Switch
                  checked={isEditMode}
                  onCheckedChange={onToggleEditMode}
                />
              </div>
              
              {isEditMode && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  {t('dashboard.settings.editMode.helpText')}
                </div>
              )}
            </div>

            <Separator />

            {/* Widget Statistics */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('dashboard.settings.widgetStatus.title')}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span>{t('dashboard.settings.widgetStatus.enabled')}</span>
                  <Badge variant="default" className="text-xs h-5">
                    {getEnabledWidgetsCount()}/{getTotalWidgetsCount()}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard.settings.widgetStatus.collapsed')}</span>
                  <Badge variant="outline" className="text-xs h-5">
                    {getCollapsedWidgetsCount()}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard.settings.widgetStatus.locked')}</span>
                  <Badge variant="secondary" className="text-xs h-5">
                    {getLockedWidgetsCount()}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard.settings.widgetStatus.critical')}</span>
                  <Badge variant="destructive" className="text-xs h-5">
                    {getCriticalWidgetsCount()}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard.settings.widgetStatus.autoRefresh')}</span>
                  <Badge variant="outline" className="text-xs h-5">
                    {getAutoRefreshWidgetsCount()}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Widget Management */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('dashboard.settings.widgetVisibility.title')}</span>
              </div>
              
              {preferences?.widgets && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {preferences.widgets
                    .sort((a, b) => a.order - b.order)
                    .map((widget) => (
                      <div
                        key={widget.id}
                        className="flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <div className="flex items-center space-x-1">
                            {widget.enabled ? (
                              <Eye className="h-3 w-3 text-green-600" />
                            ) : (
                              <EyeOff className="h-3 w-3 text-muted-foreground" />
                            )}
                            {widget.locked && <Lock className="h-3 w-3 text-amber-600" />}
                            {widget.refreshInterval && widget.refreshInterval > 0 && (
                              <Timer className="h-3 w-3 text-blue-600" />
                            )}
                          </div>
                          <span className={cn(
                            "text-xs font-medium truncate",
                            !widget.enabled && "text-muted-foreground line-through"
                          )}>
                            {getWidgetDisplayName(widget.id)}
                          </span>
                          <Badge variant="outline" className="text-xs h-4 px-1">
                            {widget.category || 'general'}
                          </Badge>
                        </div>
                        <Switch
                          checked={widget.enabled}
                          onCheckedChange={() => onToggleWidget(widget.id)}
                          disabled={widget.alwaysVisible}
                        />
                      </div>
                    ))}
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                {t('dashboard.settings.widgetVisibility.helpText')}
              </div>
            </div>

            <Separator />

            {/* Add Missing Widgets */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Plus className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('dashboard.settings.missingWidgets.title')}</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/dashboard/preferences/add-missing-widgets', {
                      method: 'POST',
                    });
                    
                    if (response.ok) {
                      const result = await response.json();
                      if (result.addedWidgets.length > 0) {
                        toast.success(`Added ${result.addedWidgets.length} missing widget(s): ${result.addedWidgets.join(', ')}`);
                        // Refresh the page to show new widgets
                        setTimeout(() => {
                          window.location.reload();
                        }, 1000); // Give time for toast to show
                      } else {
                        toast.info('All widgets are already present');
                      }
                    } else {
                      const errorData = await response.json();
                      toast.error(`Failed to add widgets: ${errorData.error}`);
                    }
                  } catch (error) {
                    console.error('Error adding missing widgets:', error);
                    toast.error('Failed to add missing widgets');
                  }
                }}
              >
                <Plus className="h-3 w-3 mr-2" />
                {t('dashboard.settings.missingWidgets.addButton')}
              </Button>
              
              <div className="text-xs text-muted-foreground">
                {t('dashboard.settings.missingWidgets.helpText')}
              </div>
            </div>

            <Separator />

            {/* Layout Settings */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Layout className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('dashboard.settings.layout.title')}</span>
              </div>
              
              <Select
                value={preferences?.layout || 'grid'}
                onValueChange={(value: 'grid' | 'list' | 'masonry' | 'custom') => onUpdateLayout(value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">{t('dashboard.settings.layout.grid')}</SelectItem>
                  <SelectItem value="list">{t('dashboard.settings.layout.list')}</SelectItem>
                  <SelectItem value="masonry">{t('dashboard.settings.layout.masonry')}</SelectItem>
                  <SelectItem value="custom">{t('dashboard.settings.layout.custom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Grid Columns */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Grid3X3 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('dashboard.settings.gridColumns.title')}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {preferences?.gridColumns || 12}
                </Badge>
              </div>
              
              <Input
                type="number"
                value={preferences?.gridColumns || 12}
                onChange={(e) => onUpdateGridColumns(Number(e.target.value))}
                min={6}
                max={24}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('dashboard.settings.gridColumns.min')}</span>
                <span>{t('dashboard.settings.gridColumns.max')}</span>
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Tags className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('dashboard.settings.categories.title')}</span>
                </div>
                <Switch
                  checked={preferences?.showCategories || false}
                  onCheckedChange={onToggleShowCategories}
                />
              </div>
              
              {preferences?.showCategories && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">{t('dashboard.settings.categories.available')}</div>
                  <div className="flex flex-wrap gap-1">
                    {getCategories().map((category) => (
                      <Badge key={category} variant="outline" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Settings */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('dashboard.settings.theme.title')}</span>
              </div>
              
              <ThemeSettingsWidget />
            </div>

            {/* Advanced Options */}
            <div className="space-y-3">
              <div className="text-sm font-medium">{t('dashboard.settings.advanced.title')}</div>
              
              {/* Compact Mode */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Maximize2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t('dashboard.settings.advanced.compactMode')}</span>
                </div>
                <Switch
                  checked={preferences?.compactMode || false}
                  onCheckedChange={onToggleCompactMode}
                />
              </div>
              
              {/* Auto Save */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Save className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t('dashboard.settings.advanced.autoSave')}</span>
                </div>
                <Switch
                  checked={preferences?.autoSave || false}
                  onCheckedChange={onToggleAutoSave}
                />
              </div>
            </div>

            <Separator />

            {/* Import/Export */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('dashboard.settings.backupRestore.title')}</span>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="flex-1 h-8 text-xs"
                >
                  <Download className="h-3 w-3 mr-2" />
                  {t('dashboard.settings.backupRestore.export')}
                </Button>
                
                <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                    >
                      <Upload className="h-3 w-3 mr-2" />
                      {t('dashboard.settings.backupRestore.import')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('dashboard.settings.backupRestore.importDialog.title')}</DialogTitle>
                      <DialogDescription>
                        {t('dashboard.settings.backupRestore.importDialog.description')}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Textarea
                        placeholder={t('dashboard.settings.backupRestore.importDialog.placeholder')}
                        value={importData}
                        onChange={(e) => setImportData(e.target.value)}
                        className="min-h-[200px]"
                      />
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowImportDialog(false)}
                        >
                          {t('dashboard.settings.backupRestore.importDialog.cancel')}
                        </Button>
                        <Button onClick={handleImport} disabled={!importData.trim()}>
                          {t('dashboard.settings.backupRestore.importDialog.import')}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                onClick={onSavePreferences}
                disabled={(!hasUnsavedChanges && preferences?.autoSave) || isSaving}
                className="w-full h-8 text-xs"
                size="sm"
              >
                <Save className="h-3 w-3 mr-2" />
                {isSaving ? t('dashboard.settings.actions.saving') : hasUnsavedChanges ? t('dashboard.settings.actions.saveChanges') : preferences?.autoSave ? t('dashboard.settings.actions.autoSaved') : t('dashboard.settings.actions.saved')}
              </Button>
              
              <Button
                variant="outline"
                onClick={onResetToDefaults}
                className="w-full h-8 text-xs"
                size="sm"
              >
                <RotateCcw className="h-3 w-3 mr-2" />
                {t('dashboard.settings.actions.resetToDefaults')}
              </Button>
            </div>

            {/* Status */}
            {preferences?.lastUpdated && (
              <div className="text-xs text-muted-foreground text-center">
                {t('dashboard.settings.status.lastUpdated', { time: new Date(preferences.lastUpdated).toLocaleTimeString() })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 