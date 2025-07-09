import mongoose, { Document, Model, Schema } from 'mongoose';

// Ticket attachment interface
export interface ITicketAttachment {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string; // User ID
}

// Outbound call example interface
export interface IOutboundCallExample {
  number: string;
  callDate: Date;
  description?: string;
}

// Outbound call data interface
export interface IOutboundCallData {
  examples: IOutboundCallExample[];
}

// Assigned number interface
export interface IAssignedNumber {
  number: string;
  description?: string;
  type?: string;
  country?: string;
  rate?: number;
  currency?: string;
}

// Ticket reply interface
export interface ITicketReply {
  content: string;
  attachments?: ITicketAttachment[];
  authorId: string; // User ID
  authorType: 'user' | 'admin';
  createdAt: Date;
  isInternal?: boolean; // For admin-only notes
}

// Ticket interface
export interface ITicket {
  ticketNumber?: string; // Auto-generated unique ticket number
  title: string;
  description: string;
  
  // Service and priority
  service: 'outbound_calls' | 'inbound_calls' | 'did_numbers' | 'sms' | 'emailing' | 'whatsapp_business' | 'billing' | 'technical' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // User information
  userId: string;
  userEmail: string; // Stored for quick access
  
  // Status and assignment
  status: 'open' | 'in_progress' | 'waiting_user' | 'waiting_admin' | 'resolved' | 'closed';
  assignedTo?: string; // Admin user ID
  
  // Attachments and replies
  attachments?: ITicketAttachment[];
  replies: ITicketReply[];
  
  // Service-specific fields
  country?: string; // For services that need country
  outboundCallData?: IOutboundCallData; // For outbound calls
  assignedNumbers?: IAssignedNumber[]; // For numbers/inbound services
  selectedPhoneNumbers?: string[]; // Phone numbers selected by user when creating ticket
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  
  // Additional metadata
  tags?: string[];
  internalNotes?: string; // Admin-only notes
  customerSatisfactionRating?: number; // 1-5 scale
  customerSatisfactionComment?: string; // Comment for low ratings
  estimatedResolutionTime?: Date;
}

// Document interface
export interface ITicketDocument extends ITicket, Document {
  id: string;
}

// Model interface
export interface ITicketModel extends Model<ITicketDocument> {
  generateTicketNumber(): Promise<string>;
}

// Attachment schema
const attachmentSchema = new Schema<ITicketAttachment>({
  filename: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  uploadedBy: {
    type: String,
    required: true,
  },
}, { _id: false });

// Reply schema
const replySchema = new Schema<ITicketReply>({
  content: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  attachments: [attachmentSchema],
  authorId: {
    type: String,
    required: true,
  },
  authorType: {
    type: String,
    enum: ['user', 'admin'],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isInternal: {
    type: Boolean,
    default: false,
  },
});

// Ticket schema
const ticketSchema = new Schema<ITicketDocument, ITicketModel>({
  ticketNumber: {
    type: String,
    unique: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  service: {
    type: String,
    enum: ['outbound_calls', 'inbound_calls', 'did_numbers', 'sms', 'emailing', 'whatsapp_business', 'billing', 'technical', 'other'],
    required: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting_user', 'waiting_admin', 'resolved', 'closed'],
    default: 'open',
  },
  assignedTo: {
    type: String,
  },
  attachments: [attachmentSchema],
  replies: [replySchema],
  resolvedAt: {
    type: Date,
  },
  closedAt: {
    type: Date,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  internalNotes: {
    type: String,
    maxlength: 2000,
  },
  customerSatisfactionRating: {
    type: Number,
    min: 1,
    max: 5,
  },
  customerSatisfactionComment: {
    type: String,
    maxlength: 2000,
  },
  estimatedResolutionTime: {
    type: Date,
  },
  country: {
    type: String,
    trim: true,
    maxlength: 10,
  },
  outboundCallData: {
    examples: [{
      number: {
        type: String,
        required: true,
        trim: true,
      },
      callDate: {
        type: Date,
        required: true,
      },
      description: {
        type: String,
        trim: true,
        maxlength: 500,
      },
    }],
  },
  assignedNumbers: [{
    number: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    rate: {
      type: Number,
    },
    currency: {
      type: String,
      trim: true,
    },
  }],
  selectedPhoneNumbers: [{
    type: String,
    trim: true,
  }],
}, {
  timestamps: true,
  collection: 'tickets',
});

// Indexes
ticketSchema.index({ userId: 1 }); // For user-specific ticket queries
ticketSchema.index({ status: 1 });
ticketSchema.index({ service: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ createdAt: -1 });

// Static method to generate ticket number
ticketSchema.statics.generateTicketNumber = async function(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `TKT-${currentYear}`;
  
  // Find the latest ticket number for the current year
  const latestTicket = await this.findOne({
    ticketNumber: { $regex: `^${prefix}` }
  }).sort({ ticketNumber: -1 });
  
  let nextNumber = 1;
  if (latestTicket && latestTicket.ticketNumber) {
    const currentNumber = parseInt(latestTicket.ticketNumber.split('-')[2] || '0');
    nextNumber = currentNumber + 1;
  }
  
  return `${prefix}-${nextNumber.toString().padStart(6, '0')}`;
};

// Pre-save middleware to generate ticket number
ticketSchema.pre('save', async function(next) {
  try {
    if (this.isNew && !this.ticketNumber) {
      this.ticketNumber = await (this.constructor as ITicketModel).generateTicketNumber();
    }
    next();
  } catch (error) {
    console.error('Error generating ticket number:', error);
    next(error as any);
  }
});

// Export types
export type Ticket = ITicket;
export type TicketAttachment = ITicketAttachment;
export type TicketReply = ITicketReply;

// Create and export the model
const TicketModel = (mongoose.models.Ticket as ITicketModel) || 
  mongoose.model<ITicketDocument, ITicketModel>('Ticket', ticketSchema);

export default TicketModel; 