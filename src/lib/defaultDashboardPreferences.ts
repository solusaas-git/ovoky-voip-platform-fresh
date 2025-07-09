import { WidgetConfig, DashboardPreferences } from '@/models/DashboardPreferences';

/**
 * Default dashboard preferences configuration for new users
 * Based on the optimal layout configuration provided
 */

export const DEFAULT_DASHBOARD_WIDGETS: WidgetConfig[] = [
  {
    id: 'welcome',
    enabled: true,
    collapsed: false,
    collapsible: true,
    order: 0,
    size: 'medium',
    gridCols: 6,
    gridRows: 1,
    position: {
      row: 1,
      col: 0
    },
    locked: false,
    alwaysVisible: false,
    minSize: 'medium',
    maxSize: 'large',
    category: 'overview',
    aspectRatio: 'auto',
    refreshInterval: 0,
    priority: 8,
    showTitle: true,
    responsive: {
      mobile: {
        gridCols: 12,
        size: 'medium'
      },
      tablet: {
        gridCols: 6,
        size: 'medium'
      }
    }
  },
  {
    id: 'balance',
    enabled: true,
    collapsed: false,
    collapsible: false,
    order: 1,
    size: 'medium',
    gridCols: 6,
    gridRows: 1,
    position: {
      row: 1,
      col: 6
    },
    locked: false,
    alwaysVisible: true,
    minSize: 'medium',
    maxSize: 'large',
    category: 'overview',
    aspectRatio: 'auto',
    refreshInterval: 300,
    priority: 10,
    showTitle: true,
    responsive: {
      mobile: {
        gridCols: 12,
        size: 'medium'
      },
      tablet: {
        gridCols: 6,
        size: 'medium'
      }
    }
  },
  {
    id: 'date-selector',
    enabled: true,
    collapsed: false,
    collapsible: false,
    order: 2,
    size: 'full',
    gridCols: 12,
    gridRows: 1,
    position: {
      row: 0,
      col: 0
    },
    locked: false,
    alwaysVisible: false,
    minSize: 'small',
    maxSize: 'full',
    category: 'overview',
    aspectRatio: 'auto',
    refreshInterval: 0,
    priority: 9,
    showTitle: false,
    responsive: {
      mobile: {
        gridCols: 12,
        size: 'full'
      },
      tablet: {
        gridCols: 12,
        size: 'full'
      }
    }
  },
  {
    id: 'indicator-3',
    enabled: true,
    collapsed: false,
    collapsible: true,
    order: 3,
    size: 'small',
    gridCols: 4,
    gridRows: 1,
    position: {
      row: 6,
      col: 6
    },
    locked: false,
    alwaysVisible: false,
    minSize: 'small',
    maxSize: 'medium',
    category: 'metrics',
    aspectRatio: 'auto',
    refreshInterval: 0,
    priority: 5,
    showTitle: true,
    responsive: {
      mobile: {
        gridCols: 6,
        size: 'small'
      },
      tablet: {
        gridCols: 3,
        size: 'small'
      }
    }
  },
  {
    id: 'indicator-4',
    enabled: true,
    collapsed: false,
    collapsible: true,
    order: 4,
    size: 'small',
    gridCols: 4,
    gridRows: 1,
    position: {
      row: 6,
      col: 9
    },
    locked: false,
    alwaysVisible: false,
    minSize: 'small',
    maxSize: 'large',
    category: 'metrics',
    aspectRatio: 'auto',
    refreshInterval: 0,
    priority: 5,
    showTitle: true,
    responsive: {
      mobile: {
        gridCols: 6,
        size: 'small'
      },
      tablet: {
        gridCols: 3,
        size: 'small'
      }
    }
  },
  {
    id: 'indicator-1',
    enabled: true,
    collapsed: false,
    collapsible: true,
    order: 5,
    size: 'small',
    gridCols: 4,
    gridRows: 1,
    position: {
      row: 6,
      col: 0
    },
    locked: false,
    alwaysVisible: false,
    minSize: 'small',
    maxSize: 'medium',
    category: 'metrics',
    aspectRatio: 'auto',
    refreshInterval: 0,
    priority: 5,
    showTitle: true,
    responsive: {
      mobile: {
        gridCols: 6,
        size: 'small'
      },
      tablet: {
        gridCols: 3,
        size: 'small'
      }
    }
  },
  {
    id: 'indicator-2',
    enabled: true,
    collapsed: false,
    collapsible: true,
    order: 6,
    size: 'small',
    gridCols: 12,
    gridRows: 1,
    position: {
      row: 6,
      col: 3
    },
    locked: false,
    alwaysVisible: false,
    minSize: 'small',
    maxSize: 'medium',
    category: 'metrics',
    aspectRatio: 'auto',
    refreshInterval: 0,
    priority: 5,
    showTitle: true,
    responsive: {
      mobile: {
        gridCols: 6,
        size: 'small'
      },
      tablet: {
        gridCols: 3,
        size: 'small'
      }
    }
  },
  {
    id: 'unsolved-tickets',
    enabled: true,
    collapsed: false,
    collapsible: true,
    order: 7,
    size: 'large',
    gridCols: 6,
    gridRows: 2,
    position: {
      row: 2,
      col: 0
    },
    locked: false,
    alwaysVisible: false,
    minSize: 'medium',
    maxSize: 'large',
    category: 'admin',
    aspectRatio: 'auto',
    refreshInterval: 180, // Refresh every 3 minutes
    priority: 7,
    showTitle: true,
    responsive: {
      mobile: {
        gridCols: 12,
        size: 'large'
      },
      tablet: {
        gridCols: 12,
        size: 'large'
      }
    }
  }
];

