import mongoose, { Schema, Document } from 'mongoose';

// Payment interface for MongoDB storage (complementing Sippy data)
export interface IPayment extends Document {
  // Core payment identification
  paymentIntentId: string; // Stripe payment intent ID
  webhookEventId: string; // Reference to webhook event that created this
  sippyPaymentId?: number; // Sippy's i_payment ID (when available)
  
  // User and account info
  userId: string;
  userEmail: string;
  sippyAccountId: number;
  sippyCustomerId?: number;
  
  // Payment amounts (for invoicing and detailed tracking)
  topupAmount: number; // Amount that actually goes to user's balance
  processingFee: number; // Gateway processing fee (percentage-based)
  fixedFee: number; // Gateway fixed fee
  totalChargedAmount: number; // Total amount charged to user's card
  currency: string;
  
  // Payment method details (not stored in Sippy)
  provider: 'stripe' | 'paypal' | 'square' | 'razorpay';
  gatewayId: string; // Reference to PaymentGateway document
  gatewayName: string;
  
  // Card/Payment method details
  paymentMethodType: 'card' | 'bank_transfer' | 'wallet' | 'other';
  cardBrand?: string; // visa, mastercard, amex, etc.
  cardLast4?: string;
  cardCountry?: string;
  cardFingerprint?: string; // For identifying same card across payments
  
  // Payment status and timing
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'requires_action';
  paymentIntentStatus: string; // Raw status from payment provider
  failureCode?: string;
  failureMessage?: string;
  
  // Timestamps
  paymentInitiatedAt: Date; // When payment intent was created
  paymentCompletedAt?: Date; // When payment was completed
  sippyProcessedAt?: Date; // When credit was added to Sippy
  
  // Invoice and billing details
  paymentReference?: string; // Payment reference number (e.g., PAY-20240528-123456)
  invoiceId?: string; // Reference to actual invoice when generated
  taxAmount?: number;
  taxRate?: number;
  receiptUrl?: string;
  
  // Additional metadata
  userAgent?: string;
  ipAddress?: string;
  description?: string;
  notes?: string;
  
  // Raw provider data (for debugging and completeness)
  rawPaymentData?: Record<string, any>;
  rawWebhookData?: Record<string, any>;
  
  // Audit trail
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    // Core identification
    paymentIntentId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    webhookEventId: {
      type: String,
      required: true,
      index: true
    },
    sippyPaymentId: {
      type: Number,
      index: true
    },
    
    // User and account info
    userId: {
      type: String,
      required: true,
      index: true
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    sippyAccountId: {
      type: Number,
      required: true,
      index: true
    },
    sippyCustomerId: {
      type: Number,
      index: true
    },
    
    // Payment amounts
    topupAmount: {
      type: Number,
      required: true,
      min: 0
    },
    processingFee: {
      type: Number,
      required: true,
      min: 0
    },
    fixedFee: {
      type: Number,
      required: true,
      min: 0
    },
    totalChargedAmount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3
    },
    
    // Payment gateway info
    provider: {
      type: String,
      required: true,
      enum: ['stripe', 'paypal', 'square', 'razorpay']
    },
    gatewayId: {
      type: String,
      required: true,
      index: true
    },
    gatewayName: {
      type: String,
      required: true,
      trim: true
    },
    
