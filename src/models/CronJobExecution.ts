import mongoose, { Document, Model, Schema } from 'mongoose';

// Cron Job Execution interface
export interface ICronJobExecution {
  jobName: string;
  jobPath: string;
  executedAt: Date;
  status: 'success' | 'failed' | 'skipped';
  duration?: number; // in milliseconds
  processed?: number; // number of records processed
  failed?: number; // number of failed operations
  errorDetails?: any[]; // array of error details
  triggeredBy: 'vercel_cron' | 'manual' | 'system';
  notes?: string;
}

// Cron Job Execution document interface
export interface ICronJobExecutionDocument extends ICronJobExecution, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Cron Job Execution model interface
export interface ICronJobExecutionModel extends Model<ICronJobExecutionDocument> {}

// Cron Job Execution schema
const cronJobExecutionSchema = new Schema<ICronJobExecutionDocument, ICronJobExecutionModel>(
  {
    jobName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    jobPath: {
      type: String,
      required: true,
      trim: true,
    },
    executedAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['success', 'failed', 'skipped'],
      index: true,
    },
    duration: {
      type: Number,
      min: 0,
    },
    processed: {
      type: Number,
      min: 0,
      default: 0,
    },
    failed: {
      type: Number,
      min: 0,
      default: 0,
    },
    errorDetails: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    triggeredBy: {
      type: String,
      required: true,
      enum: ['vercel_cron', 'manual', 'system'],
      default: 'vercel_cron',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'cron_job_executions',
  }
);

// Add compound indexes for better query performance
cronJobExecutionSchema.index({ jobName: 1, executedAt: -1 });
cronJobExecutionSchema.index({ status: 1, executedAt: -1 });
cronJobExecutionSchema.index({ triggeredBy: 1, executedAt: -1 });

// Create and export the CronJobExecution model
const CronJobExecutionModel = (mongoose.models.CronJobExecution as ICronJobExecutionModel) ||
  mongoose.model<ICronJobExecutionDocument, ICronJobExecutionModel>('CronJobExecution', cronJobExecutionSchema);

export default CronJobExecutionModel; 