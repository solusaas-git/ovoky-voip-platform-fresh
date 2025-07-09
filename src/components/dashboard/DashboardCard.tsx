'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WidgetSettingsModal } from './WidgetSettingsModal';
import { 
  ChevronDown, 
  ChevronUp, 
  GripVertical, 
  EyeOff, 
  Settings,
  Timer,
  Eye,
  Lock as LockIcon,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslations } from '@/lib/i18n';

interface DashboardCardProps {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  // Basic state
  collapsed?: boolean;
  enabled?: boolean;
  size?: 'small' | 'medium' | 'large' | 'full';
  gridCols?: number;
  gridRows?: number;
  // Advanced features
  collapsible?: boolean;
  locked?: boolean;
  alwaysVisible?: boolean;
  minSize?: 'small' | 'medium' | 'large';
  maxSize?: 'medium' | 'large' | 'full';
  category?: string;
  aspectRatio?: 'auto' | 'square' | 'wide' | 'tall';
  refreshInterval?: number;
  priority?: number;
  showTitle?: boolean;
  // Event handlers
  onToggleCollapse?: (collapsed: boolean) => void;
  onToggleEnabled?: (enabled: boolean) => void;
  onResize?: (size: 'small' | 'medium' | 'large' | 'full') => void;
  onToggleLock?: (locked: boolean) => void;
  onRefresh?: () => void;
  onGridColsChange?: (gridCols: number) => void;
  onGridRowsChange?: (gridRows: number) => void;
  onToggleCollapsible?: (collapsible: boolean) => void;
  onUpdateCategory?: (category: string) => void;
  onUpdateAspectRatio?: (aspectRatio: 'auto' | 'square' | 'wide' | 'tall') => void;
  onUpdateRefreshInterval?: (interval: number) => void;
  onUpdatePriority?: (priority: number) => void;
  onToggleShowTitle?: (showTitle: boolean) => void;
  // UI state
  isDraggable?: boolean;
  isEditMode?: boolean;
  className?: string;
  headerActions?: React.ReactNode;
  // Responsive
  totalGridColumns?: number;
}