/**
 * Additional admin-only widgets for admin users
 */
export const ADMIN_WIDGETS: WidgetConfig[] = [
  {
    id: 'user-attention',
    enabled: true,
    collapsed: false,
    collapsible: true,
    order: 100, // Higher order to place after default widgets
    size: 'full',
    gridCols: 12,
    gridRows: 2,
    position: { row: 2, col: 0 },
    locked: false,
    alwaysVisible: false,
    minSize: 'large',
    maxSize: 'full',
    category: 'admin',
    aspectRatio: 'auto',
    refreshInterval: 600,
    priority: 7,
    showTitle: true,
    responsive: {
      mobile: { gridCols: 12, size: 'full' },
      tablet: { gridCols: 12, size: 'full' }
    }
  },
  {
    id: 'low-balance-users',
    enabled: true,
    collapsed: false,
    collapsible: true,
    order: 101,
    size: 'full',
    gridCols: 12,
    gridRows: 2,
    position: { row: 4, col: 0 },
    locked: false,
    alwaysVisible: false,
    minSize: 'large',
    maxSize: 'full',
    category: 'admin',
    aspectRatio: 'auto',
    refreshInterval: 900,
    priority: 8,
    showTitle: true,
    responsive: {
      mobile: { gridCols: 12, size: 'full' },
      tablet: { gridCols: 12, size: 'full' }
    }
  },
  {
    id: 'phone-number-requests',
    enabled: true,
    collapsed: false,
    collapsible: true,
    order: 102,
    size: 'large',
    gridCols: 6,
    gridRows: 2,
    position: { row: 2, col: 6 },
    locked: false,
    alwaysVisible: false,
    minSize: 'medium',
    maxSize: 'large',
    category: 'admin',
    aspectRatio: 'auto',
    refreshInterval: 300, // Refresh every 5 minutes
    priority: 7,
    showTitle: true,
    responsive: {
      mobile: { gridCols: 12, size: 'large' },
      tablet: { gridCols: 12, size: 'large' }
    }
  }
];

/**
 * Default dashboard preferences configuration
 */
