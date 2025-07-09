import { NextRequest, NextResponse } from 'next/server';
import { requireActiveUser } from '@/lib/authMiddleware';
import { connectToDatabase } from '@/lib/db';
import DashboardPreferencesModel, { WidgetConfig } from '@/models/DashboardPreferences';
import { createDefaultDashboardPreferences, getWidgetsForRole } from '@/lib/defaultDashboardPreferences';

// Define all available widgets
const DEFAULT_WIDGETS: WidgetConfig[] = [
  {
    id: 'date-selector',
    enabled: true,
    collapsed: false,
    collapsible: false,
    order: 0,
    size: 'full',
    gridCols: 12,
    gridRows: 1,
    position: { row: 0, col: 0 },
    locked: false,
    alwaysVisible: false,
    category: 'overview',
    aspectRatio: 'wide',
    refreshInterval: 0,
    priority: 9,
    showTitle: true,
    responsive: {
      mobile: { gridCols: 12, size: 'full' },
      tablet: { gridCols: 12, size: 'full' }
    }
  },
  {
    id: 'welcome',
    enabled: true,
    collapsed: false,
    collapsible: true,
    order: 1,
    size: 'medium',
    gridCols: 6,
    gridRows: 1,
    position: { row: 1, col: 0 },
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
      tablet: { gridCols: 6, size: 'medium' }
    }
  },
  {
    id: 'balance',
    enabled: true,
    collapsed: false,
    collapsible: false,
    order: 2,
    size: 'medium',
    gridCols: 6,
    gridRows: 1,
    position: { row: 1, col: 6 },
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
      mobile: { gridCols: 12, size: 'medium' },
      tablet: { gridCols: 6, size: 'medium' }
    }
  },
  {
    id: 'user-attention',
    enabled: true,
    collapsed: false,
    collapsible: true,
    order: 3,
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
    order: 4,
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
    id: 'indicator-1',
    enabled: true,
    collapsed: false,
    collapsible: true,
    order: 5,
    size: 'small',
    gridCols: 3,
    gridRows: 1,
    position: { row: 6, col: 0 },
    locked: false,
    alwaysVisible: false,
    minSize: 'small',
    maxSize: 'medium',
    category: 'metrics',
    aspectRatio: 'square',
    refreshInterval: 0,
    priority: 5,
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
    order: 6,
    size: 'small',
    gridCols: 3,
    gridRows: 1,
    position: { row: 6, col: 3 },
    locked: false,
    alwaysVisible: false,
    minSize: 'small',
    maxSize: 'medium',
    category: 'metrics',
    aspectRatio: 'square',
    refreshInterval: 0,
    priority: 5,
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
    order: 7,
    size: 'small',
    gridCols: 3,
    gridRows: 1,
    position: { row: 6, col: 6 },
    locked: false,
    alwaysVisible: false,
    minSize: 'small',
    maxSize: 'medium',
    category: 'metrics',
    aspectRatio: 'square',
    refreshInterval: 0,
    priority: 5,
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
    order: 8,
    size: 'small',
    gridCols: 3,
    gridRows: 1,
    position: { row: 6, col: 9 },
    locked: false,
    alwaysVisible: false,
    minSize: 'small',
    maxSize: 'large',
    category: 'metrics',
    aspectRatio: 'square',
    refreshInterval: 0,
    priority: 5,
    showTitle: true,
    responsive: {
      mobile: { gridCols: 6, size: 'small' },
      tablet: { gridCols: 3, size: 'small' }
    }
  }
];

