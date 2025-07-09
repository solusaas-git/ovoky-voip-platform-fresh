import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import DashboardPreferencesModel from '@/models/DashboardPreferences';
import { getWidgetsForRole } from '@/lib/defaultDashboardPreferences';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Get current user preferences
    const preferences = await DashboardPreferencesModel.findOne({ 
      userId: currentUser.id 
    });

    if (!preferences) {
      return NextResponse.json(
        { error: 'Dashboard preferences not found' }, 
        { status: 404 }
      );
    }

    // Get all widgets that should be available for this user's role
    const allWidgetsForRole = getWidgetsForRole(currentUser.role as 'admin' | 'user');
    
    // Get current widget IDs
    const currentWidgetIds = new Set(preferences.widgets.map(w => w.id));
    
    // Find missing widgets
    const missingWidgets = allWidgetsForRole.filter(
      widget => !currentWidgetIds.has(widget.id)
    );

    if (missingWidgets.length === 0) {
      return NextResponse.json({
        message: 'No missing widgets found',
        addedWidgets: [],
        totalWidgets: preferences.widgets.length
      });
    }

    // Add missing widgets to preferences
    // Set their order to be after existing widgets
    const maxOrder = Math.max(...preferences.widgets.map(w => w.order), 0);
    
    missingWidgets.forEach((widget, index) => {
      widget.order = maxOrder + index + 1;
    });

    // Update preferences with new widgets
    preferences.widgets = [...preferences.widgets, ...missingWidgets];
    preferences.lastUpdated = new Date();
    
    await preferences.save();

    const addedWidgetNames = missingWidgets.map(w => {
      const widgetNames: Record<string, string> = {
        'welcome': 'Welcome',
        'balance': 'Account Balance',
        'indicator-1': 'Cost of Day',
        'indicator-2': 'ASR (Success Rate)',
        'indicator-3': 'ACD (Avg Call Duration)',
        'indicator-4': 'Total Minutes',
        'user-attention': 'Users Requiring Attention',
        'low-balance-users': 'Low Balance Users',
        'unsolved-tickets': 'Unsolved Tickets',
        'phone-number-requests': 'Phone Number Requests',
        'date-selector': 'Date Selector',
      };
      return widgetNames[w.id] || w.id;
    });

    return NextResponse.json({
      message: `Successfully added ${missingWidgets.length} missing widget(s)`,
      addedWidgets: addedWidgetNames,
      addedWidgetIds: missingWidgets.map(w => w.id),
      totalWidgets: preferences.widgets.length,
      preferences: {
        id: preferences._id,
        userId: preferences.userId,
        widgets: preferences.widgets,
        lastUpdated: preferences.lastUpdated
      }
    });

  } catch (error) {
    console.error('Error adding missing widgets:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 