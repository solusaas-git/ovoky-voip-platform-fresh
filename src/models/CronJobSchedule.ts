import mongoose, { Document, Model, Schema } from 'mongoose';

// Cron Job Schedule interface
export interface ICronJobSchedule {
  jobName: string;
  jobPath: string;
  schedule: string; // Cron expression (e.g., "0 */6 * * *")
  description: string;
  enabled: boolean;
  isCustom: boolean; // true if user-defined, false if default
  icon?: string; // Icon name or emoji
  canTriggerManually: boolean;
  triggerAction?: string; // Action for manual trigger
  createdBy: string; // Admin user who created/modified
  lastModified: Date;
}

// Cron Job Schedule document interface
export interface ICronJobScheduleDocument extends ICronJobSchedule, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Cron Job Schedule model interface
export interface ICronJobScheduleModel extends Model<ICronJobScheduleDocument> {}

// Cron Job Schedule schema
const cronJobScheduleSchema = new Schema<ICronJobScheduleDocument, ICronJobScheduleModel>(
  {
    jobName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    jobPath: {
      type: String,
      required: true,
      trim: true,
    },
    schedule: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function(v: string) {
          // Basic cron expression validation (5 fields)
          const cronRegex = /^(\*|[0-9,\-*/]+) (\*|[0-9,\-*/]+) (\*|[0-9,\-*/]+) (\*|[0-9,\-*/]+) (\*|[0-9,\-*/]+)$/;
          return cronRegex.test(v);
        },
        message: 'Invalid cron expression format'
      }
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    enabled: {
      type: Boolean,
      required: true,
      default: true,
    },
    isCustom: {
      type: Boolean,
      required: true,
      default: false,
    },
    icon: {
      type: String,
      trim: true,
    },
    canTriggerManually: {
      type: Boolean,
      required: true,
      default: false,
    },
    triggerAction: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: String,
      required: true,
      trim: true,
    },
    lastModified: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'cron_job_schedules',
  }
);

// Add indexes for better query performance
cronJobScheduleSchema.index({ enabled: 1 });
cronJobScheduleSchema.index({ isCustom: 1 });
cronJobScheduleSchema.index({ lastModified: -1 });

// Create and export the CronJobSchedule model
const CronJobScheduleModel = (mongoose.models.CronJobSchedule as ICronJobScheduleModel) ||
  mongoose.model<ICronJobScheduleDocument, ICronJobScheduleModel>('CronJobSchedule', cronJobScheduleSchema);

export default CronJobScheduleModel; 