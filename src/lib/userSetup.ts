import { connectToDatabase } from '@/lib/db';
import DashboardPreferencesModel from '@/models/DashboardPreferences';
import { NotificationPreferencesModel } from '@/models/InternalNotification';
import { createDefaultDashboardPreferences } from '@/lib/defaultDashboardPreferences';
import { createDefaultPreferences } from '@/types/notifications';

// Interfaces for type safety
interface DashboardPreferences {
  userId: string;
  widgets: unknown[];
  layout: unknown;
  theme?: string;
  [key: string]: unknown;
}

interface NotificationPreferences {
  userId: string;
  enableSounds: boolean;
  enablePushNotifications: boolean;
  typePreferences: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Initialize default preferences for a new user
 * This should be called during user registration/signup
 */
export async function initializeUserDefaults(
  userId: string, 
  userRole: 'admin' | 'user' = 'user'
): Promise<{
  dashboardPreferences: DashboardPreferences | null;
  notificationPreferences: NotificationPreferences | null;
  success: boolean;
  error?: string;
}> {
  try {
    await connectToDatabase();

    // Initialize default dashboard preferences
    const defaultDashboardPrefs = createDefaultDashboardPreferences(userId, userRole);
    
    const dashboardPreferences = await DashboardPreferencesModel.findOneAndUpdate(
      { userId },
      { $setOnInsert: defaultDashboardPrefs },
      { 
        new: true, 
        upsert: true 
      }
    );

    // Initialize default notification preferences
    const defaultNotificationPrefs = createDefaultPreferences(userId);
    
    const notificationPreferences = await NotificationPreferencesModel.findOneAndUpdate(
      { userId },
      { $setOnInsert: defaultNotificationPrefs },
      { 
        new: true, 
        upsert: true 
      }
    );

    console.log(`✅ Initialized default preferences for user ${userId} (role: ${userRole})`);

    return {
      dashboardPreferences: dashboardPreferences as unknown as DashboardPreferences,
      notificationPreferences: notificationPreferences as unknown as NotificationPreferences,
      success: true
    };

  } catch (error) {
    console.error('❌ Error initializing user defaults:', error);
    return {
      dashboardPreferences: null,
      notificationPreferences: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Reset user preferences to defaults
 * Useful for troubleshooting or when a user requests a reset
 */
export async function resetUserPreferences(
  userId: string,
  userRole: 'admin' | 'user' = 'user',
  options: {
    resetDashboard?: boolean;
    resetNotifications?: boolean;
  } = { resetDashboard: true, resetNotifications: true }
): Promise<{
  success: boolean;
  error?: string;
  reset: string[];
}> {
  try {
    await connectToDatabase();
    const reset: string[] = [];

    if (options.resetDashboard) {
      const defaultDashboardPrefs = createDefaultDashboardPreferences(userId, userRole);
      
      await DashboardPreferencesModel.findOneAndUpdate(
        { userId },
        defaultDashboardPrefs,
        { upsert: true }
      );
      
      reset.push('dashboard');
    }

    if (options.resetNotifications) {
      const defaultNotificationPrefs = createDefaultPreferences(userId);
      
      await NotificationPreferencesModel.findOneAndUpdate(
        { userId },
        defaultNotificationPrefs,
        { upsert: true }
      );
      
      reset.push('notifications');
    }

    console.log(`✅ Reset preferences for user ${userId}: ${reset.join(', ')}`);

    return {
      success: true,
      reset
    };

  } catch (error) {
    console.error('❌ Error resetting user preferences:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      reset: []
    };
  }
}

/**
 * Check if user has default preferences set up
 * Useful for determining if initialization is needed
 */
export async function checkUserPreferences(userId: string): Promise<{
  hasDashboardPreferences: boolean;
  hasNotificationPreferences: boolean;
  needsInitialization: boolean;
}> {
  try {
    await connectToDatabase();

    const [dashboardPrefs, notificationPrefs] = await Promise.all([
      DashboardPreferencesModel.findOne({ userId }),
      NotificationPreferencesModel.findOne({ userId })
    ]);

    const hasDashboardPreferences = !!dashboardPrefs;
    const hasNotificationPreferences = !!notificationPrefs;
    const needsInitialization = !hasDashboardPreferences || !hasNotificationPreferences;

    return {
      hasDashboardPreferences,
      hasNotificationPreferences,
      needsInitialization
    };

  } catch (error) {
    console.error('Error checking user preferences:', error);
    return {
      hasDashboardPreferences: false,
      hasNotificationPreferences: false,
      needsInitialization: true
    };
  }
}

/**
 * Bulk initialize preferences for multiple users
 * Useful for migrating existing users or batch operations
 */
export async function bulkInitializeUsers(
  users: Array<{ userId: string; role: 'admin' | 'user' }>
): Promise<{
  success: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ userId: string; error: string }>
  };

  for (const user of users) {
    try {
      const result = await initializeUserDefaults(user.userId, user.role);
      
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push({
          userId: user.userId,
          error: result.error || 'Unknown error'
        });
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        userId: user.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  console.log(`Bulk initialization complete: ${results.success} success, ${results.failed} failed`);
  return results;
} 