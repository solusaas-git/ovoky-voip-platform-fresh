import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { 
  initializeUserDefaults, 
  resetUserPreferences, 
  checkUserPreferences,
  bulkInitializeUsers 
} from '@/lib/userSetup';

/**
 * GET /api/admin/user-defaults
 * Check preferences status for a user or multiple users
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId parameter is required' }, { status: 400 });
    }

    const status = await checkUserPreferences(userId);

    return NextResponse.json({
      userId,
      status,
      message: status.needsInitialization 
        ? 'User needs preference initialization'
        : 'User preferences are set up'
    });

  } catch (error) {
    console.error('Error checking user preferences:', error);
    return NextResponse.json({ 
      error: 'Failed to check user preferences',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/user-defaults
 * Initialize or reset user preferences
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      action, 
      userId, 
      userRole = 'user', 
      resetOptions = { resetDashboard: true, resetNotifications: true },
      users // For bulk operations
    } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    switch (action) {
      case 'initialize': {
        if (!userId) {
          return NextResponse.json({ error: 'userId is required for initialize action' }, { status: 400 });
        }

        const result = await initializeUserDefaults(userId, userRole);
        
        if (result.success) {
          return NextResponse.json({
            success: true,
            message: `Successfully initialized default preferences for user ${userId}`,
            data: {
              dashboardPreferences: result.dashboardPreferences,
              notificationPreferences: result.notificationPreferences
            }
          });
        } else {
          return NextResponse.json({
            error: 'Failed to initialize user preferences',
            details: result.error
          }, { status: 500 });
        }
      }

      case 'reset': {
        if (!userId) {
          return NextResponse.json({ error: 'userId is required for reset action' }, { status: 400 });
        }

        const result = await resetUserPreferences(userId, userRole, resetOptions);
        
        if (result.success) {
          return NextResponse.json({
            success: true,
            message: `Successfully reset preferences for user ${userId}`,
            reset: result.reset
          });
        } else {
          return NextResponse.json({
            error: 'Failed to reset user preferences',
            details: result.error
          }, { status: 500 });
        }
      }

      case 'bulk-initialize': {
        if (!users || !Array.isArray(users)) {
          return NextResponse.json({ 
            error: 'users array is required for bulk-initialize action' 
          }, { status: 400 });
        }

        // Validate users array structure
        for (const user of users) {
          if (!user.userId || !['admin', 'user'].includes(user.role)) {
            return NextResponse.json({ 
              error: 'Each user must have userId and role (admin or user)' 
            }, { status: 400 });
          }
        }

        const result = await bulkInitializeUsers(users);
        
        return NextResponse.json({
          success: true,
          message: `Bulk initialization complete`,
          results: {
            totalUsers: users.length,
            successful: result.success,
            failed: result.failed,
            errors: result.errors
          }
        });
      }

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Supported actions: initialize, reset, bulk-initialize' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in user defaults API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/admin/user-defaults
 * Update default preference templates (for future users)
 */
export async function PUT(_request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // This could be used to update the default preference templates
    // For now, we'll return a message indicating this feature could be implemented
    return NextResponse.json({
      message: 'Default preference template updates would be implemented here',
      note: 'Currently, defaults are defined in code. Consider implementing dynamic template management.'
    });

  } catch (error) {
    console.error('Error updating default templates:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 