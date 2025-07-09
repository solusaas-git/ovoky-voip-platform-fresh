import * as cron from 'node-cron';
import { NotificationService } from './NotificationService';
import CustomerNotificationService from './CustomerNotificationService';
import { connectToDatabase } from '@/lib/db';
import SchedulerSettingsModel, { SchedulerSettings } from '@/models/SchedulerSettings';
import { kpiAlertService } from '@/lib/services/kpiAlertService';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClient } from '@/lib/sippyClient';
import UserModel from '@/models/User';

// Interface for CDR data
interface CdrRecord {
  cost: string | number;
  duration: string | number;
  result: string | number;
  currency?: string;
  [key: string]: unknown;
}

export class SchedulerService {
  private static instance: SchedulerService;
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private isRunning = false;
  private currentSettings: SchedulerSettings | null = null;

  private constructor() {}

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  /**
   * Get scheduler settings from database
   */
  private async getSchedulerSettings(): Promise<SchedulerSettings> {
    try {
      await connectToDatabase();
      
      let settings = await SchedulerSettingsModel.findOne();
      
      if (!settings) {
        // Create default settings if none exist
        settings = new SchedulerSettingsModel({
          enabled: true,
          checkInterval: 360, // 6 hours in minutes
          timezone: 'Europe/London',
        });
        await settings.save();
      }
      
      this.currentSettings = settings;
      return settings;
    } catch (error) {
      console.error('Error fetching scheduler settings:', error);
      // Return fallback settings
      return {
        enabled: true,
        checkInterval: 360,
        timezone: 'Europe/London',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  }

  /**
   * Convert minutes to cron expression
   */
  private minutesToCron(minutes: number): string {
    if (minutes < 60) {
      // Less than an hour: every X minutes
      return `*/${minutes} * * * *`;
    } else if (minutes % 60 === 0) {
      // Exact hours: 0 */X * * *
      const hours = minutes / 60;
      return `0 */${hours} * * *`;
    } else {
      // Mixed: convert to minutes
      return `*/${minutes} * * * *`;
    }
  }

  /**
   * Initialize and start all scheduled tasks
   */
  public async initialize(): Promise<void> {
    if (this.isRunning) {
      console.log('Scheduler is already running');
      return;
    }

    console.log('🕐 Initializing Scheduler Service...');
    
    try {
      // Get settings from database
      const settings = await this.getSchedulerSettings();
      
      if (!settings.enabled) {
        console.log('⏸️  Scheduler is disabled in settings');
        return;
      }

      // Start balance check cron job
      await this.startBalanceCheckTask();
      
      // Start KPI alert check cron job
      await this.startKpiAlertTask();
      
      // Start customer notification execution task
      await this.startCustomerNotificationTask();
      
      this.isRunning = true;
      console.log('✅ Scheduler Service initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Scheduler Service:', error);
    }
  }

  /**
   * Start the balance check task using database settings
   */
  private async startBalanceCheckTask(): Promise<void> {
    const settings = await this.getSchedulerSettings();
    
    if (!settings.enabled) {
      console.log('Balance check task disabled in settings');
      return;
    }

    // Convert minutes to cron expression
    const cronSchedule = this.minutesToCron(settings.checkInterval);
    
    console.log(`⏰ Setting up balance check task:`);
    console.log(`   Interval: ${settings.checkInterval} minutes`);
    console.log(`   Cron: ${cronSchedule}`);
    console.log(`   Timezone: ${settings.timezone}`);
    console.log(`   Translation: ${this.describeCronSchedule(cronSchedule)}`);

    const task = cron.schedule(cronSchedule, async () => {
      console.log('\n🔍 [CRON] Starting automatic balance check...');
      const startTime = new Date();
      
      try {
        // Update last check time in database
        await this.updateLastCheckTime();
        
        const notificationService = NotificationService.getInstance();
        await notificationService.checkAndNotifyLowBalances();
        
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        console.log(`✅ [CRON] Balance check completed in ${duration}ms`);
        
      } catch (error) {
        console.error('❌ [CRON] Error during balance check:', error);
      }
    }, {
      timezone: settings.timezone
    });

    this.tasks.set('balance-check', task);
    
    console.log(`✅ Balance check task scheduled and started`);
  }

  /**
   * Start the KPI alert check task
   */
  private async startKpiAlertTask(): Promise<void> {
    const settings = await this.getSchedulerSettings();
    
    if (!settings.enabled) {
      console.log('KPI alert task disabled in settings');
      return;
    }

    // KPI alerts run daily at 6:00 AM during low activity hours
    const cronSchedule = '0 6 * * *';
    
    console.log(`⏰ Setting up KPI alert check task:`);
    console.log(`   Schedule: Daily at 6:00 AM`);
    console.log(`   Cron: ${cronSchedule}`);
    console.log(`   Timezone: ${settings.timezone}`);

    const task = cron.schedule(cronSchedule, async () => {
      console.log('\n📊 [CRON] Starting automatic KPI alert check...');
      const startTime = new Date();
      
      try {
        await this.performKpiAlertCheck();
        
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        console.log(`✅ [CRON] KPI alert check completed in ${duration}ms`);
        
      } catch (error) {
        console.error('❌ [CRON] Error during KPI alert check:', error);
      }
    }, {
      timezone: settings.timezone
    });

    this.tasks.set('kpi-alerts', task);
    
    console.log(`✅ KPI alert task scheduled and started`);
  }

  /**
   * Update last check time in database
   */
  private async updateLastCheckTime(): Promise<void> {
    try {
      console.log('📝 Connecting to database to update last check time...');
      await connectToDatabase();
      
      const now = new Date();
      const nextCheckTime = new Date(now.getTime() + (this.currentSettings?.checkInterval || 360) * 60 * 1000);
      
      console.log(`📝 Updating lastCheck to: ${now.toISOString()}`);
      console.log(`📝 Updating nextCheck to: ${nextCheckTime.toISOString()}`);
      
      const result = await SchedulerSettingsModel.findOneAndUpdate(
        {},
        { 
          lastCheck: now,
          nextCheck: nextCheckTime,
          updatedAt: now
        },
        { 
          new: true,
          upsert: true // Create if doesn't exist
        }
      );
      
      if (result) {
        console.log('✅ Successfully updated scheduler timestamps in database');
        console.log(`   Last Check: ${result.lastCheck}`);
        console.log(`   Next Check: ${result.nextCheck}`);
      } else {
        console.warn('⚠️ No result returned from database update');
      }
    } catch (error) {
      console.error('❌ Error updating last check time in database:', error);
      throw error;
    }
  }

  /**
   * Update scheduler from database settings
   */
  public async updateFromDatabaseSettings(): Promise<void> {
    console.log('🔄 Updating scheduler from database settings...');
    
    try {
      // Stop current tasks
      this.stopAll();
      
      // Restart with new settings
      await this.initialize();
      
      console.log('✅ Scheduler updated from database settings');
    } catch (error) {
      console.error('❌ Error updating scheduler from database:', error);
      throw error;
    }
  }

  /**
   * Stop all scheduled tasks
   */
  public stopAll(): void {
    console.log('⏹️  Stopping all scheduled tasks...');
    
    this.tasks.forEach((task, name) => {
      task.stop();
      console.log(`   Stopped task: ${name}`);
    });
    
    this.tasks.clear();
    this.isRunning = false;
    console.log('✅ All scheduled tasks stopped');
  }

  /**
   * Stop a specific task
   */
  public stopTask(taskName: string): boolean {
    const task = this.tasks.get(taskName);
    if (task) {
      task.stop();
      this.tasks.delete(taskName);
      console.log(`⏹️  Stopped task: ${taskName}`);
      return true;
    }
    return false;
  }

  /**
   * Get status of all tasks with database settings
   */
  public async getStatus(): Promise<{ taskName: string; isRunning: boolean; schedule?: string; settings?: SchedulerSettings }[]> {
    const status: { taskName: string; isRunning: boolean; schedule?: string; settings?: SchedulerSettings }[] = [];
    
    try {
      const settings = await this.getSchedulerSettings();
      
      this.tasks.forEach((task, name) => {
        let schedule: string | undefined;
        
        if (name === 'balance-check') {
          schedule = this.minutesToCron(settings.checkInterval);
        } else if (name === 'kpi-alerts') {
          schedule = '0 6 * * *'; // Daily at 6:00 AM
        }
        
        status.push({
          taskName: name,
          isRunning: this.isRunning,
          schedule,
          settings: ['balance-check', 'kpi-alerts'].includes(name) ? settings : undefined
        });
      });
    } catch (error) {
      console.error('Error getting settings for status:', error);
    }
    
    return status;
  }

  /**
   * Manually trigger the balance check (outside of schedule)
   */
  public async triggerBalanceCheck(): Promise<void> {
    console.log('🔍 [MANUAL] Triggering manual balance check...');
    const startTime = new Date();
    
    try {
      // Update last check time in database first
      console.log('📝 [MANUAL] Updating last check time...');
      await this.updateLastCheckTime();
      console.log('✅ [MANUAL] Last check time updated successfully');
      
      // Perform the actual balance check
      console.log('🔍 [MANUAL] Starting balance notification check...');
      const notificationService = NotificationService.getInstance();
      await notificationService.checkAndNotifyLowBalances();
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      console.log(`✅ [MANUAL] Manual balance check completed successfully in ${duration}ms`);
    } catch (error) {
      console.error('❌ [MANUAL] Error during manual balance check:', error);
      
      // Still try to update the last check time even if the notification check failed
      try {
        await this.updateLastCheckTime();
        console.log('✅ [MANUAL] Last check time updated despite notification error');
      } catch (updateError) {
        console.error('❌ [MANUAL] Failed to update last check time:', updateError);
      }
      
      throw error;
    }
  }

  /**
   * Update the balance check schedule (legacy method for backward compatibility)
   */
  public async updateBalanceCheckSchedule(newCronSchedule: string): Promise<void> {
    console.log(`🔄 Legacy method called with cron: ${newCronSchedule}`);
    console.log('Please use the database settings interface instead');
    throw new Error('This method is deprecated. Please use the scheduler settings interface.');
  }

  /**
   * Describe what a cron schedule means in human-readable format
   */
  private describeCronSchedule(cronSchedule: string): string {
    const scheduleMap: { [key: string]: string } = {
      '0 */6 * * *': 'Every 6 hours',
      '0 */4 * * *': 'Every 4 hours', 
      '0 */12 * * *': 'Every 12 hours',
      '0 0 * * *': 'Daily at midnight',
      '0 6 * * *': 'Daily at 6:00 AM',
      '0 0 */2 * *': 'Every 2 days at midnight',
      '0 0 * * 0': 'Weekly on Sunday at midnight',
      '*/30 * * * *': 'Every 30 minutes',
      '0 */1 * * *': 'Every hour',
      '*/60 * * * *': 'Every hour',
      '*/120 * * * *': 'Every 2 hours',
      '*/180 * * * *': 'Every 3 hours',
      '*/240 * * * *': 'Every 4 hours',
      '*/360 * * * *': 'Every 6 hours',
      '*/720 * * * *': 'Every 12 hours',
      '*/1440 * * * *': 'Every 24 hours'
    };

    return scheduleMap[cronSchedule] || `Custom schedule: ${cronSchedule}`;
  }

  /**
   * Check if scheduler is running
   */
  public isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get current settings
   */
  public getCurrentSettings(): SchedulerSettings | null {
    return this.currentSettings;
  }

  /**
   * Perform KPI alert check for all users
   */
  private async performKpiAlertCheck(): Promise<void> {
    try {
      console.log('📊 [KPI] Starting KPI data collection for all users...');
      
      // Get Sippy API credentials
      const credentials = await getSippyApiCredentials();
      if (!credentials) {
        console.error('❌ [KPI] Sippy API credentials not configured');
        return;
      }

      // Get all admin users with Sippy accounts
      await connectToDatabase();
      const adminUsers = await UserModel.find({ 
        role: 'admin', 
        sippyAccountId: { $exists: true, $ne: null } 
      }).lean();

      if (adminUsers.length === 0) {
        console.log('ℹ️ [KPI] No admin users with Sippy accounts found');
        return;
      }

      console.log(`📊 [KPI] Processing ${adminUsers.length} admin users...`);
      
      const sippyClient = new SippyClient(credentials);
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const kpiDataByUser = new Map();

      // Collect KPI data for each user
      for (const user of adminUsers) {
        try {
          console.log(`📊 [KPI] Fetching CDR data for user ${user.name} (${user.email})...`);
          
          let allCdrs: CdrRecord[] = [];
          let offset = 0;
          const limit = 1000;
          let hasMore = true;

          // Fetch all CDRs for today
          while (hasMore) {
            try {
              const response = await sippyClient.getAccountCDRs({
                i_account: user.sippyAccountId,
                start_date: startOfDay.toISOString().split('T')[0],
                end_date: endOfDay.toISOString().split('T')[0],
                limit: limit,
                offset: offset
              });

              if (response && Array.isArray(response) && response.length > 0) {
                allCdrs = allCdrs.concat(response as unknown as CdrRecord[]);
                offset += limit;
                
                if (response.length < limit) {
                  hasMore = false;
                }
              } else {
                hasMore = false;
              }
            } catch (error) {
              console.error(`❌ [KPI] Error fetching CDRs for user ${user.name}:`, error);
              hasMore = false;
            }
          }

          // Calculate KPIs from CDR data
          let totalCost = 0;
          let totalDuration = 0;
          let successfulCalls = 0;
          let failedCalls = 0;
          let currency = 'EUR';

          for (const cdr of allCdrs) {
            const cost = parseFloat(String(cdr.cost)) || 0;
            const duration = parseInt(String(cdr.duration)) || 0;
            const result = parseInt(String(cdr.result));
            
            totalCost += cost;
            totalDuration += duration;
            
            if (result === 0 || result === 200) {
              successfulCalls++;
            } else {
              failedCalls++;
            }
            
            if (cdr.currency) {
              currency = cdr.currency;
            }
          }

          const totalCalls = successfulCalls + failedCalls;
          const asr = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
          const totalMinutes = totalDuration / 60;

          const kpiData = {
            costOfDay: totalCost,
            asr,
            totalMinutes,
            totalCalls,
            successfulCalls,
            failedCalls,
            currency
          };

          console.log(`📊 [KPI] KPI data for ${user.name}:`, {
            costOfDay: kpiData.costOfDay.toFixed(2),
            asr: kpiData.asr.toFixed(1) + '%',
            totalMinutes: kpiData.totalMinutes.toFixed(0),
            totalCalls: kpiData.totalCalls,
            cdrsProcessed: allCdrs.length
          });

          kpiDataByUser.set(user._id.toString(), kpiData);

        } catch (error) {
          console.error(`❌ [KPI] Error processing KPI data for user ${user.name}:`, error);
        }
      }

      // Reset daily alerts at start of day
      kpiAlertService.resetDailyAlerts();

      // Check KPI alerts for all users
      console.log(`📧 [KPI] Checking alerts for ${kpiDataByUser.size} users...`);
      await kpiAlertService.checkAllUsersKpiAlerts(kpiDataByUser);
      
      console.log('✅ [KPI] KPI alert check completed successfully');

    } catch (error) {
      console.error('❌ [KPI] Error in performKpiAlertCheck:', error);
    }
  }

  /**
   * Manually trigger KPI alert check
   */
  public async triggerKpiAlertCheck(): Promise<void> {
    console.log('📊 [MANUAL] Triggering manual KPI alert check...');
    const startTime = new Date();
    
    try {
      await this.performKpiAlertCheck();
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      console.log(`✅ [MANUAL] Manual KPI alert check completed successfully in ${duration}ms`);
    } catch (error) {
      console.error('❌ [MANUAL] Error during manual KPI alert check:', error);
      throw error;
    }
  }

  /**
   * Start customer notification execution task
   */
  private async startCustomerNotificationTask(): Promise<void> {
    const settings = await this.getSchedulerSettings();
    
    if (!settings.enabled) {
      console.log('Customer notification task disabled in settings');
      return;
    }

    // Customer notifications run every 5 minutes to check for due notifications
    const cronSchedule = '*/5 * * * *';
    
    console.log(`⏰ Setting up customer notification execution task:`);
    console.log(`   Schedule: Every 5 minutes`);
    console.log(`   Cron: ${cronSchedule}`);
    console.log(`   Timezone: ${settings.timezone}`);

    const task = cron.schedule(cronSchedule, async () => {
      console.log('\n📧 [CRON] Starting customer notification execution...');
      const startTime = new Date();
      
      try {
        const customerNotificationService = CustomerNotificationService.getInstance();
        await customerNotificationService.executeScheduledNotifications();
        
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        console.log(`✅ [CRON] Customer notification execution completed in ${duration}ms`);
        
      } catch (error) {
        console.error('❌ [CRON] Error during customer notification execution:', error);
      }
    }, {
      timezone: settings.timezone
    });

    this.tasks.set('customer-notifications', task);
    
    console.log(`✅ Customer notification task scheduled and started`);
  }
} 