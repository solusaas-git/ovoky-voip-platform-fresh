import mongoose, { Document, Schema } from 'mongoose';

// SMS Template interface
export interface ISmsTemplate extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  message: string;
  variables: string[];
  category?: string;
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// SMS Template schema
const SmsTemplateSchema = new Schema<ISmsTemplate>({
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
  message: {
    type: String,
    required: true,
    maxlength: 1600 // Max SMS length
  },
  variables: {
    type: [String],
    default: []
  },
  category: {
    type: String,
    trim: true,
    maxlength: 50
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUsedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'smstemplates'
});

// Indexes for performance
SmsTemplateSchema.index({ userId: 1, isActive: 1 });
SmsTemplateSchema.index({ userId: 1, category: 1 });
SmsTemplateSchema.index({ userId: 1, createdAt: -1 });

// Pre-save middleware to extract variables from message
SmsTemplateSchema.pre('save', function(next) {
  if (this.isModified('message')) {
    // Extract variables from message using regex {{variable}}
    const variableMatches = this.message.match(/\{\{([^}]+)\}\}/g);
    if (variableMatches) {
      this.variables = variableMatches.map(match => 
        match.replace(/\{\{|\}\}/g, '').trim()
      );
      // Remove duplicates
      this.variables = [...new Set(this.variables)];
    } else {
      this.variables = [];
    }
  }
  next();
});

// Static method to get templates by user
SmsTemplateSchema.statics.findByUser = function(userId: string, options: any = {}) {
  const query = this.find({ userId });
  
  if (options.isActive !== undefined) {
    query.where('isActive', options.isActive);
  }
  
  if (options.category) {
    query.where('category', options.category);
  }
  
  if (options.search) {
    query.where({
      $or: [
        { name: { $regex: options.search, $options: 'i' } },
        { description: { $regex: options.search, $options: 'i' } },
        { message: { $regex: options.search, $options: 'i' } }
      ]
    });
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

// Method to increment usage count
SmsTemplateSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

// Method to render template with variables
SmsTemplateSchema.methods.render = function(variables: Record<string, string>) {
  let renderedMessage = this.message;
  
  // Replace variables in the message
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    renderedMessage = renderedMessage.replace(regex, value);
  }
  
  return renderedMessage;
};

// Virtual for checking if template has variables
SmsTemplateSchema.virtual('hasVariables').get(function() {
  return this.variables && this.variables.length > 0;
});

export default mongoose.models.SmsTemplate || mongoose.model<ISmsTemplate>('SmsTemplate', SmsTemplateSchema); 