export function DashboardCard({
  id,
  title,
  description,
  icon,
  badge,
  children,
  collapsed = false,
  enabled = true,
  gridCols = 3,
  gridRows = 1,
  collapsible = true,
  locked = false,
  alwaysVisible = false,
  category = 'general',
  aspectRatio = 'auto',
  refreshInterval = 0,
  priority = 5,
  showTitle = true,
  onToggleCollapse,
  onToggleEnabled,
  onToggleLock,
  onRefresh,
  onGridColsChange,
  onGridRowsChange,
  onToggleCollapsible,
  onUpdateCategory,
  onUpdateAspectRatio,
  onUpdateRefreshInterval,
  onUpdatePriority,
  onToggleShowTitle,
  isDraggable = false,
  isEditMode = false,
  className,
  headerActions,
  totalGridColumns = 12,
}: DashboardCardProps) {
  const { t } = useTranslations();
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [timeToRefresh, setTimeToRefresh] = useState(refreshInterval);
  const [shouldRefresh, setShouldRefresh] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id,
    disabled: locked || !isDraggable || !isEditMode
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Auto-refresh timer
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        setTimeToRefresh(prev => {
          if (prev <= 1) {
            setShouldRefresh(true); // Trigger refresh flag
            return refreshInterval; // Reset timer
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  // Separate effect to handle refresh trigger
  useEffect(() => {
    if (shouldRefresh) {
      setShouldRefresh(false); // Reset flag
      onRefresh?.();
    }
  }, [shouldRefresh, onRefresh]);

  const handleToggleCollapse = () => {
    if (!collapsible) return;
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onToggleCollapse?.(newCollapsed);
  };

  const handleToggleEnabled = () => {
    if (alwaysVisible) return;
    onToggleEnabled?.(!enabled);
  };



  const handleRefresh = () => {
    setTimeToRefresh(refreshInterval);
    setShouldRefresh(false); // Reset auto-refresh flag
    onRefresh?.();
  };

  const getGridClasses = () => {
    const colSpan = Math.min(gridCols, totalGridColumns);
    const rowSpan = gridRows;
    
    // Generate CSS Grid classes dynamically
    const classes = [];
    
    // Mobile-first approach: Force full width on mobile (col-span-12), use desktop value on larger screens
    // This ensures each widget takes full width on mobile regardless of desktop configuration
    classes.push('col-span-12'); // Mobile: full width
    
    // Desktop column span - add responsive classes for md and up
    switch (colSpan) {
      case 1: classes.push('md:col-span-1'); break;
      case 2: classes.push('md:col-span-2'); break;
      case 3: classes.push('md:col-span-3'); break;
      case 4: classes.push('md:col-span-4'); break;
      case 5: classes.push('md:col-span-5'); break;
      case 6: classes.push('md:col-span-6'); break;
      case 7: classes.push('md:col-span-7'); break;
      case 8: classes.push('md:col-span-8'); break;
      case 9: classes.push('md:col-span-9'); break;
      case 10: classes.push('md:col-span-10'); break;
      case 11: classes.push('md:col-span-11'); break;
      case 12: classes.push('md:col-span-12'); break;
      default: 
        if (colSpan >= totalGridColumns) {
          classes.push('md:col-span-full');
        } else {
          classes.push('md:col-span-3'); // Fallback
        }
    }
    
    // Row span - handle all possible values 1-6
    switch (rowSpan) {
      case 2: classes.push('row-span-2'); break;
      case 3: classes.push('row-span-3'); break;
      case 4: classes.push('row-span-4'); break;
      case 5: classes.push('row-span-5'); break;
      case 6: classes.push('row-span-6'); break;
      default: break; // row-span-1 is default
    }
    
    return classes.join(' ');
  };

  const getAspectRatioClasses = () => {
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square';
      case 'wide':
        return 'aspect-[2/1]';
      case 'tall':
        return 'aspect-[1/2]';
      default:
        return '';
    }
  };

  const getPriorityColor = () => {
    if (priority >= 8) return 'text-red-500';
    if (priority >= 6) return 'text-orange-500';
    if (priority >= 4) return 'text-yellow-500';
    return 'text-green-500';
  };

  const formatRefreshTime = (seconds: number) => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        getGridClasses(),
        getAspectRatioClasses(),
        isDragging && 'opacity-50 scale-95 z-50',
        !enabled && 'opacity-60',
        locked && 'ring-2 ring-yellow-400 ring-opacity-50',
        className
      )}
    >
      <Card className={cn(
        'h-full transition-all duration-200',
        isDragging && 'shadow-lg',
        !enabled && 'border-dashed bg-muted/30',
        isEditMode && 'ring-2 ring-primary/20',
        locked && 'bg-yellow-50 dark:bg-yellow-950/10',
        alwaysVisible && 'ring-2 ring-green-400 ring-opacity-30'
      )}>
        {/* Card Header - Conditionally rendered based on showTitle */}
        {(showTitle || isEditMode) && (
          <CardHeader className={cn(
            'pb-3',
            isCollapsed && 'pb-4'
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                {/* Drag Handle */}
                {isDraggable && isEditMode && !locked && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 cursor-grab active:cursor-grabbing opacity-60 hover:opacity-100"
                          {...attributes}
                          {...listeners}
                        >
                          <GripVertical className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('dashboard.widgets.editMode.buttons.dragTooltip')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {/* Lock indicator for locked widgets */}
                {locked && isEditMode && (
                  <LockIcon className="h-4 w-4 text-yellow-600" />
                )}
                
                {/* Icon */}
                {icon && showTitle && (
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    {icon}
                  </div>
                )}
                
                {/* Title and Description */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    {showTitle && (
                      <CardTitle className={cn(
                        "text-base font-semibold truncate",
                        !enabled && "text-muted-foreground line-through"
                      )}>
                        {title}
                      </CardTitle>
                    )}
                    
                    {/* Show title in edit mode even if hidden for identification */}
                    {!showTitle && isEditMode && (
                      <CardTitle className={cn(
                        "text-base font-semibold truncate opacity-50 italic",
                        !enabled && "text-muted-foreground line-through"
                      )}>
                        {title} (Title Hidden)
                      </CardTitle>
                    )}
                    
                    {badge}
                    
                    {/* Status badges */}
                    {!enabled && (
                      <Badge variant="secondary" className="text-xs">
                        <EyeOff className="h-3 w-3 mr-1" />
                        {t('dashboard.widgets.editMode.buttons.hidden')}
                      </Badge>
                    )}
                    
                    {!showTitle && isEditMode && (
                      <Badge variant="outline" className="text-xs text-orange-600">
                        No Title
                      </Badge>
                    )}
                    
                    {alwaysVisible && (
                      <Badge variant="destructive" className="text-xs">
                        Critical
                      </Badge>
                    )}
                    
                    {isEditMode && (
                      <Badge variant="outline" className="text-xs">
                        {gridCols}×{gridRows}
                      </Badge>
                    )}
                    
                    {isEditMode && priority !== 5 && (
                      <Badge variant="outline" className={cn("text-xs", getPriorityColor())}>
                        P{priority}
                      </Badge>
                    )}
                  </div>
                  
                  {description && !isCollapsed && showTitle && (
                    <p className="text-sm text-muted-foreground truncate">
                      {description}
                    </p>
                  )}
                  
                  {isEditMode && category !== 'general' && (
                    <p className="text-xs text-muted-foreground">
                      Category: {category}
                    </p>
                  )}
                </div>
              </div>

              {/* Only keep header actions that make sense in header */}
              <div className="flex items-center space-x-1 flex-shrink-0">
                {headerActions}
                
                {/* Manual Refresh Button - always show if onRefresh is provided */}
                {onRefresh && !isEditMode && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-primary/10"
                          onClick={handleRefresh}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('dashboard.widgets.editMode.buttons.refreshTooltip')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {/* Auto-refresh Timer - only show if auto-refresh is enabled */}
                {refreshInterval > 0 && !isEditMode && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground px-2 py-1 rounded bg-muted/30">
                          <Timer className="h-3 w-3" />
                          <span>{formatRefreshTime(timeToRefresh)}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('dashboard.widgets.editMode.buttons.autoRefreshTooltip', { time: formatRefreshTime(timeToRefresh) })}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {/* Keep collapse toggle in header for easy access */}
                {collapsible && onToggleCollapse && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={handleToggleCollapse}
                        >
                          {isCollapsed ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isCollapsed ? 'Expand' : 'Collapse'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </CardHeader>
        )}
        
        {/* Collapsible Content */}
        {!isCollapsed && enabled && (
          <CardContent className={cn(
            "flex-1 flex flex-col",
            showTitle || isEditMode ? "pt-0" : "pt-6" // Add padding when no header
          )}>
            <div className="flex-1 mb-4">
              {children}
            </div>
            
            {/* Widget Actions at Bottom */}
            {isEditMode && (
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div className="flex items-center space-x-2">
                  {/* Widget Settings Modal */}
                  <WidgetSettingsModal
                    id={id}
                    title={title}
                    enabled={enabled}
                    collapsible={collapsible}
                    locked={locked}
                    alwaysVisible={alwaysVisible}
                    gridCols={gridCols}
                    gridRows={gridRows}
                    category={category}
                    aspectRatio={aspectRatio}
                    refreshInterval={refreshInterval}
                    priority={priority}
                    showTitle={showTitle}
                    totalGridColumns={totalGridColumns}
                    onToggleEnabled={onToggleEnabled}
                    onToggleLock={onToggleLock}
                    onGridColsChange={onGridColsChange}
                    onGridRowsChange={onGridRowsChange}
                    onToggleCollapsible={onToggleCollapsible}
                    onUpdateCategory={onUpdateCategory}
                    onUpdateAspectRatio={onUpdateAspectRatio}
                    onUpdateRefreshInterval={onUpdateRefreshInterval}
                    onUpdatePriority={onUpdatePriority}
                    onToggleShowTitle={onToggleShowTitle}
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                      >
                        <Settings className="h-3 w-3 mr-2" />
                        {t('dashboard.widgets.editMode.buttons.settings')}
                      </Button>
                    }
                  />
                  
                  {/* Quick Visibility Toggle */}
                  {!alwaysVisible && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={handleToggleEnabled}
                          >
                            {enabled ? (
                              <>
                                <Eye className="h-3 w-3 mr-2" />
                                {t('dashboard.widgets.editMode.buttons.visible')}
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3 w-3 mr-2" />
                                {t('dashboard.widgets.editMode.buttons.hidden')}
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{enabled ? t('dashboard.widgets.editMode.buttons.hideTooltip') : t('dashboard.widgets.editMode.buttons.showTooltip')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                
                {/* Status indicators on the right */}
                <div className="flex items-center space-x-2">
                  {locked && (
                    <Badge variant="outline" className="text-xs text-yellow-600">
                      <LockIcon className="h-3 w-3 mr-1" />
                      Locked
                    </Badge>
                  )}
                  {alwaysVisible && (
                    <Badge variant="destructive" className="text-xs">
                      Critical
                    </Badge>
                  )}
                  {refreshInterval > 0 && (
                    <Badge variant="outline" className="text-xs text-green-600">
                      <Timer className="h-3 w-3 mr-1" />
                      Auto-refresh
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
} 