    // Payment method details
    paymentMethodType: {
      type: String,
      required: true,
      enum: ['card', 'bank_transfer', 'wallet', 'other'],
      default: 'card'
    },
    cardBrand: {
      type: String,
      trim: true,
      lowercase: true
    },
    cardLast4: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          // Allow empty/null values, but if provided, must be 4 digits
          return !v || /^\d{4}$/.test(v);
        },
        message: 'Card last 4 digits must be exactly 4 digits'
      }
    },
    cardCountry: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function(v: string) {
          // Allow empty/null values, but if provided, must be 2 characters
          return !v || (v.length >= 2 && v.length <= 2);
        },
        message: 'Card country must be exactly 2 characters'
      }
    },
    cardFingerprint: {
      type: String,
      trim: true,
      index: true
    },
    
    // Payment status
    status: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'succeeded', 'failed', 'canceled', 'requires_action'],
      default: 'pending',
      index: true
    },
    paymentIntentStatus: {
      type: String,
      required: true,
      trim: true
    },
    failureCode: {
      type: String,
      trim: true
    },
    failureMessage: {
      type: String,
      trim: true
    },
    
    // Timestamps
    paymentInitiatedAt: {
      type: Date,
      required: true,
      index: true
    },
    paymentCompletedAt: {
      type: Date,
      index: true
    },
    sippyProcessedAt: {
      type: Date,
      index: true
    },
    
    // Invoice details
    paymentReference: {
      type: String,
      trim: true,
      unique: true,
      sparse: true
    },
    invoiceId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true
    },
    taxAmount: {
      type: Number,
      min: 0
    },
    taxRate: {
      type: Number,
      min: 0,
      max: 1 // Percentage as decimal (0.2 = 20%)
    },
    receiptUrl: {
      type: String,
      trim: true
    },
    
    // Additional metadata
    userAgent: {
      type: String,
      trim: true
    },
    ipAddress: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    
    // Raw data storage
    rawPaymentData: {
      type: Schema.Types.Mixed
    },
    rawWebhookData: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true,
    collection: 'payments'
  }
);

// Compound indexes for efficient queries
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ sippyAccountId: 1, createdAt: -1 });
paymentSchema.index({ provider: 1, status: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ paymentCompletedAt: -1 });
paymentSchema.index({ cardFingerprint: 1, userId: 1 }); // For identifying repeat customers
paymentSchema.index({ currency: 1, paymentCompletedAt: -1 }); // For financial reporting

// Virtual for calculating effective fee rate
paymentSchema.virtual('effectiveFeeRate').get(function() {
  if (this.topupAmount > 0) {
    return ((this.processingFee + this.fixedFee) / this.topupAmount) * 100;
  }
  return 0;
});

// Instance methods
paymentSchema.methods.generatePaymentReference = function() {
  if (!this.paymentReference) {
    // Use current date instead of this.createdAt since createdAt is set after save
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    this.paymentReference = `PAY-${year}${month}${day}-${timestamp}`;
  }
  return this.paymentReference;
};

paymentSchema.methods.getReceiptData = function() {
  return {
    paymentReference: this.generatePaymentReference(),
    paymentDate: this.paymentCompletedAt || this.createdAt,
    userEmail: this.userEmail,
    topupAmount: this.topupAmount,
    processingFee: this.processingFee,
    fixedFee: this.fixedFee,
    totalAmount: this.totalChargedAmount,
    currency: this.currency,
    paymentMethod: `${this.cardBrand} ending in ${this.cardLast4}`,
    gatewayName: this.gatewayName,
    paymentIntentId: this.paymentIntentId
  };
};

// Static methods
paymentSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

paymentSchema.statics.findBySippyAccount = function(sippyAccountId: number) {
  return this.find({ sippyAccountId }).sort({ createdAt: -1 });
};

paymentSchema.statics.getPaymentStats = function(userId?: string, dateRange?: { start: Date; end: Date }) {
  const match: any = {};
  if (userId) match.userId = userId;
  if (dateRange) {
    match.createdAt = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        successfulPayments: { $sum: { $cond: [{ $eq: ['$status', 'succeeded'] }, 1, 0] } },
        totalTopupAmount: { $sum: '$topupAmount' },
        totalFeesCollected: { $sum: { $add: ['$processingFee', '$fixedFee'] } },
        totalChargedAmount: { $sum: '$totalChargedAmount' },
        averagePaymentAmount: { $avg: '$topupAmount' },
        currencies: { $addToSet: '$currency' }
      }
    }
  ]);
};

export const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', paymentSchema); 