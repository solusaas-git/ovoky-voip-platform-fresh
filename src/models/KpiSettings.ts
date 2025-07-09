import mongoose, { Document, Model, Schema } from 'mongoose';

// Cost of Day thresholds
export interface ICostThresholds {
  low: number;        // Below this = low cost
  medium: number;     // Between low and medium = medium cost
  // Above medium = high cost
}

// ASR (Answer Seizure Ratio) thresholds
export interface IAsrThresholds {
  critical: number;   // Below this = critical
  poor: number;       // Between critical and poor = poor
  fair: number;       // Between poor and fair = fair
  good: number;       // Between fair and good = good
  // Above good = excellent
}

// ACD (Average Call Duration) thresholds in seconds
export interface IAcdThresholds {
  short: number;      // Below this = short/quick calls
  normal: number;     // Between short and normal = normal/optimal
  long: number;       // Between normal and long = long/extended
  // Above long = very long
}

// Total Minutes thresholds in minutes
export interface ITotalMinutesThresholds {
  light: number;      // Below this = light usage
  moderate: number;   // Between light and moderate = moderate usage
  heavy: number;      // Between moderate and heavy = heavy usage
  // Above heavy = very heavy usage
}

// Main KPI Settings interface
export interface IKpiSettings {
  userId: string;
  costThresholds: ICostThresholds;
  asrThresholds: IAsrThresholds;
  acdThresholds: IAcdThresholds;
  totalMinutesThresholds: ITotalMinutesThresholds;
  currency: string;
  timezone: string;
  refreshInterval: number; // Auto-refresh interval in seconds
  enableNotifications: boolean;
  notificationThresholds: {
    highCostAlert: boolean;
    lowAsrAlert: boolean;
    extremeUsageAlert: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Document interface
export interface IKpiSettingsDocument extends IKpiSettings, Document {}

// Model interface
export interface IKpiSettingsModel extends Model<IKpiSettingsDocument> {}

// Cost thresholds schema
const costThresholdsSchema = new Schema<ICostThresholds>({
  low: {
    type: Number,
    required: true,
    min: 0,
    default: 1.0
  },
  medium: {
    type: Number,
    required: true,
    min: 0,
    default: 10.0
  }
}, { _id: false });

// ASR thresholds schema
const asrThresholdsSchema = new Schema<IAsrThresholds>({
  critical: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 50
  },
  poor: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 70
  },
  fair: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 85
  },
  good: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 95
  }
}, { _id: false });

// ACD thresholds schema (in seconds)
const acdThresholdsSchema = new Schema<IAcdThresholds>({
  short: {
    type: Number,
    required: true,
    min: 0,
    default: 30
  },
  normal: {
    type: Number,
    required: true,
    min: 0,
    default: 120
  },
  long: {
    type: Number,
    required: true,
    min: 0,
    default: 300
  }
}, { _id: false });

// Total minutes thresholds schema (in minutes)
const totalMinutesThresholdsSchema = new Schema<ITotalMinutesThresholds>({
  light: {
    type: Number,
    required: true,
    min: 0,
    default: 60
  },
  moderate: {
    type: Number,
    required: true,
    min: 0,
    default: 300
  },
  heavy: {
    type: Number,
    required: true,
    min: 0,
    default: 600
  }
}, { _id: false });

// Notification thresholds schema
const notificationThresholdsSchema = new Schema({
  highCostAlert: {
    type: Boolean,
    default: true
  },
  lowAsrAlert: {
    type: Boolean,
    default: true
  },
  extremeUsageAlert: {
    type: Boolean,
    default: true
  }
}, { _id: false });

// Main KPI settings schema
const kpiSettingsSchema = new Schema<IKpiSettingsDocument, IKpiSettingsModel>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    costThresholds: {
      type: costThresholdsSchema,
      required: true,
      default: () => ({})
    },
    asrThresholds: {
      type: asrThresholdsSchema,
      required: true,
      default: () => ({})
    },
    acdThresholds: {
      type: acdThresholdsSchema,
      required: true,
      default: () => ({})
    },
    totalMinutesThresholds: {
      type: totalMinutesThresholdsSchema,
      required: true,
      default: () => ({})
    },
    currency: {
      type: String,
      default: 'EUR',
      enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY']
    },
    timezone: {
      type: String,
      default: 'Europe/London'
    },
    refreshInterval: {
      type: Number,
      min: 30,
      max: 3600,
      default: 300 // 5 minutes
    },
    enableNotifications: {
      type: Boolean,
      default: true
    },
    notificationThresholds: {
      type: notificationThresholdsSchema,
      required: true,
      default: () => ({})
    }
  },
  {
    timestamps: true,
    collection: 'kpi_settings',
  }
);

// Add indexes for better performance
// Note: userId already has unique: true which creates an index automatically

// Validation middleware
kpiSettingsSchema.pre('save', function(next) {
  // Validate that thresholds are in ascending order
  if (this.costThresholds.low >= this.costThresholds.medium) {
    return next(new Error('Cost thresholds must be in ascending order: low < medium'));
  }
  
  if (this.asrThresholds.critical >= this.asrThresholds.poor ||
      this.asrThresholds.poor >= this.asrThresholds.fair ||
      this.asrThresholds.fair >= this.asrThresholds.good) {
    return next(new Error('ASR thresholds must be in ascending order: critical < poor < fair < good'));
  }
  
  if (this.acdThresholds.short >= this.acdThresholds.normal ||
      this.acdThresholds.normal >= this.acdThresholds.long) {
    return next(new Error('ACD thresholds must be in ascending order: short < normal < long'));
  }
  
  if (this.totalMinutesThresholds.light >= this.totalMinutesThresholds.moderate ||
      this.totalMinutesThresholds.moderate >= this.totalMinutesThresholds.heavy) {
    return next(new Error('Total minutes thresholds must be in ascending order: light < moderate < heavy'));
  }
  
  next();
});

// Create and export the model
const KpiSettingsModel = mongoose.models.KpiSettings || mongoose.model<IKpiSettingsDocument, IKpiSettingsModel>('KpiSettings', kpiSettingsSchema);

export default KpiSettingsModel; 