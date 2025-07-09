import mongoose, { Document, Model, Schema } from 'mongoose';

// Widget configuration interface
export interface IWidgetConfig {
  id: string;
  enabled: boolean;
  collapsed: boolean;
  collapsible: boolean; // Whether the card can be collapsed
  order: number;
  size?: 'small' | 'medium' | 'large' | 'full';
  gridCols?: number; // Number of grid columns to span (1-12)
  gridRows?: number; // Number of grid rows to span (1-6)
  position?: {
    row: number;
    col: number;
  };
  // Advanced features
  locked?: boolean; // Prevent moving/resizing
  alwaysVisible?: boolean; // Prevent hiding (for critical cards)
  minSize?: 'small' | 'medium' | 'large';
  maxSize?: 'medium' | 'large' | 'full';
  category?: string; // Group related cards
  aspectRatio?: 'auto' | 'square' | 'wide' | 'tall'; // Maintain proportions
  refreshInterval?: number; // Auto-refresh in seconds (0 = disabled)
  priority?: number; // Display priority (higher = more important)
  showTitle?: boolean; // Whether to show the card title
  settings?: { [key: string]: any }; // Widget-specific settings
  responsive?: {
    mobile?: {
      gridCols?: number;
      size?: 'small' | 'medium' | 'large' | 'full';
    };
    tablet?: {
      gridCols?: number;
      size?: 'small' | 'medium' | 'large' | 'full';
    };
  };
}

// Dashboard preferences interface
export interface IDashboardPreferences {
  userId: string;
  layout: 'grid' | 'list' | 'masonry' | 'custom';
  gridColumns: number; // Total grid columns (default 12)
  widgets: IWidgetConfig[];
  theme?: 'light' | 'dark' | 'auto';
  compactMode?: boolean;
  autoSave?: boolean; // Auto-save preferences
  showCategories?: boolean; // Group widgets by category
  categoryOrder?: string[]; // Order of categories
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Dashboard preferences document interface
export interface IDashboardPreferencesDocument extends IDashboardPreferences, Document {
  id: string;
}

// Dashboard preferences model interface
export interface IDashboardPreferencesModel extends Model<IDashboardPreferencesDocument> {}

// Export types for use in other files
export type DashboardPreferences = IDashboardPreferences;
export type WidgetConfig = IWidgetConfig;

// Responsive configuration schema
const responsiveConfigSchema = new Schema({
  gridCols: { type: Number, min: 1, max: 12 },
  size: { type: String, enum: ['small', 'medium', 'large', 'full'] },
}, { _id: false });

// Dashboard preferences schema
const widgetConfigSchema = new Schema<IWidgetConfig>({
  id: {
    type: String,
    required: true,
  },
  enabled: {
    type: Boolean,
    required: true,
    default: true,
  },
  collapsed: {
    type: Boolean,
    required: true,
    default: false,
  },
  collapsible: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    required: true,
    default: 0,
  },
  size: {
    type: String,
    enum: ['small', 'medium', 'large', 'full'],
    default: 'medium',
  },
  gridCols: {
    type: Number,
    min: 1,
    max: 12,
    default: 3, // Default to 3 columns in a 12-column grid
  },
  gridRows: {
    type: Number,
    min: 1,
    max: 6,
    default: 1,
  },
  position: {
    row: { type: Number, default: 0 },
    col: { type: Number, default: 0 },
  },
  // Advanced features
  locked: {
    type: Boolean,
    default: false,
  },
  alwaysVisible: {
    type: Boolean,
    default: false,
  },
  minSize: {
    type: String,
    enum: ['small', 'medium', 'large'],
    default: 'small',
  },
  maxSize: {
    type: String,
    enum: ['medium', 'large', 'full'],
    default: 'full',
  },
  category: {
    type: String,
    default: 'general',
  },
  aspectRatio: {
    type: String,
    enum: ['auto', 'square', 'wide', 'tall'],
    default: 'auto',
  },
  refreshInterval: {
    type: Number,
    min: 0,
    max: 3600, // Max 1 hour
    default: 0, // Disabled
  },
  priority: {
    type: Number,
    min: 0,
    max: 10,
    default: 5,
  },
  showTitle: {
    type: Boolean,
    default: true,
  },
  settings: {
    type: Map,
    of: Schema.Types.Mixed,
  },
  responsive: {
    mobile: responsiveConfigSchema,
    tablet: responsiveConfigSchema,
  },
}, { _id: false });

const dashboardPreferencesSchema = new Schema<IDashboardPreferencesDocument, IDashboardPreferencesModel>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    layout: {
      type: String,
      enum: ['grid', 'list', 'masonry', 'custom'],
      default: 'grid',
    },
    gridColumns: {
      type: Number,
      min: 1,
      max: 24,
      default: 12,
    },
    widgets: [widgetConfigSchema],
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto',
    },
    compactMode: {
      type: Boolean,
      default: false,
    },
    autoSave: {
      type: Boolean,
      default: true,
    },
    showCategories: {
      type: Boolean,
      default: false,
    },
    categoryOrder: [{
      type: String,
    }],
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'dashboard_preferences',
  }
);

// Add indexes for better performance
dashboardPreferencesSchema.index({ lastUpdated: -1 });
dashboardPreferencesSchema.index({ 'widgets.category': 1 });

// Create and export the model
const DashboardPreferencesModel = (mongoose.models.DashboardPreferences as IDashboardPreferencesModel) || 
  mongoose.model<IDashboardPreferencesDocument, IDashboardPreferencesModel>('DashboardPreferences', dashboardPreferencesSchema);

export default DashboardPreferencesModel; 