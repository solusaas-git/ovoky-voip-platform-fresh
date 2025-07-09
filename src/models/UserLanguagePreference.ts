import mongoose, { Document, Model, Schema } from 'mongoose';

// User Language Preference interface
export interface IUserLanguagePreference {
  userId: string;
  language: 'en' | 'fr';
  createdAt: Date;
  updatedAt: Date;
}

// User Language Preference document interface
export interface IUserLanguagePreferenceDocument extends IUserLanguagePreference, Document {
  id: string;
}

// User Language Preference model interface
export interface IUserLanguagePreferenceModel extends Model<IUserLanguagePreferenceDocument> {}

// User Language Preference schema
const userLanguagePreferenceSchema = new Schema<IUserLanguagePreferenceDocument, IUserLanguagePreferenceModel>({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  language: {
    type: String,
    enum: ['en', 'fr'],
    default: 'en',
    required: true
  }
}, {
  timestamps: true,
  collection: 'user_language_preferences'
});

// Add indexes for better performance
// Note: userId already has unique: true which creates an index automatically
userLanguagePreferenceSchema.index({ language: 1 });

// Create and export the model
const UserLanguagePreferenceModel = mongoose.models.UserLanguagePreference || 
  mongoose.model<IUserLanguagePreferenceDocument>('UserLanguagePreference', userLanguagePreferenceSchema);

export default UserLanguagePreferenceModel; 