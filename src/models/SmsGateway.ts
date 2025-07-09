import mongoose, { Document, Schema } from 'mongoose';

export interface ISmsGateway extends Document {
  name: string;
  displayName: string;
  type: string;
  provider: string;
  isActive: boolean;
  apiEndpoint?: string;
  apiKey?: string;
  apiSecret?: string;
  supportedCountries: string[];
  rateLimit?: {
    messagesPerSecond: number;
    messagesPerMinute: number;
    messagesPerHour: number;
  };
  webhookUrl?: string;
  settings?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const smsGatewaySchema = new Schema<ISmsGateway>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  type: {
    type: String,
    required: true,
    enum: ['one-way', 'two-way']
  },
  provider: {
    type: String,
    required: true,
    enum: ['twilio', 'aws-sns', 'messagebird', 'plivo', 'nexmo', 'smsenvoi', 'custom', 'simulation']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  apiEndpoint: {
    type: String,
    trim: true
  },
  apiKey: {
    type: String,
    trim: true
  },
  apiSecret: {
    type: String,
    trim: true
  },
  supportedCountries: {
    type: [String],
    default: []
  },
  rateLimit: {
    messagesPerSecond: {
      type: Number,
      default: 10
    },
    messagesPerMinute: {
      type: Number,
      default: 100
    },
    messagesPerHour: {
      type: Number,
      default: 1000
    }
  },
  webhookUrl: {
    type: String,
    trim: true
  },
  settings: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'smsproviders'
});

smsGatewaySchema.index({ isActive: 1, type: 1 });
smsGatewaySchema.index({ isActive: 1, provider: 1 });
smsGatewaySchema.index({ supportedCountries: 1 });

smsGatewaySchema.statics.findActive = function(options: any = {}) {
  const query = this.find({ isActive: true });
  
  if (options.type) {
    query.where('type', options.type);
  }
  
  if (options.provider) {
    query.where('provider', options.provider);
  }
  
  if (options.country) {
    query.where('supportedCountries', options.country);
  }
  
  if (options.sort) {
    query.sort(options.sort);
  } else {
    query.sort({ name: 1 });
  }
  
  return query;
};

smsGatewaySchema.methods.supportsCountry = function(countryCode: string) {
  return this.supportedCountries.includes(countryCode) || this.supportedCountries.length === 0;
};

smsGatewaySchema.methods.getRateLimit = function(period: 'second' | 'minute' | 'hour') {
  switch (period) {
    case 'second':
      return this.rateLimit?.messagesPerSecond || 10;
    case 'minute':
      return this.rateLimit?.messagesPerMinute || 100;
    case 'hour':
      return this.rateLimit?.messagesPerHour || 1000;
    default:
      return 10;
  }
};

const SmsGateway = mongoose.models.SmsProvider || mongoose.model<ISmsGateway>('SmsProvider', smsGatewaySchema);

export default SmsGateway; 