export async function GET() {
  try {
    const authResult = await requireActiveUser();
    
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    
    const currentUser = authResult.user;

    await connectToDatabase();
    
    // Get or create user's dashboard preferences using the new default configuration
    const preferences = await DashboardPreferencesModel.findOneAndUpdate(
      { userId: currentUser.id },
      {
        $setOnInsert: createDefaultDashboardPreferences(
          currentUser.id, 
          currentUser.role === 'admin' ? 'admin' : 'user'
        )
      },
      { 
        new: true, 
        upsert: true 
      }
    );

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error fetching dashboard preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireActiveUser();
    
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    
    const currentUser = authResult.user;

    const body = await request.json();
    
    await connectToDatabase();

    // Validate input
    const {
      layout,
      gridColumns,
      widgets,
      theme,
      compactMode,
      autoSave,
      showCategories,
      categoryOrder
    } = body;

    // Basic validation
    if (layout && !['grid', 'list', 'masonry', 'custom'].includes(layout)) {
      return NextResponse.json({ error: 'Invalid layout value' }, { status: 400 });
    }

    if (theme && !['light', 'dark', 'auto'].includes(theme)) {
      return NextResponse.json({ error: 'Invalid theme value' }, { status: 400 });
    }

    if (widgets && !Array.isArray(widgets)) {
      return NextResponse.json({ error: 'Widgets must be an array' }, { status: 400 });
    }

    if (gridColumns && (gridColumns < 1 || gridColumns > 24)) {
      return NextResponse.json({ error: 'Grid columns must be between 1 and 24' }, { status: 400 });
    }

    // Validate widget configurations
    if (widgets) {
      for (const widget of widgets) {
        if (widget.gridCols && (widget.gridCols < 1 || widget.gridCols > 12)) {
          return NextResponse.json({ 
            error: `Widget ${widget.id}: gridCols must be between 1 and 12` 
          }, { status: 400 });
        }
        
        if (widget.gridRows && (widget.gridRows < 1 || widget.gridRows > 6)) {
          return NextResponse.json({ 
            error: `Widget ${widget.id}: gridRows must be between 1 and 6` 
          }, { status: 400 });
        }

        if (widget.refreshInterval && (widget.refreshInterval < 0 || widget.refreshInterval > 3600)) {
          return NextResponse.json({ 
            error: `Widget ${widget.id}: refreshInterval must be between 0 and 3600 seconds` 
          }, { status: 400 });
        }

        if (widget.priority && (widget.priority < 0 || widget.priority > 10)) {
          return NextResponse.json({ 
            error: `Widget ${widget.id}: priority must be between 0 and 10` 
          }, { status: 400 });
        }
      }
    }

    // Find and update or create preferences using upsert
    const updateData = {
      ...(layout && { layout }),
      ...(typeof gridColumns === 'number' && { gridColumns }),
      ...(widgets && { widgets }),
      ...(theme && { theme }),
      ...(typeof compactMode === 'boolean' && { compactMode }),
      ...(typeof autoSave === 'boolean' && { autoSave }),
      ...(typeof showCategories === 'boolean' && { showCategories }),
      ...(categoryOrder && { categoryOrder }),
      lastUpdated: new Date()
    };

    // Add default values for new documents (only for fields not being updated)
    const setOnInsertData = {
      userId: currentUser.id,
      ...(layout ? {} : { layout: 'grid' }),
      ...(typeof gridColumns === 'number' ? {} : { gridColumns: 12 }),
      ...(widgets ? {} : { widgets: DEFAULT_WIDGETS }),
      ...(theme ? {} : { theme: 'auto' }),
      ...(typeof compactMode === 'boolean' ? {} : { compactMode: false }),
      ...(typeof autoSave === 'boolean' ? {} : { autoSave: true }),
      ...(typeof showCategories === 'boolean' ? {} : { showCategories: false }),
      ...(categoryOrder ? {} : { categoryOrder: ['overview', 'admin', 'metrics'] })
    };

    const preferences = await DashboardPreferencesModel.findOneAndUpdate(
      { userId: currentUser.id },
      {
        $set: updateData,
        $setOnInsert: setOnInsertData
      },
      { 
        new: true, 
        upsert: true,
        runValidators: true
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Dashboard preferences updated successfully',
      preferences
    });
  } catch (error) {
    console.error('Error saving dashboard preferences:', error);
    
    // Handle specific MongoDB errors
    if (error instanceof Error) {
      if (error.message.includes('ConflictingUpdateOperators')) {
        return NextResponse.json({ 
          error: 'Database conflict error. Please refresh the page and try again.' 
        }, { status: 409 });
      }
      
      if (error.message.includes('ValidationError')) {
        return NextResponse.json({ 
          error: 'Invalid data provided. Please check your settings and try again.' 
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: `Failed to save preferences: ${error.message}` 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'An unexpected error occurred while saving preferences' 
    }, { status: 500 });
  }
} 