import mongoose from 'mongoose';

export interface IPaymentGateway {
  _id: string;
  name: string;
  provider: 'stripe' | 'paypal' | 'square' | 'razorpay';
  isActive: boolean;
  configuration: {
    // Stripe configuration
    publishableKey?: string;
    secretKey?: string;
    webhookSecret?: string;
    // PayPal configuration
    clientId?: string;
    clientSecret?: string;
    // Square configuration
    applicationId?: string;
    accessToken?: string;
    // Razorpay configuration
    keyId?: string;
    keySecret?: string;
  };
  settings: {
    allowedCurrencies: string[];
    minimumAmount: number;
    maximumAmount: number;
    processingFee: number; // percentage
    fixedFee: number; // fixed amount
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

const PaymentGatewaySchema = new mongoose.Schema<IPaymentGateway>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  provider: {
    type: String,
    required: true,
    enum: ['stripe', 'paypal', 'square', 'razorpay']
  },
  isActive: {
    type: Boolean,
    default: false
  },
  configuration: {
    // Stripe
    publishableKey: String,
    secretKey: String,
    webhookSecret: String,
    // PayPal
    clientId: String,
    clientSecret: String,
    // Square
    applicationId: String,
    accessToken: String,
    // Razorpay
    keyId: String,
    keySecret: String
  },
  settings: {
    allowedCurrencies: {
      type: [String],
      default: ['USD']
    },
    minimumAmount: {
      type: Number,
      default: 10
    },
    maximumAmount: {
      type: Number,
      default: 10000
    },
    processingFee: {
      type: Number,
      default: 2.9 // 2.9%
    },
    fixedFee: {
      type: Number,
      default: 0.30 // $0.30
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Ensure only one active gateway per provider
PaymentGatewaySchema.index({ provider: 1, isActive: 1 }, { 
  unique: true, 
  partialFilterExpression: { isActive: true } 
});

export const PaymentGateway = mongoose.models.PaymentGateway || mongoose.model<IPaymentGateway>('PaymentGateway', PaymentGatewaySchema); 