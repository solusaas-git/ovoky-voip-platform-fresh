import mongoose, { Document, Model, Schema } from 'mongoose';

// System Language Settings interface
export interface ISystemLanguageSettings {
  defaultLanguage: 'en' | 'fr';
  availableLanguages: ('en' | 'fr')[];
  enforceLanguage: boolean; // If true, users cannot change language
  createdAt: Date;
  updatedAt: Date;
}

// System Language Settings document interface
export interface ISystemLanguageSettingsDocument extends ISystemLanguageSettings, Document {
  id: string;
}

// System Language Settings model interface
export interface ISystemLanguageSettingsModel extends Model<ISystemLanguageSettingsDocument> {}

// System Language Settings schema
const systemLanguageSettingsSchema = new Schema<ISystemLanguageSettingsDocument, ISystemLanguageSettingsModel>({
  defaultLanguage: {
    type: String,
    enum: ['en', 'fr'],
    default: 'en',
    required: true
  },
  availableLanguages: {
    type: [String],
    enum: ['en', 'fr'],
    default: ['en', 'fr'],
    required: true,
    validate: {
      validator: function(languages: string[]) {
        return languages.length > 0;
      },
      message: 'At least one language must be available'
    }
  },
  enforceLanguage: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'system_language_settings'
});

// Ensure only one document exists (singleton)
systemLanguageSettingsSchema.index({}, { unique: true });

// Create and export the model
const SystemLanguageSettingsModel = mongoose.models.SystemLanguageSettings || 
  mongoose.model<ISystemLanguageSettingsDocument>('SystemLanguageSettings', systemLanguageSettingsSchema);

export default SystemLanguageSettingsModel; 