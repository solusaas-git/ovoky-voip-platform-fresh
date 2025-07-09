import { connectToDatabase } from '@/lib/db';
import { NotificationService } from '@/services/NotificationService';
import { cronScheduleService } from '@/lib/services/cronScheduleService';
import { smsQueueService } from '@/lib/services/SmsQueueService';

// Internal scheduler is disabled in favor of Vercel Cron Jobs
// import { SchedulerService } from '@/services/SchedulerService';

let isInitialized = false;

/**
 * Initialize application services
 * This should be called once when the application starts
 */
export async function initializeApp(): Promise<void> {
  if (isInitialized) {
    console.log('⚠️ App already initialized, skipping...');
    return;
  }

  try {
    console.log('🚀 Initializing application...');

    // Connect to database
    await connectToDatabase();
    console.log('✅ Database connected');

    // Initialize notification service
    const notificationService = NotificationService.getInstance();
    console.log('✅ Notification service initialized');

    // Initialize SMS Queue Service
    try {
      await smsQueueService.initialize();
      console.log('✅ SMS Queue Service initialized');
    } catch (error) {
      console.error('❌ Error initializing SMS Queue Service:', error);
      // Don't fail startup for this
    }

    // Initialize default cron schedules
    try {
      await cronScheduleService.initializeDefaultSchedules('system@initialization');
      console.log('✅ Default cron schedules initialized');
    } catch (error) {
      console.error('❌ Error initializing cron schedules:', error);
      // Don't fail startup for this
    }

    // Internal scheduler is disabled in favor of Vercel Cron Jobs
    // const schedulerService = SchedulerService.getInstance();
    // await schedulerService.start();
    // console.log('✅ Scheduler service started');

    isInitialized = true;
    console.log('🎉 Application initialization completed successfully');

  } catch (error) {
    console.error('❌ Application initialization failed:', error);
    // Don't throw to prevent app crash during startup
    // throw error;
  }
}

/**
 * Get initialization status
 */
export function isAppInitialized(): boolean {
  return isInitialized;
} 