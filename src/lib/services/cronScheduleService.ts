import { connectToDatabase } from '@/lib/db';
import CronJobScheduleModel, { ICronJobSchedule } from '@/models/CronJobSchedule';
import fs from 'fs/promises';
import path from 'path';

export interface CronJobTemplate {
  name: string;
  path: string;
  defaultSchedule: string;
  description: string;
  icon: string;
  canTriggerManually: boolean;
  triggerAction?: string;
}

export interface VercelCronConfig {
  crons: Array<{
    path: string;
    schedule: string;
  }>;
}

export class CronScheduleService {
  private static instance: CronScheduleService;

  // Default cron job templates
  private static readonly DEFAULT_JOBS: CronJobTemplate[] = [
    {
      name: 'Balance Checks',
      path: '/api/cron/process-balance-checks',
      defaultSchedule: '0 */6 * * *',
      description: 'Check user balances and send low balance notifications',
      icon: 'dollar-sign',
      canTriggerManually: true,
      triggerAction: 'trigger_check'
    },
    {
      name: 'KPI Alerts',
      path: '/api/cron/process-kpi-alerts',
      defaultSchedule: '0 6 * * *',
      description: 'Check KPI thresholds and send alerts',
      icon: 'alert-circle',
      canTriggerManually: true,
      triggerAction: 'trigger_kpi_check'
    },
    {
      name: 'Customer Notifications',
      path: '/api/cron/process-customer-notifications',
      defaultSchedule: '*/5 * * * *',
      description: 'Execute scheduled customer notifications',
      icon: 'mail',
      canTriggerManually: true,
      triggerAction: 'trigger_notifications'
    },
    {
      name: 'Scheduled Billing',
      path: '/api/cron/process-scheduled-billing',
      defaultSchedule: '0 2 * * *',
      description: 'Process pending billing records',
      icon: 'clock',
      canTriggerManually: true,
      triggerAction: 'trigger_billing'
    },
    {
      name: 'Backorder Approvals',
      path: '/api/cron/process-backorder-approvals',
      defaultSchedule: '0 1 * * *',
      description: 'Process approved backorder payments',
      icon: 'check-circle',
      canTriggerManually: true,
      triggerAction: 'trigger_backorders'
    },
    {
      name: 'Cleanup Tasks',
      path: '/api/cron/cleanup-expired-sessions',
      defaultSchedule: '0 3 * * *',
      description: 'Cleanup expired sessions and maintenance',
      icon: 'trash-2',
      canTriggerManually: true,
      triggerAction: 'trigger_cleanup'
    }
  ];

  public static getInstance(): CronScheduleService {
    if (!CronScheduleService.instance) {
      CronScheduleService.instance = new CronScheduleService();
    }
    return CronScheduleService.instance;
  }

