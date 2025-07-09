import mongoose, { Document, Model, Schema } from 'mongoose';

// Phone Number Billing interface
export interface IPhoneNumberBilling {
  phoneNumberId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  assignmentId: mongoose.Types.ObjectId;
  
  // Billing details
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  amount: number;
  currency: string;
  
  // Payment details
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  billingDate: Date;
  paidDate?: Date;
  failureReason?: string;
  
  // Transaction details
  transactionType: 'monthly_fee' | 'setup_fee' | 'prorated_fee' | 'refund';
  paymentType: 'debit' | 'credit'; // For Sippy integration: debit = charge, credit = refund
  prorationDays?: number;
  
  // Integration with payments
  paymentId?: mongoose.Types.ObjectId;
  sippyTransactionId?: string;
  
  // Admin fields
  processedBy?: string;
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// Phone Number Billing document interface
export interface IPhoneNumberBillingDocument extends IPhoneNumberBilling, Document {
  _id: mongoose.Types.ObjectId;
}

// Phone Number Billing model interface
export interface IPhoneNumberBillingModel extends Model<IPhoneNumberBillingDocument> {}

// Phone Number Billing schema
const phoneNumberBillingSchema = new Schema<IPhoneNumberBillingDocument, IPhoneNumberBillingModel>(
  {
    phoneNumberId: {
      type: Schema.Types.ObjectId,
      ref: 'PhoneNumber',
      required: [true, 'Phone number ID is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: 'PhoneNumberAssignment',
      required: [true, 'Assignment ID is required'],
      index: true,
    },
    
    // Billing details
    billingPeriodStart: {
      type: Date,
      required: [true, 'Billing period start is required'],
      index: true,
    },
    billingPeriodEnd: {
      type: Date,
      required: [true, 'Billing period end is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      uppercase: true,
      trim: true,
      minlength: [3, 'Currency must be 3 characters'],
      maxlength: [3, 'Currency must be 3 characters'],
      default: 'EUR',
    },
    
    // Payment details
    status: {
      type: String,
      required: true,
      enum: {
        values: ['pending', 'paid', 'failed', 'cancelled', 'refunded'],
        message: 'Invalid status',
      },
      default: 'pending',
      index: true,
    },
    billingDate: {
      type: Date,
      required: [true, 'Billing date is required'],
      index: true,
    },
    paidDate: {
      type: Date,
      index: true,
    },
    failureReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Failure reason cannot exceed 500 characters'],
    },
    
    // Transaction details
    transactionType: {
      type: String,
      required: [true, 'Transaction type is required'],
      enum: {
        values: ['monthly_fee', 'setup_fee', 'prorated_fee', 'refund'],
        message: 'Invalid transaction type',
      },
      index: true,
    },
    // Credit/Debit classification for Sippy integration
    paymentType: {
      type: String,
      required: [true, 'Payment type is required'],
      enum: {
        values: ['debit', 'credit'],
        message: 'Invalid payment type',
      },
      default: 'debit', // Most transactions are debits (charges)
      index: true,
    },
    prorationDays: {
      type: Number,
      min: [0, 'Proration days cannot be negative'],
      max: [31, 'Proration days cannot exceed 31'],
    },
    
    // Integration with payments
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      index: true,
    },
    sippyTransactionId: {
      type: String,
      trim: true,
      index: true,
    },
    
    // Admin fields
    processedBy: {
      type: String,
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
    collection: 'phone_number_billing',
  }
);

// Add compound indexes for better query performance
phoneNumberBillingSchema.index({ userId: 1, status: 1, billingDate: -1 });
phoneNumberBillingSchema.index({ phoneNumberId: 1, billingPeriodStart: 1, billingPeriodEnd: 1 });
phoneNumberBillingSchema.index({ assignmentId: 1, transactionType: 1 });
phoneNumberBillingSchema.index({ billingDate: 1, status: 1 });
phoneNumberBillingSchema.index({ status: 1, createdAt: -1 });

// Export the model
const PhoneNumberBilling: IPhoneNumberBillingModel = mongoose.models.PhoneNumberBilling || mongoose.model<IPhoneNumberBillingDocument, IPhoneNumberBillingModel>('PhoneNumberBilling', phoneNumberBillingSchema);
export default PhoneNumberBilling; 