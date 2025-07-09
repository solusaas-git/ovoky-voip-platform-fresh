import mongoose, { Document, Model, Schema } from 'mongoose';

// Scheduler Settings interface
export interface ISchedulerSettings {
  enabled: boolean;
  checkInterval: number; // in minutes
  timezone: string;
  lastCheck?: Date;
  nextCheck?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Scheduler Settings document interface
export interface ISchedulerSettingsDocument extends ISchedulerSettings, Document {
  id: string;
}

// Scheduler Settings model interface
export interface ISchedulerSettingsModel extends Model<ISchedulerSettingsDocument> {}

// Export the main interface for use in other files
export type SchedulerSettings = ISchedulerSettings;

// Scheduler Settings schema
const schedulerSettingsSchema = new Schema<ISchedulerSettingsDocument, ISchedulerSettingsModel>(
  {
    enabled: {
      type: Boolean,
      required: true,
      default: true,
    },
    checkInterval: {
      type: Number,
      required: true,
      default: 360, // 6 hours in minutes
      min: [30, 'Check interval cannot be less than 30 minutes'],
      max: [10080, 'Check interval cannot exceed 7 days (10080 minutes)'],
    },
    timezone: {
      type: String,
      required: true,
      default: 'Europe/London',
    },
    lastCheck: {
      type: Date,
    },
    nextCheck: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'scheduler_settings',
  }
);

// Add indexes for better query performance
schedulerSettingsSchema.index({ enabled: 1 });

// Create and export the SchedulerSettings model
const SchedulerSettingsModel = (mongoose.models.SchedulerSettings as ISchedulerSettingsModel) || 
  mongoose.model<ISchedulerSettingsDocument, ISchedulerSettingsModel>('SchedulerSettings', schedulerSettingsSchema);

export default SchedulerSettingsModel; 