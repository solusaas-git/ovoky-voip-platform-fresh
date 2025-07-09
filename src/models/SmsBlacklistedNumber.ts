import mongoose, { Document, Model, Schema } from 'mongoose';

// SMS Blacklisted Number interface
export interface ISmsBlacklistedNumber {
  userId: mongoose.Types.ObjectId;
  phoneNumber: string;
  reason?: string;
  addedBy?: mongoose.Types.ObjectId; // Admin who added it, if added by admin
  isGlobal: boolean; // If true, applies to all users
  
  // Metadata
  notes?: string;
  tags?: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

// SMS Blacklisted Number document interface
export interface ISmsBlacklistedNumberDocument extends ISmsBlacklistedNumber, Document {
  id: string;
}

// SMS Blacklisted Number model interface
export interface ISmsBlacklistedNumberModel extends Model<ISmsBlacklistedNumberDocument> {
  findByUserId(userId: string): Promise<ISmsBlacklistedNumberDocument[]>;
  isBlacklisted(userId: string, phoneNumber: string): Promise<boolean>;
  addToBlacklist(userId: string, phoneNumber: string, reason?: string): Promise<ISmsBlacklistedNumberDocument>;
  removeFromBlacklist(userId: string, phoneNumber: string): Promise<void>;
  findGlobalBlacklist(): Promise<ISmsBlacklistedNumberDocument[]>;
}

// SMS Blacklisted Number schema
const smsBlacklistedNumberSchema = new Schema<ISmsBlacklistedNumberDocument, ISmsBlacklistedNumberModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      validate: {
        validator: function(phoneNumber: string) {
          // Validate phone number format (international format)
          return /^\+?[1-9]\d{6,19}$/.test(phoneNumber.replace(/[\s\-\(\)]/g, ''));
        },
        message: 'Phone number must be in valid international format',
      },
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isGlobal: {
      type: Boolean,
      default: false,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'sms_blacklisted_numbers',
  }
);

// Add compound indexes for better query performance
smsBlacklistedNumberSchema.index({ userId: 1, phoneNumber: 1 }, { unique: true });
smsBlacklistedNumberSchema.index({ phoneNumber: 1, isGlobal: 1 });

// Static method to find blacklisted numbers by user ID
smsBlacklistedNumberSchema.static('findByUserId', async function findByUserId(userId: string) {
  return this.find({ 
    $or: [
      { userId, isGlobal: false },
      { isGlobal: true }
    ]
  })
    .populate('addedBy', 'name email')
    .sort({ createdAt: -1 });
});

// Static method to check if a phone number is blacklisted
smsBlacklistedNumberSchema.static('isBlacklisted', async function isBlacklisted(userId: string, phoneNumber: string) {
  // Normalize phone number (remove spaces, dashes, parentheses)
  const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  const blacklistedEntry = await this.findOne({
    phoneNumber: normalizedPhone,
    $or: [
      { userId, isGlobal: false },
      { isGlobal: true }
    ]
  });
  
  return !!blacklistedEntry;
});

// Static method to add phone number to blacklist
smsBlacklistedNumberSchema.static('addToBlacklist', async function addToBlacklist(
  userId: string, 
  phoneNumber: string, 
  reason?: string
) {
  // Normalize phone number
  const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // Check if already blacklisted
  const existing = await this.findOne({
    userId,
    phoneNumber: normalizedPhone,
    isGlobal: false
  });
  
  if (existing) {
    throw new Error('Phone number is already blacklisted');
  }
  
  const blacklistedNumber = new this({
    userId,
    phoneNumber: normalizedPhone,
    reason,
    isGlobal: false,
  });
  
  return await blacklistedNumber.save();
});

// Static method to remove phone number from blacklist
smsBlacklistedNumberSchema.static('removeFromBlacklist', async function removeFromBlacklist(
  userId: string, 
  phoneNumber: string
) {
  // Normalize phone number
  const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  await this.deleteOne({
    userId,
    phoneNumber: normalizedPhone,
    isGlobal: false // Only allow users to remove their own blacklisted numbers
  });
});

// Static method to find global blacklist
smsBlacklistedNumberSchema.static('findGlobalBlacklist', async function findGlobalBlacklist() {
  return this.find({ isGlobal: true })
    .populate('addedBy', 'name email')
    .sort({ createdAt: -1 });
});

// Pre-save hook to normalize phone number
smsBlacklistedNumberSchema.pre('save', function(next) {
  if (this.isModified('phoneNumber')) {
    this.phoneNumber = this.phoneNumber.replace(/[\s\-\(\)]/g, '');
  }
  next();
});

// Create and export the SmsBlacklistedNumber model
const SmsBlacklistedNumber = (mongoose.models.SmsBlacklistedNumber as ISmsBlacklistedNumberModel) || 
  mongoose.model<ISmsBlacklistedNumberDocument, ISmsBlacklistedNumberModel>('SmsBlacklistedNumber', smsBlacklistedNumberSchema);

export default SmsBlacklistedNumber; 