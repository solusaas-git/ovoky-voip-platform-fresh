import mongoose, { Document, Model, Schema } from 'mongoose';

// Branding Settings interface
export interface IBrandingSettings {
  // Company Information
  companyName: string;
  companySlogan?: string;
  
  // Visual Assets
  logoUrl?: string;
  darkLogoUrl?: string;
  faviconUrl?: string;
  logoAltText?: string;
  
  // Color Scheme
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  surfaceColor?: string;
  
  // Dark Mode Color Scheme
  darkPrimaryColor?: string;
  darkSecondaryColor?: string;
  darkAccentColor?: string;
  darkBackgroundColor?: string;
  darkTextColor?: string;
  darkSurfaceColor?: string;
  
  // Gradient Colors (for auth pages and backgrounds)
  gradientStartColor?: string;
  gradientMiddleColor?: string;
  gradientEndColor?: string;
  
  // Auth Form Background Colors
  authFormBackgroundColor?: string;
  darkAuthFormBackgroundColor?: string;
  
  // Typography
  fontFamily?: string;
  headingFontFamily?: string;
  
  // Layout & Styling
  borderRadius?: string;
  shadowIntensity?: 'light' | 'medium' | 'heavy';
  
  // Contact Information
  contactEmail?: string;
  supportEmail?: string;
  websiteUrl?: string;
  
  // Social Media
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };
  
  // Advanced Settings
  customCss?: string;
  enableAnimations: boolean;
  enableGlassMorphism: boolean;
  enableGradientBackground: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Document interface
export interface IBrandingSettingsDocument extends IBrandingSettings, Document {
  _id: mongoose.Types.ObjectId;
}

// Model interface
export interface IBrandingSettingsModel extends Model<IBrandingSettingsDocument> {
  getSettings(): Promise<IBrandingSettingsDocument | null>;
  updateSettings(updates: Partial<IBrandingSettings>): Promise<IBrandingSettingsDocument>;
}

// Branding Settings schema
const brandingSettingsSchema = new Schema<IBrandingSettingsDocument, IBrandingSettingsModel>(
  {
    // Company Information
    companyName: {
      type: String,
      required: true,
      default: 'Sippy Communications',
      trim: true,
    },
    companySlogan: {
      type: String,
      trim: true,
      default: 'Powerful Communication Management Platform',
    },
    
    // Visual Assets
    logoUrl: {
      type: String,
      trim: true,
    },
    darkLogoUrl: {
      type: String,
      trim: true,
    },
    faviconUrl: {
      type: String,
      trim: true,
    },
    logoAltText: {
      type: String,
      trim: true,
      default: 'Company Logo',
    },
    
    // Color Scheme
    primaryColor: {
      type: String,
      required: true,
      default: '#7c3aed', // violet-600
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color'],
    },
    secondaryColor: {
      type: String,
      required: true,
      default: '#a855f7', // purple-500
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color'],
    },
    accentColor: {
      type: String,
      default: '#06b6d4', // cyan-500
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color'],
    },
    backgroundColor: {
      type: String,
      default: '#ffffff',
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color'],
    },
    textColor: {
      type: String,
      default: '#1f2937', // gray-800
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color'],
    },
    surfaceColor: {
      type: String,
      default: '#f9fafb', // gray-50
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color'],
    },
    
    // Dark Mode Color Scheme
    darkPrimaryColor: {
      type: String,
      default: '#a78bfa', // violet-400 (lighter for dark mode)
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color'],
    },
    darkSecondaryColor: {
      type: String,
      default: '#c084fc', // purple-400 (lighter for dark mode)
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color'],
    },
    darkAccentColor: {
      type: String,
      default: '#22d3ee', // cyan-400 (lighter for dark mode)
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color'],
    },
    darkBackgroundColor: {
      type: String,
      default: '#0f172a', // slate-900
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color'],
    },
    darkTextColor: {
      type: String,
      default: '#f1f5f9', // slate-100
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color'],
    },
    darkSurfaceColor: {
      type: String,
      default: '#1e293b', // slate-800
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color'],
    },
    
    // Gradient Colors
    gradientStartColor: {
      type: String,
      default: '#7c3aed', // violet-600
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color'],
    },
    gradientMiddleColor: {
      type: String,
      default: '#a855f7', // purple-500
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color'],
    },
    gradientEndColor: {
      type: String,
      default: '#3b82f6', // blue-500
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color'],
    },
    
    // Auth Form Background Colors
    authFormBackgroundColor: {
      type: String,
      default: '#ffffff',
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color'],
    },
    darkAuthFormBackgroundColor: {
      type: String,
      default: '#0f172a',
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color'],
    },
    
    // Typography
    fontFamily: {
      type: String,
      default: 'Inter, sans-serif',
      trim: true,
    },
    headingFontFamily: {
      type: String,
      default: 'Inter, sans-serif',
      trim: true,
    },
    
    // Layout & Styling
    borderRadius: {
      type: String,
      default: '0.75rem', // rounded-xl
      trim: true,
    },
    shadowIntensity: {
      type: String,
      enum: ['light', 'medium', 'heavy'],
      default: 'medium',
    },
    
    // Contact Information
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    supportEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    websiteUrl: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please provide a valid URL'],
    },
    
    // Social Media
    socialLinks: {
      twitter: {
        type: String,
        trim: true,
        match: [/^https?:\/\/.+/, 'Please provide a valid URL'],
      },
      linkedin: {
        type: String,
        trim: true,
        match: [/^https?:\/\/.+/, 'Please provide a valid URL'],
      },
      facebook: {
        type: String,
        trim: true,
        match: [/^https?:\/\/.+/, 'Please provide a valid URL'],
      },
      instagram: {
        type: String,
        trim: true,
        match: [/^https?:\/\/.+/, 'Please provide a valid URL'],
      },
    },
    
    // Advanced Settings
    customCss: {
      type: String,
      default: '',
    },
    enableAnimations: {
      type: Boolean,
      default: true,
    },
    enableGlassMorphism: {
      type: Boolean,
      default: true,
    },
    enableGradientBackground: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'branding_settings',
  }
);

// Static method to get settings (singleton pattern)
brandingSettingsSchema.static('getSettings', async function (): Promise<IBrandingSettingsDocument | null> {
  let settings = await this.findOne();
  
  // Create default settings if none exist
  if (!settings) {
    settings = await this.create({});
  }
  
  return settings;
});

// Static method to update settings
brandingSettingsSchema.static('updateSettings', async function (updates: Partial<IBrandingSettings>): Promise<IBrandingSettingsDocument> {
  let settings = await this.findOne();
  
  if (!settings) {
    settings = await this.create(updates);
  } else {
    Object.assign(settings, updates);
    await settings.save();
  }
  
  return settings;
});

// Create and export the BrandingSettings model
const BrandingSettings = (mongoose.models.BrandingSettings as IBrandingSettingsModel) || 
  mongoose.model<IBrandingSettingsDocument, IBrandingSettingsModel>('BrandingSettings', brandingSettingsSchema);

export default BrandingSettings; 