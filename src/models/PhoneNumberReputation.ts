import mongoose, { Document, Model, Schema } from 'mongoose';

// Phone Number Reputation interface
export interface IPhoneNumberReputation {
  number: string;
  countryCode: string;
  country: string;
  provider: 'page-jaune-be' | 'truecaller' | 'who-called' | 'other'; // Extensible for more providers
  
  // Reputation data
  dangerLevel: number; // 0-100, where 100 is most dangerous
  status: 'safe' | 'neutral' | 'annoying' | 'dangerous' | 'unknown';
  commentCount: number;
  visitCount: number;
  
  // Provider-specific data
  providerData: {
    lastComment?: string;
    lastCommentDate?: Date;
    lastVisitDate?: Date;
    allComments?: Array<{
      text: string;
      date?: Date;
      category?: string;
    }>;
    categories?: string[]; // e.g., ['telemarketing', 'spam', 'scam']
    description?: string;
    sourceUrl?: string;
  };
  
  // Metadata
  lastChecked: Date;
  checkedBy: mongoose.Types.ObjectId; // User who triggered the check
  isStale: boolean; // Flag to indicate if data needs refresh
  
  createdAt: Date;
  updatedAt: Date;
}

// Phone Number Reputation document interface
export interface IPhoneNumberReputationDocument extends IPhoneNumberReputation, Document {
  _id: mongoose.Types.ObjectId;
}

// Phone Number Reputation model interface
export interface IPhoneNumberReputationModel extends Model<IPhoneNumberReputationDocument> {}

// Phone Number Reputation schema
const phoneNumberReputationSchema = new Schema<IPhoneNumberReputationDocument, IPhoneNumberReputationModel>(
  {
    number: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      index: true,
    },
    countryCode: {
      type: String,
      required: [true, 'Country code is required'],
      trim: true,
      index: true,
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      index: true,
    },
    provider: {
      type: String,
      required: [true, 'Provider is required'],
      enum: {
        values: ['page-jaune-be', 'truecaller', 'who-called', 'other'],
        message: 'Invalid provider',
      },
      index: true,
    },
    
    // Reputation data
    dangerLevel: {
      type: Number,
      required: [true, 'Danger level is required'],
      min: [0, 'Danger level cannot be negative'],
      max: [100, 'Danger level cannot exceed 100'],
      default: 0,
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['safe', 'neutral', 'annoying', 'dangerous', 'unknown'],
        message: 'Invalid status',
      },
      default: 'unknown',
      index: true,
    },
    commentCount: {
      type: Number,
      required: true,
      min: [0, 'Comment count cannot be negative'],
      default: 0,
    },
    visitCount: {
      type: Number,
      required: true,
      min: [0, 'Visit count cannot be negative'],
      default: 0,
    },
    
    // Provider-specific data
    providerData: {
      lastComment: {
        type: String,
        trim: true,
        maxlength: [1000, 'Last comment cannot exceed 1000 characters'],
      },
      lastCommentDate: {
        type: Date,
      },
      lastVisitDate: {
        type: Date,
      },
      allComments: [{
        text: {
          type: String,
          trim: true,
        },
        date: {
          type: Date,
        },
        category: {
          type: String,
          trim: true,
        },
      }],
      categories: [{
        type: String,
        trim: true,
      }],
      description: {
        type: String,
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters'],
      },
      sourceUrl: {
        type: String,
        trim: true,
        maxlength: [500, 'Source URL cannot exceed 500 characters'],
      },
    },
    
    // Metadata
    lastChecked: {
      type: Date,
      required: [true, 'Last checked date is required'],
      default: Date.now,
      index: true,
    },
    checkedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Checked by user is required'],
      index: true,
    },
    isStale: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'phone_number_reputations',
  }
);

// Add compound indexes for better query performance
phoneNumberReputationSchema.index({ number: 1, provider: 1 }, { unique: true });
phoneNumberReputationSchema.index({ lastChecked: 1, isStale: 1 });
phoneNumberReputationSchema.index({ country: 1, status: 1 });

// Method to determine if reputation data is stale (older than 7 days)
phoneNumberReputationSchema.methods.checkIsStale = function(): boolean {
  const staleThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  return Date.now() - this.lastChecked.getTime() > staleThreshold;
};

// Export the model
const PhoneNumberReputation: IPhoneNumberReputationModel = mongoose.models.PhoneNumberReputation || 
  mongoose.model<IPhoneNumberReputationDocument, IPhoneNumberReputationModel>('PhoneNumberReputation', phoneNumberReputationSchema);

export default PhoneNumberReputation; 