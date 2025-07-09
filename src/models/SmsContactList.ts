import mongoose, { Document, Schema } from 'mongoose';

// SMS Contact List interface
export interface ISmsContactList extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  contactCount: number;
  isActive: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// SMS Contact List schema
const SmsContactListSchema = new Schema<ISmsContactList>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  contactCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: {
    type: [String],
    default: []
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'smscontactlists'
});

// Indexes for performance
SmsContactListSchema.index({ userId: 1, isActive: 1 });
SmsContactListSchema.index({ userId: 1, createdAt: -1 });

// Static method to get contact lists by user
SmsContactListSchema.statics.findByUser = function(userId: string, options: any = {}) {
  const query = this.find({ userId });
  
  if (options.isActive !== undefined) {
    query.where('isActive', options.isActive);
  }
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  if (options.sort) {
    query.sort(options.sort);
  } else {
    query.sort({ createdAt: -1 });
  }
  
  return query;
};

// Method to update contact count
SmsContactListSchema.methods.updateContactCount = async function() {
  try {
    const SmsContact = mongoose.models.SmsContact;
    if (SmsContact) {
      const count = await SmsContact.countDocuments({
        contactListId: this._id,
        isActive: true
      });
      this.contactCount = count;
      await this.save();
    }
  } catch (error) {
    console.error('Error updating contact count:', error);
  }
};

// Method to check if contact list is used in campaigns
SmsContactListSchema.methods.isUsedInCampaigns = async function() {
  try {
    const SmsCampaign = mongoose.models.SmsCampaign;
    if (SmsCampaign) {
      const campaignCount = await SmsCampaign.countDocuments({
        contactListId: this._id,
        status: { $in: ['draft', 'scheduled', 'sending', 'paused'] }
      });
      return campaignCount > 0;
    }
    return false;
  } catch (error) {
    console.error('Error checking campaign usage:', error);
    return true; // Return true to prevent deletion on error
  }
};

// Method to get contacts for this list
SmsContactListSchema.methods.getContacts = function(options: any = {}) {
  const SmsContact = mongoose.models.SmsContact;
  if (SmsContact) {
    return (SmsContact as any).findByList(this._id.toString(), options);
  }
  return Promise.resolve([]);
};

export default mongoose.models.SmsContactList || mongoose.model<ISmsContactList>('SmsContactList', SmsContactListSchema); 