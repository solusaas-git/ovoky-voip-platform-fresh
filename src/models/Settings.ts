import mongoose, { Document, Model, Schema } from 'mongoose';
import crypto from 'crypto';

// Settings type
export interface ISettings extends Document {
  key: string;
  value: string;
  encrypted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Settings schema
const settingsSchema = new Schema<ISettings>(
  {
    key: {
      type: String,
      required: [true, 'Key is required'],
      unique: true,
      index: true,
    },
    value: {
      type: String,
      required: [true, 'Value is required'],
    },
    encrypted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt/decrypt methods
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef'; // Exactly 32 bytes for AES-256-CBC

export const encryptValue = (text: string): string => {
  // Generate a random initialization vector
  const iv = crypto.randomBytes(16);
  
  // Create cipher with key and iv
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  
  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return the IV concatenated with the encrypted text
  return encrypted + ':' + iv.toString('hex');
};

export const decryptValue = (encryptedText: string): string => {
  // Split the string to separate encrypted data and IV
  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted text format');
  }
  
  try {
    // Create decipher with the same key and IV
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY),
      Buffer.from(parts[1], 'hex')
    );
    
    // Decrypt the text
    let decrypted = decipher.update(parts[0], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt the value');
  }
};

// Static methods for settings model
export interface SettingsModel extends Model<ISettings> {
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string, encrypt?: boolean): Promise<void>;
}

// Method to get a setting
settingsSchema.static('getSetting', async function(key: string): Promise<string | null> {
  const setting = await this.findOne({ key });
  
  if (!setting) {
    return null;
  }
  
  if (setting.encrypted) {
    try {
      return decryptValue(setting.value);
    } catch (error) {
      console.error('Error decrypting setting:', error);
      return null;
    }
  }
  
  return setting.value;
});

// Method to set a setting
settingsSchema.static('setSetting', async function(
  key: string,
  value: string,
  encrypt = false
): Promise<void> {
  const settingValue = encrypt ? encryptValue(value) : value;
  
  await this.findOneAndUpdate(
    { key },
    { value: settingValue, encrypted: encrypt },
    { upsert: true }
  );
});

// Create and export the Settings model
const Settings = (mongoose.models.Settings as SettingsModel) || 
  mongoose.model<ISettings, SettingsModel>('Settings', settingsSchema);

export default Settings; 