export const DEFAULT_DASHBOARD_PREFERENCES = {
  layout: 'grid' as const,
  gridColumns: 12,
  theme: 'auto' as const,
  compactMode: false,
  autoSave: true,
  showCategories: false,
  categoryOrder: ['overview', 'admin', 'metrics']
};

/**
 * Create default dashboard preferences for a new user
 * @param userId - The user ID
 * @param userRole - The user's role (affects which widgets are included)
 * @returns Complete dashboard preferences object
 */
export function createDefaultDashboardPreferences(
  userId: string, 
  userRole: 'admin' | 'user' = 'user'
): Omit<DashboardPreferences, '_id' | '__v' | 'createdAt' | 'updatedAt'> {
  let widgets = [...DEFAULT_DASHBOARD_WIDGETS];
  
  // Add admin widgets if user is admin
  if (userRole === 'admin') {
    widgets = [...widgets, ...ADMIN_WIDGETS];
  }
  
  // Sort widgets by order
  widgets.sort((a, b) => a.order - b.order);
  
  return {
    userId,
    ...DEFAULT_DASHBOARD_PREFERENCES,
    widgets,
    lastUpdated: new Date()
  };
}

/**
 * Get widgets filtered by user role
 * @param userRole - The user's role
 * @returns Array of widget configurations appropriate for the role
 */
export function getWidgetsForRole(userRole: 'admin' | 'user' = 'user'): WidgetConfig[] {
  let widgets = [...DEFAULT_DASHBOARD_WIDGETS];

  if (userRole === 'admin') {
    // Admin users get all widgets including admin-specific ones
    widgets = [...widgets, ...ADMIN_WIDGETS];
    return widgets;
  } else {
    // Regular users don't get admin-specific widgets
    return widgets.filter(widget => 
      !['user-attention', 'low-balance-users', 'unsolved-tickets', 'phone-number-requests'].includes(widget.id)
    );
  }
}

/**
 * Reset dashboard preferences to defaults
 * @param currentPreferences - Current preferences to reset
 * @param userRole - User's role
 * @returns Reset preferences
 */
export function resetToDefaultPreferences(
  currentPreferences: DashboardPreferences,
  userRole: 'admin' | 'user' = 'user'
): DashboardPreferences {
  const defaultPrefs = createDefaultDashboardPreferences(currentPreferences.userId, userRole);
  
  return {
    ...currentPreferences,
    ...defaultPrefs,
    lastUpdated: new Date()
  };
}

/**
 * Example: Alternative dashboard layout
 * Uncomment and modify this to replace DEFAULT_DASHBOARD_WIDGETS
 */
