import { connectToDatabase } from '@/lib/db';
import CronJobExecutionModel, { ICronJobExecution } from '@/models/CronJobExecution';

export interface CronJobResult {
  status: 'success' | 'failed' | 'skipped';
  processed?: number;
  failed?: number;
  errorDetails?: any[];
  notes?: string;
}

export interface CronJobExecutionSummary {
  jobName: string;
  lastExecution?: Date;
  lastStatus?: 'success' | 'failed' | 'skipped';
  lastDuration?: number;
  totalExecutions: number;
  successRate: number; // percentage
  lastProcessed?: number;
  lastFailed?: number;
}

export class CronExecutionService {
  private static instance: CronExecutionService;

  public static getInstance(): CronExecutionService {
    if (!CronExecutionService.instance) {
      CronExecutionService.instance = new CronExecutionService();
    }
    return CronExecutionService.instance;
  }

  /**
   * Record a cron job execution
   */
  async recordExecution(
    jobName: string,
    jobPath: string,
    result: CronJobResult,
    duration: number,
    triggeredBy: 'vercel_cron' | 'manual' | 'system' = 'vercel_cron'
  ): Promise<void> {
    try {
      await connectToDatabase();

      const execution = new CronJobExecutionModel({
        jobName,
        jobPath,
        executedAt: new Date(),
        status: result.status,
        duration,
        processed: result.processed || 0,
        failed: result.failed || 0,
        errorDetails: result.errorDetails || [],
        triggeredBy,
        notes: result.notes,
      });

      await execution.save();
      
      console.log(`📊 Recorded execution for ${jobName}: ${result.status} (${duration}ms)`);
    } catch (error) {
      console.error(`❌ Error recording execution for ${jobName}:`, error);
      // Don't throw error to avoid breaking the cron job
    }
  }

  /**
   * Get execution summary for all cron jobs
   */
  async getExecutionSummaries(): Promise<CronJobExecutionSummary[]> {
    try {
      await connectToDatabase();

      // Get all unique job names
      const jobNames = await CronJobExecutionModel.distinct('jobName');
      
      const summaries: CronJobExecutionSummary[] = [];

      for (const jobName of jobNames) {
        // Get last execution
        const lastExecution = await CronJobExecutionModel
          .findOne({ jobName })
          .sort({ executedAt: -1 })
          .lean();

        // Get execution statistics for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const stats = await CronJobExecutionModel.aggregate([
          {
            $match: {
              jobName,
              executedAt: { $gte: thirtyDaysAgo }
            }
          },
          {
            $group: {
              _id: null,
              totalExecutions: { $sum: 1 },
              successfulExecutions: {
                $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
              }
            }
          }
        ]);

        const totalExecutions = stats[0]?.totalExecutions || 0;
        const successfulExecutions = stats[0]?.successfulExecutions || 0;
        const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

        summaries.push({
          jobName,
          lastExecution: lastExecution?.executedAt,
          lastStatus: lastExecution?.status,
          lastDuration: lastExecution?.duration,
          totalExecutions,
          successRate,
          lastProcessed: lastExecution?.processed,
          lastFailed: lastExecution?.failed,
        });
      }

      return summaries;
    } catch (error) {
      console.error('❌ Error getting execution summaries:', error);
      return [];
    }
  }

  /**
   * Get execution history for a specific job
   */
  async getJobExecutionHistory(
    jobName: string,
    limit: number = 50
  ): Promise<ICronJobExecution[]> {
    try {
      await connectToDatabase();

      const executions = await CronJobExecutionModel
        .find({ jobName })
        .sort({ executedAt: -1 })
        .limit(limit)
        .lean();

      return executions;
    } catch (error) {
      console.error(`❌ Error getting execution history for ${jobName}:`, error);
      return [];
    }
  }

  /**
   * Clean up old execution records (keep last 100 per job)
   */
  async cleanupOldExecutions(): Promise<void> {
    try {
      await connectToDatabase();

      const jobNames = await CronJobExecutionModel.distinct('jobName');
      
      for (const jobName of jobNames) {
        // Get the 100th most recent execution for this job
        const executions = await CronJobExecutionModel
          .find({ jobName })
          .sort({ executedAt: -1 })
          .skip(100)
          .limit(1)
          .lean();

        if (executions.length > 0) {
          const cutoffDate = executions[0].executedAt;
          
          // Delete all executions older than the cutoff
          const deleteResult = await CronJobExecutionModel.deleteMany({
            jobName,
            executedAt: { $lt: cutoffDate }
          });

          if (deleteResult.deletedCount > 0) {
            console.log(`🧹 Cleaned up ${deleteResult.deletedCount} old executions for ${jobName}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error cleaning up old executions:', error);
    }
  }

  /**
   * Get recent failures across all jobs
   */
  async getRecentFailures(hours: number = 24): Promise<ICronJobExecution[]> {
    try {
      await connectToDatabase();

      const since = new Date();
      since.setHours(since.getHours() - hours);

      const failures = await CronJobExecutionModel
        .find({
          status: 'failed',
          executedAt: { $gte: since }
        })
        .sort({ executedAt: -1 })
        .limit(20)
        .lean();

      return failures;
    } catch (error) {
      console.error('❌ Error getting recent failures:', error);
      return [];
    }
  }
}

export const cronExecutionService = CronExecutionService.getInstance(); 