  /**
   * Initialize default cron job schedules if they don't exist
   */
  async initializeDefaultSchedules(adminEmail: string): Promise<void> {
    try {
      await connectToDatabase();

      for (const job of CronScheduleService.DEFAULT_JOBS) {
        const existingJob = await CronJobScheduleModel.findOne({ jobName: job.name });
        
        if (!existingJob) {
          await CronJobScheduleModel.create({
            jobName: job.name,
            jobPath: job.path,
            schedule: job.defaultSchedule,
            description: job.description,
            enabled: true,
            isCustom: false,
            icon: job.icon,
            canTriggerManually: job.canTriggerManually,
            triggerAction: job.triggerAction,
            createdBy: adminEmail,
            lastModified: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('❌ Error initializing default schedules:', error);
      throw error;
    }
  }

  /**
   * Refresh all existing schedules with updated default values (including manual trigger support)
   */
  async refreshAllSchedules(adminEmail: string): Promise<void> {
    try {
      await connectToDatabase();

      for (const job of CronScheduleService.DEFAULT_JOBS) {
        const existingJob = await CronJobScheduleModel.findOne({ jobName: job.name });
        
        if (existingJob) {
          // Update existing job with new default values while preserving custom settings
          await CronJobScheduleModel.findOneAndUpdate(
            { jobName: job.name },
            {
              $set: {
                canTriggerManually: job.canTriggerManually,
                triggerAction: job.triggerAction,
                icon: job.icon,
                lastModified: new Date(),
                // Only update these if they're not custom
                ...((!existingJob.isCustom) && {
                  schedule: job.defaultSchedule,
                  description: job.description,
                }),
              }
            },
            { new: true }
          );
        } else {
          // Create new job if it doesn't exist
          await CronJobScheduleModel.create({
            jobName: job.name,
            jobPath: job.path,
            schedule: job.defaultSchedule,
            description: job.description,
            enabled: true,
            isCustom: false,
            icon: job.icon,
            canTriggerManually: job.canTriggerManually,
            triggerAction: job.triggerAction,
            createdBy: adminEmail,
            lastModified: new Date(),
          });
        }
      }

      // Regenerate vercel.json with updated schedules
      await this.generateVercelConfig();
    } catch (error) {
      console.error('❌ Error refreshing schedules:', error);
      throw error;
    }
  }

  /**
   * Get all cron job schedules
   */
  async getAllSchedules(): Promise<ICronJobSchedule[]> {
    try {
      await connectToDatabase();
      return await CronJobScheduleModel.find().sort({ jobName: 1 }).lean();
    } catch (error) {
      console.error('❌ Error getting schedules:', error);
      return [];
    }
  }

  /**
   * Update a cron job schedule
   */
  async updateSchedule(
    jobName: string,
    updates: Partial<ICronJobSchedule>,
    adminEmail: string
  ): Promise<ICronJobSchedule | null> {
    try {
      await connectToDatabase();

      const updatedSchedule = await CronJobScheduleModel.findOneAndUpdate(
        { jobName },
        {
          ...updates,
          lastModified: new Date(),
          createdBy: adminEmail, // Track who made the change
          isCustom: true, // Mark as custom when modified
        },
        { new: true, lean: true }
      );

      if (updatedSchedule) {
        // Regenerate vercel.json with new schedules
        await this.generateVercelConfig();
      }

      return updatedSchedule;
    } catch (error) {
      console.error(`❌ Error updating schedule for ${jobName}:`, error);
      throw error;
    }
  }

  /**
   * Reset a cron job to default schedule
   */
  async resetToDefault(jobName: string, adminEmail: string): Promise<ICronJobSchedule | null> {
    try {
      const defaultJob = CronScheduleService.DEFAULT_JOBS.find(job => job.name === jobName);
      if (!defaultJob) {
        throw new Error(`Default job not found for ${jobName}`);
      }

      return await this.updateSchedule(
        jobName,
        {
          schedule: defaultJob.defaultSchedule,
          description: defaultJob.description,
          enabled: true,
          isCustom: false,
        },
        adminEmail
      );
    } catch (error) {
      console.error(`❌ Error resetting ${jobName} to default:`, error);
      throw error;
    }
  }

  /**
   * Generate vercel.json configuration based on current schedules
   */
  async generateVercelConfig(): Promise<void> {
    try {
      const schedules = await this.getAllSchedules();
      const enabledSchedules = schedules.filter(schedule => schedule.enabled);

      const vercelConfig: VercelCronConfig = {
        crons: enabledSchedules.map(schedule => ({
          path: schedule.jobPath,
          schedule: schedule.schedule,
        }))
      };

      // Read existing vercel.json to preserve other configurations
      const vercelPath = path.join(process.cwd(), 'vercel.json');
      let existingConfig: any = {};

      try {
        const existingContent = await fs.readFile(vercelPath, 'utf-8');
        existingConfig = JSON.parse(existingContent);
      } catch (error) {
        // vercel.json doesn't exist, will create new one
      }

      // Merge configurations
      const newConfig = {
        ...existingConfig,
        crons: vercelConfig.crons,
      };

      // Write updated vercel.json
      await fs.writeFile(vercelPath, JSON.stringify(newConfig, null, 2));
    } catch (error) {
      console.error('❌ Error generating Vercel config:', error);
      throw error;
    }
  }

  /**
   * Validate cron expression
   */
  validateCronExpression(expression: string): { valid: boolean; error?: string } {
    // Fixed regex pattern with proper escaping for */number patterns
    const cronRegex = /^(\*|[0-9,\-*/]+) (\*|[0-9,\-*/]+) (\*|[0-9,\-*/]+) (\*|[0-9,\-*/]+) (\*|[0-9,\-*/]+)$/;
    
    if (!cronRegex.test(expression)) {
      return { valid: false, error: 'Invalid cron expression format. Must be 5 space-separated fields.' };
    }

    // Additional validation for specific fields
    const fields = expression.split(' ');
    
    // Minute (0-59)
    if (!this.validateCronField(fields[0], 0, 59)) {
      return { valid: false, error: 'Invalid minute field (0-59)' };
    }
    
    // Hour (0-23)
    if (!this.validateCronField(fields[1], 0, 23)) {
      return { valid: false, error: 'Invalid hour field (0-23)' };
    }
    
    // Day of month (1-31)
    if (!this.validateCronField(fields[2], 1, 31)) {
      return { valid: false, error: 'Invalid day of month field (1-31)' };
    }
    
    // Month (1-12)
    if (!this.validateCronField(fields[3], 1, 12)) {
      return { valid: false, error: 'Invalid month field (1-12)' };
    }
    
    // Day of week (0-7, where 0 and 7 are Sunday)
    if (!this.validateCronField(fields[4], 0, 7)) {
      return { valid: false, error: 'Invalid day of week field (0-7)' };
    }

    return { valid: true };
  }

  /**
   * Validate individual cron field
   */
  private validateCronField(field: string, min: number, max: number): boolean {
    if (field === '*') return true;
    
    // Handle step values (*/5)
    if (field.includes('/')) {
      const [range, step] = field.split('/');
      if (range === '*') return parseInt(step) > 0;
      
      const stepNum = parseInt(step);
      if (isNaN(stepNum) || stepNum <= 0) return false;
    }
    
    // Handle ranges (1-5)
    if (field.includes('-')) {
      const [start, end] = field.split('-').map(Number);
      return start >= min && end <= max && start <= end;
    }
    
    // Handle lists (1,3,5)
    if (field.includes(',')) {
      const values = field.split(',').map(Number);
      return values.every(val => val >= min && val <= max);
    }
    
    // Handle single values
    const num = parseInt(field);
    return !isNaN(num) && num >= min && num <= max;
  }

  /**
   * Convert cron expression to human-readable description
   */
  describeCronExpression(expression: string): string {
    const commonExpressions: { [key: string]: string } = {
      '*/5 * * * *': 'Every 5 minutes',
      '0 * * * *': 'Every hour',
      '0 */2 * * *': 'Every 2 hours',
      '0 */6 * * *': 'Every 6 hours',
      '0 */12 * * *': 'Every 12 hours',
      '0 0 * * *': 'Daily at midnight',
      '0 1 * * *': 'Daily at 1:00 AM',
      '0 2 * * *': 'Daily at 2:00 AM',
      '0 3 * * *': 'Daily at 3:00 AM',
      '0 6 * * *': 'Daily at 6:00 AM',
      '0 12 * * *': 'Daily at noon',
      '0 0 * * 1': 'Weekly on Monday at midnight',
      '0 0 1 * *': 'Monthly on the 1st at midnight',
    };

    return commonExpressions[expression] || `Custom schedule: ${expression}`;
  }
}

export const cronScheduleService = CronScheduleService.getInstance(); 