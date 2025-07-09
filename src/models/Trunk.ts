import mongoose, { Document, Model, Schema } from 'mongoose';

// Trunk interface
export interface ITrunk {
  name: string;
  username: string;
  password: string;
  domain: string;
  ipAddress?: string; // Optional for backward compatibility
  ipAddresses: string[]; // Primary field for multiple IP addresses
  port?: number;

  
  // Codec configuration
  codecs: ('G729' | 'G711a' | 'G711u' | 'G722' | 'iLBC' | 'GSM' | 'Speex')[];
  
  // Assignment details
  assignedTo: mongoose.Types.ObjectId;
  assignedBy: string;
  assignedAt: Date;
  
  // Optional additional configuration
  description?: string;
  registrationRequired?: boolean;
  authType?: 'password' | 'ip' | 'both';
  
  // Sippy integration fields (to be configured later)
  sippyAccountId?: string;
  sippyTrunkId?: string;
  sippyConfig?: Record<string, any>;
  
  // Admin fields
  createdBy: string;
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// Trunk document interface
export interface ITrunkDocument extends ITrunk, Document {
  _id: mongoose.Types.ObjectId;
}

// Trunk model interface
export interface ITrunkModel extends Model<ITrunkDocument> {}

// Trunk schema
const trunkSchema = new Schema<ITrunkDocument, ITrunkModel>(
  {
    name: {
      type: String,
      required: [true, 'Trunk name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
      index: true,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      maxlength: [50, 'Username cannot exceed 50 characters'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      maxlength: [100, 'Password cannot exceed 100 characters'],
    },
    domain: {
      type: String,
      required: [true, 'Domain is required'],
      trim: true,
      maxlength: [100, 'Domain cannot exceed 100 characters'],
      index: true,
    },
    ipAddress: {
      type: String,
      required: false, // Made optional for backward compatibility
      trim: true,
      validate: {
        validator: function(v: string) {
          if (!v) return true; // Allow empty values since it's optional
          return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(v);
        },
        message: 'Invalid IP address format',
      },
      index: true,
    },
    ipAddresses: {
      type: [String],
      required: [true, 'At least one IP address is required'], // Made required
      validate: {
        validator: function(ips: string[]) {
          if (!ips || ips.length === 0) return false; // Must have at least one IP
          return ips.every(ip => /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip));
        },
        message: 'All IP addresses must be in valid format and at least one is required',
      },
    },
    port: {
      type: Number,
      min: [1, 'Port must be between 1 and 65535'],
      max: [65535, 'Port must be between 1 and 65535'],
      default: 5060,
    },

    
    // Codec configuration
    codecs: {
      type: [String],
      required: [true, 'At least one codec is required'],
      enum: {
        values: ['G729', 'G711a', 'G711u', 'G722', 'iLBC', 'GSM', 'Speex'],
        message: 'Invalid codec',
      },
      validate: {
        validator: function(codecs: string[]) {
          return codecs && codecs.length > 0;
        },
        message: 'At least one codec is required',
      },
      default: ['G729', 'G711a', 'G711u'],
    },
    
    // Assignment details
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User assignment is required'],
    },
    assignedBy: {
      type: String,
      required: [true, 'Assigned by is required'],
      trim: true,
    },
    assignedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    
    // Optional additional configuration
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },

    registrationRequired: {
      type: Boolean,
      default: true,
    },
    authType: {
      type: String,
      enum: {
        values: ['password', 'ip', 'both'],
        message: 'Invalid auth type',
      },
      default: 'password',
    },
    
    // Sippy integration fields (to be configured later)
    sippyAccountId: {
      type: String,
      trim: true,
    },
    sippyTrunkId: {
      type: String,
      trim: true,
    },
    sippyConfig: {
      type: Schema.Types.Mixed,
    },
    
    // Admin fields
    createdBy: {
      type: String,
      required: [true, 'Created by is required'],
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for better query performance
trunkSchema.index({ username: 1, domain: 1 }, { unique: true });
trunkSchema.index({ assignedTo: 1 });
trunkSchema.index({ createdAt: -1 });

// Virtual for checking if trunk is assigned
trunkSchema.virtual('isAssigned').get(function() {
  return !!this.assignedTo;
});

// Virtual for full address (domain:port)
trunkSchema.virtual('fullAddress').get(function() {
  return this.port ? `${this.domain}:${this.port}` : this.domain;
});

// Pre-save middleware to validate unique combinations
trunkSchema.pre('save', async function(next) {
  if (this.isModified('username') || this.isModified('domain')) {
    const existingTrunk = await (this.constructor as ITrunkModel).findOne({
      username: this.username,
      domain: this.domain,
      _id: { $ne: this._id },
    });
    
    if (existingTrunk) {
      const error = new Error('Trunk with this username and domain combination already exists');
      return next(error);
    }
  }
  next();
});

// Create and export the model
const Trunk = mongoose.models.Trunk || mongoose.model<ITrunkDocument, ITrunkModel>('Trunk', trunkSchema);

export default Trunk; 