/*
export const ALTERNATIVE_DASHBOARD_WIDGETS: WidgetConfig[] = [
  // Full-width balance at top (more prominent)
  {
    id: 'balance',
    enabled: true,
    collapsed: false,
    collapsible: false,
    order: 0,
    size: 'full',
    gridCols: 12,
    gridRows: 1,
    position: { row: 0, col: 0 },
    locked: false,
    alwaysVisible: true,
    category: 'overview',
    aspectRatio: 'auto',
    refreshInterval: 60,  // Refresh every minute
    priority: 10,
    showTitle: true,
    responsive: {
      mobile: { gridCols: 12, size: 'full' },
      tablet: { gridCols: 12, size: 'full' }
    }
  },
  
  // Date selector below balance
  {
    id: 'date-selector',
    enabled: true,
    collapsed: false,
    collapsible: false,
    order: 1,
    size: 'full',
    gridCols: 12,
    gridRows: 1,
    position: { row: 1, col: 0 },
    locked: false,
    alwaysVisible: false,
    category: 'overview',
    aspectRatio: 'auto',
    refreshInterval: 0,
    priority: 9,
    showTitle: false,
    responsive: {
      mobile: { gridCols: 12, size: 'full' },
      tablet: { gridCols: 12, size: 'full' }
    }
  },
  
  // Welcome widget - half width
  {
    id: 'welcome',
    enabled: true,
    collapsed: false,
    collapsible: true,
    order: 2,
    size: 'medium',
    gridCols: 6,
    gridRows: 2,  // Taller welcome section
    position: { row: 2, col: 0 },
    locked: false,
    alwaysVisible: false,
    minSize: 'medium',
    maxSize: 'large',
    category: 'overview',
    aspectRatio: 'auto',
    refreshInterval: 0,
    priority: 8,
    showTitle: true,
    responsive: {
      mobile: { gridCols: 12, size: 'medium' },
      tablet: { gridCols: 12, size: 'medium' }
    }
  },

  // Metrics in a 2x2 grid on the right
  {
    id: 'indicator-1',
    enabled: true,
    collapsed: false,
    collapsible: true,
    order: 3,
    size: 'small',
    gridCols: 3,
    gridRows: 1,
    position: { row: 2, col: 6 },
    locked: false,
    alwaysVisible: false,
    category: 'metrics',
    aspectRatio: 'square',
    refreshInterval: 300,  // Auto-refresh metrics
    priority: 7,
    showTitle: true,
    responsive: {
      mobile: { gridCols: 6, size: 'small' },
      tablet: { gridCols: 3, size: 'small' }
    }
  },
  
  {
    id: 'indicator-2',
    enabled: true,
    collapsed: false,
    collapsible: true,
    order: 4,
    size: 'small',
    gridCols: 3,
    gridRows: 1,
    position: { row: 2, col: 9 },
    locked: false,
    alwaysVisible: false,
    category: 'metrics',
    aspectRatio: 'square',
    refreshInterval: 300,
    priority: 7,
    showTitle: true,
    responsive: {
      mobile: { gridCols: 6, size: 'small' },
      tablet: { gridCols: 3, size: 'small' }
    }
  },
  
  {
    id: 'indicator-3',
    enabled: true,
    collapsed: false,
    collapsible: true,
    order: 5,
    size: 'small',
    gridCols: 3,
    gridRows: 1,
    position: { row: 3, col: 6 },
    locked: false,
    alwaysVisible: false,
    category: 'metrics',
    aspectRatio: 'square',
    refreshInterval: 300,
    priority: 7,
    showTitle: true,
    responsive: {
      mobile: { gridCols: 6, size: 'small' },
      tablet: { gridCols: 3, size: 'small' }
    }
  },
  
  {
    id: 'indicator-4',
    enabled: true,
    collapsed: false,
    collapsible: true,
    order: 6,
    size: 'small',
    gridCols: 3,
    gridRows: 1,
    position: { row: 3, col: 9 },
    locked: false,
    alwaysVisible: false,
    category: 'metrics',
    aspectRatio: 'square',
    refreshInterval: 300,
    priority: 7,
    showTitle: true,
    responsive: {
      mobile: { gridCols: 6, size: 'small' },
      tablet: { gridCols: 3, size: 'small' }
    }
  }
];
*/

/**
 * Quick customization examples:
 * 
 * 1. To use the alternative layout above:
 *    Replace DEFAULT_DASHBOARD_WIDGETS with ALTERNATIVE_DASHBOARD_WIDGETS
 * 
 * 2. To disable a widget by default:
 *    Set enabled: false in the widget config
 * 
 * 3. To change widget positions:
 *    Modify position: { row: X, col: Y } and gridCols
 * 
 * 4. To add auto-refresh:
 *    Set refreshInterval: seconds (e.g., 300 for 5 minutes)
 * 
 * 5. To change theme:
 *    Modify DEFAULT_DASHBOARD_PREFERENCES.theme
 * 
 * 6. To enable categories by default:
 *    Set DEFAULT_DASHBOARD_PREFERENCES.showCategories: true
 * 
 * 7. To change grid size:
 *    Modify DEFAULT_DASHBOARD_PREFERENCES.gridColumns (1-24)
 */ 