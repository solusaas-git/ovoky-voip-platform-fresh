import mongoose, { Document, Schema } from 'mongoose';

export interface ISmsContact extends Document {
  userId: mongoose.Types.ObjectId;
  contactListId: mongoose.Types.ObjectId;
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  dateOfBirth?: Date;
  isActive: boolean;
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const SmsContactSchema = new Schema<ISmsContact>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  contactListId: {
    type: Schema.Types.ObjectId,
    ref: 'SmsContactList',
    required: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(phone: string) {
        // Basic phone validation - accepts international format
        return /^\+?[1-9]\d{6,14}$/.test(phone.replace(/[\s\-\(\)]/g, ''));
      },
      message: 'Please provide a valid phone number'
    }
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  address: {
    type: String,
    trim: true,
    maxlength: 200
  },
  city: {
    type: String,
    trim: true,
    maxlength: 100
  },
  zipCode: {
    type: String,
    trim: true,
    maxlength: 20
  },
  dateOfBirth: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  customFields: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'smscontacts'
});

// Indexes for performance
SmsContactSchema.index({ userId: 1, contactListId: 1 });
SmsContactSchema.index({ userId: 1, phoneNumber: 1 }, { unique: true });
SmsContactSchema.index({ contactListId: 1, isActive: 1 });

// Virtual for full name
SmsContactSchema.virtual('fullName').get(function() {
  const parts = [];
  if (this.firstName) parts.push(this.firstName);
  if (this.lastName) parts.push(this.lastName);
  return parts.join(' ') || 'Unknown';
});

// Virtual for display name (prioritizes full name, fallback to "Unknown Contact")
SmsContactSchema.virtual('displayName').get(function() {
  const parts = [];
  if (this.firstName) parts.push(this.firstName);
  if (this.lastName) parts.push(this.lastName);
  const fullName = parts.join(' ').trim();
  return fullName || 'Unknown Contact';
});

// Static method to get contacts by list
SmsContactSchema.statics.findByList = function(contactListId: string, options: any = {}) {
  const query = this.find({ contactListId, isActive: true });
  
  if (options.search) {
    query.where({
      $or: [
        { firstName: { $regex: options.search, $options: 'i' } },
        { lastName: { $regex: options.search, $options: 'i' } },
        { phoneNumber: { $regex: options.search, $options: 'i' } },
        { city: { $regex: options.search, $options: 'i' } }
      ]
    });
  }
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  if (options.skip) {
    query.skip(options.skip);
  }
  
  if (options.sort) {
    query.sort(options.sort);
  } else {
    query.sort({ firstName: 1, lastName: 1, phoneNumber: 1 });
  }
  
  return query;
};

// Static method to bulk insert contacts
SmsContactSchema.statics.bulkInsertContacts = async function(contacts: any[], options: any = {}) {
  const results = {
    inserted: 0,
    updated: 0,
    errors: [] as any[],
    duplicates: 0
  };

  for (const contactData of contacts) {
    try {
      // Check for existing contact by phone number and user
      const existing = await this.findOne({
        userId: contactData.userId,
        phoneNumber: contactData.phoneNumber
      });

      if (existing && options.updateOnDuplicate) {
        // Update existing contact
        Object.assign(existing, contactData);
        await existing.save();
        results.updated++;
      } else if (existing) {
        // Skip duplicate
        results.duplicates++;
      } else {
        // Insert new contact
        await this.create(contactData);
        results.inserted++;
      }
    } catch (error: any) {
      results.errors.push({
        contact: contactData,
        error: error.message
      });
    }
  }

  return results;
};

// Method to get template variables for this contact
SmsContactSchema.methods.getTemplateVariables = function() {
  return {
    firstName: this.firstName || '',
    lastName: this.lastName || '',
    fullName: this.fullName,
    phoneNumber: this.phoneNumber,
    address: this.address || '',
    city: this.city || '',
    zipCode: this.zipCode || '',
    dateOfBirth: this.dateOfBirth ? this.dateOfBirth.toLocaleDateString() : '',
    ...this.customFields
  };
};

// Pre-save middleware to clean phone number
SmsContactSchema.pre('save', function(next) {
  if (this.isModified('phoneNumber')) {
    // Clean phone number by removing spaces, dashes, parentheses
    this.phoneNumber = this.phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Add + if it doesn't start with it and doesn't start with 00
    if (!this.phoneNumber.startsWith('+') && !this.phoneNumber.startsWith('00')) {
      this.phoneNumber = '+' + this.phoneNumber;
    }
  }
  next();
});

export default mongoose.models.SmsContact || mongoose.model<ISmsContact>('SmsContact', SmsContactSchema); 