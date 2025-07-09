import mongoose, { Document, Model, Schema } from 'mongoose';
import SmsMessage from './SmsMessage';
import User from './User';
import { Country } from './Country';

// SMS Billing interface for batch charging
export interface ISmsBilling {
  userId: mongoose.Types.ObjectId;
  
  // Billing period
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  
  // Aggregated SMS data
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  totalCost: number;
  currency: string;
  
  // Message breakdown by country/rate
  messageBreakdown: Array<{
    country: string;
    prefix: string;
    messageCount: number;
    rate: number;
    totalCost: number;
  }>;
  
  // Payment details
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  billingDate: Date;
  paidDate?: Date;
  failureReason?: string;
  
  // Integration with Sippy
  sippyTransactionId?: string;
  processedBy?: string;
  notes?: string;
  
  // Campaign context (for campaign billing)
  campaignId?: mongoose.Types.ObjectId;
  billingType: 'single' | 'campaign'; // Type of billing
  
  createdAt: Date;
  updatedAt: Date;
}

// SMS Billing document interface
export interface ISmsBillingDocument extends ISmsBilling, Document {
  id: string;
}

// SMS Billing model interface
export interface ISmsBillingModel extends Model<ISmsBillingDocument> {
  createBillingForPeriod(userId: string, startDate: Date, endDate: Date, billingType?: 'single' | 'campaign'): Promise<ISmsBillingDocument | null>;
  processPendingBillings(): Promise<void>;
}

// SMS Billing schema
const smsBillingSchema = new Schema<ISmsBillingDocument, ISmsBillingModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    
    // Billing period
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
    
    // Aggregated SMS data
    totalMessages: {
      type: Number,
      required: [true, 'Total messages is required'],
      min: [0, 'Total messages cannot be negative'],
    },
    successfulMessages: {
      type: Number,
      required: [true, 'Successful messages is required'],
      min: [0, 'Successful messages cannot be negative'],
    },
    failedMessages: {
      type: Number,
      required: [true, 'Failed messages is required'],
      min: [0, 'Failed messages cannot be negative'],
    },
    totalCost: {
      type: Number,
      required: [true, 'Total cost is required'],
      min: [0, 'Total cost cannot be negative'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      default: 'USD',
      maxlength: [3, 'Currency code cannot exceed 3 characters'],
    },
    
    // Message breakdown
    messageBreakdown: [{
      country: {
        type: String,
        required: true,
        trim: true,
      },
      prefix: {
        type: String,
        required: true,
        trim: true,
      },
      messageCount: {
        type: Number,
        required: true,
        min: 0,
      },
      rate: {
        type: Number,
        required: true,
        min: 0,
      },
      totalCost: {
        type: Number,
        required: true,
        min: 0,
      },
    }],
    
    // Payment details
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'cancelled'],
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
    
    // Integration with Sippy
    sippyTransactionId: {
      type: String,
      trim: true,
      index: true,
    },
    processedBy: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    
    // Campaign context
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'SmsCampaign',
      sparse: true,
    },
    billingType: {
      type: String,
      enum: ['single', 'campaign'],
      default: 'single',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'sms_billing',
  }
);

// Add compound indexes for better query performance
smsBillingSchema.index({ userId: 1, status: 1, billingDate: -1 });
smsBillingSchema.index({ userId: 1, billingPeriodStart: 1, billingPeriodEnd: 1 });
smsBillingSchema.index({ status: 1, billingDate: 1 });

// Static method to create billing for a period
smsBillingSchema.static('createBillingForPeriod', async function createBillingForPeriod(
  userId: string,
  startDate: Date,
  endDate: Date,
  billingType: 'single' | 'campaign' = 'single'
) {
  
  // Prepare match condition based on billing type
  const matchCondition: any = {
    userId: new mongoose.Types.ObjectId(userId),
    sentAt: { $gte: startDate, $lt: endDate },
    status: { $in: ['sent', 'delivered'] }
  };

  // Filter by message type if specified
  if (billingType === 'single') {
    matchCondition.messageType = 'single';
  } else if (billingType === 'campaign') {
    matchCondition.messageType = 'campaign';
  }
  
  // Get aggregated SMS data for the period
  const smsStats = await SmsMessage.aggregate([
    {
      $match: matchCondition
    },
    {
      $lookup: {
        from: 'countries',
        localField: 'prefix',
        foreignField: 'phoneCode',
        as: 'countryInfo'
      }
    },
    {
      $group: {
        _id: {
          prefix: '$prefix',
          cost: '$cost'
        },
        messageCount: { $sum: 1 },
        totalCost: { $sum: '$cost' },
        rate: { $first: '$cost' },
        countryInfo: { $first: '$countryInfo' }
      }
    }
  ]);
  
  if (smsStats.length === 0) {
    return null; // No messages to bill
  }
  
  // Calculate totals
  const totalMessages = smsStats.reduce((sum, stat) => sum + stat.messageCount, 0);
  const totalCost = smsStats.reduce((sum, stat) => sum + stat.totalCost, 0);
  
  // Get failed messages count
  const failedStats = await SmsMessage.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        $or: [
          { sentAt: { $gte: startDate, $lt: endDate } },
          { failedAt: { $gte: startDate, $lt: endDate } },
          { 
            createdAt: { $gte: startDate, $lt: endDate },
            status: { $in: ['failed', 'undelivered'] },
            sentAt: { $exists: false },
            failedAt: { $exists: false }
          }
        ],
        status: { $in: ['failed', 'undelivered'] }
      }
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 }
      }
    }
  ]);
  
  const failedMessages = failedStats[0]?.count || 0;
  
  // Create message breakdown
  const messageBreakdown = smsStats.map(stat => ({
    country: stat.countryInfo?.[0]?.name || 'Unknown',
    prefix: stat._id.prefix,
    messageCount: stat.messageCount,
    rate: stat.rate,
    totalCost: stat.totalCost
  }));
  
  // Create billing record
  const billing = new this({
    userId: new mongoose.Types.ObjectId(userId),
    billingPeriodStart: startDate,
    billingPeriodEnd: endDate,
    totalMessages,
    successfulMessages: totalMessages,
    failedMessages,
    totalCost,
    currency: 'EUR', // Default currency, will be updated based on account settings
    messageBreakdown,
    billingType,
    status: 'pending',
    billingDate: new Date(),
    notes: `SMS ${billingType} billing for period ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
  });
  
  await billing.save();
  return billing;
});

// Static method to process pending billings
smsBillingSchema.static('processPendingBillings', async function processPendingBillings() {
  const { getSippyApiCredentials } = await import('@/lib/sippyClientConfig');
  const { SippyClient } = await import('@/lib/sippyClient');
  
  const pendingBillings = await this.find({ status: 'pending' })
    .populate('userId')
    .limit(50); // Process in batches
  
  if (pendingBillings.length === 0) {
    console.log('No pending SMS billings to process');
    return;
  }
  
  // Get Sippy API credentials
  const credentials = await getSippyApiCredentials();
  if (!credentials) {
    console.error('❌ Sippy API not configured for SMS billing');
    return;
  }
  
  const sippyClient = new SippyClient(credentials);
  
  for (const billing of pendingBillings) {
    try {
      const user = billing.userId as any;
      
      if (!user.sippyAccountId) {
        console.log(`⚠️ User ${user.email} has no Sippy account ID, skipping SMS billing`);
        continue;
      }
      
      // Skip if total cost is zero
      if (billing.totalCost <= 0) {
        billing.status = 'paid';
        billing.paidDate = new Date();
        billing.notes = (billing.notes || '') + ' (Zero cost - marked as paid)';
        await billing.save();
        continue;
      }
      
      // Get the account's default currency to ensure compatibility
      let accountCurrency = billing.currency;
      try {
        const accountInfo = await sippyClient.getAccountInfo({ 
          i_account: user.sippyAccountId 
        });
        
        if (accountInfo?.payment_currency) {
          accountCurrency = accountInfo.payment_currency;
        }
      } catch (error) {
        console.log(`Failed to get account info for ${user.email}, using billing currency: ${billing.currency}`);
      }

      // Prepare billing note
      const paymentNotes = `SMS usage billing: ${billing.totalMessages} messages (${billing.billingPeriodStart.toISOString().split('T')[0]} to ${billing.billingPeriodEnd.toISOString().split('T')[0]})`;
      
      console.log(`💸 Processing SMS billing for ${user.email}: ${billing.totalCost} ${accountCurrency} for ${billing.totalMessages} messages`);
      
      // Process the charge using Sippy accountDebit
      const debitResult = await sippyClient.accountDebit({
        i_account: user.sippyAccountId,
        amount: billing.totalCost,
        currency: accountCurrency,
        payment_notes: paymentNotes,
      });
      
      // Update billing record based on result
      const sippyResult = debitResult as any;
      const resultValue = sippyResult.result;
      const txResult = sippyResult.tx_result;
      const hasError = (debitResult.error && debitResult.error.trim() !== '') || 
                      (debitResult.tx_error && debitResult.tx_error.trim() !== '');
      const hasTxId = debitResult.tx_id || debitResult.payment_id || debitResult.i_payment;
      
      // Determine success based on multiple criteria
      const isSuccess = (
        resultValue === 'success' || 
        resultValue === '1' ||
        resultValue === 1 ||
        resultValue === 'OK' ||
        resultValue === 'ok' ||
        txResult === 1 ||
        txResult === '1' ||
        (hasTxId && !hasError) ||
        (resultValue && !hasError && resultValue !== 'failed' && resultValue !== 'error')
      );
      
      if (isSuccess) {
        billing.status = 'paid';
        billing.paidDate = new Date();
        billing.sippyTransactionId = debitResult.tx_id || debitResult.payment_id || debitResult.i_payment?.toString() || `sms_debit_${Date.now()}`;
        billing.processedBy = 'automated_sms_billing';
        
        console.log(`✅ SMS billing processed successfully for ${user.email}`);
      } else {
        const failureReason = debitResult.error || debitResult.tx_error || `Unexpected result: ${JSON.stringify(resultValue)}`;
        billing.status = 'failed';
        billing.failureReason = failureReason;
        billing.processedBy = 'automated_sms_billing';
        
        console.error(`❌ SMS billing failed for ${user.email}:`, failureReason);
      }
      
      await billing.save();
      
    } catch (error) {
      console.error(`❌ Error processing SMS billing for user ${billing.userId}:`, error);
      
      billing.status = 'failed';
      billing.failureReason = error instanceof Error ? error.message : 'SMS billing processing error';
      billing.processedBy = 'automated_sms_billing';
      await billing.save();
    }
  }
  
  console.log(`📊 Processed ${pendingBillings.length} SMS billing records`);
});

const SmsBilling = mongoose.model<ISmsBillingDocument, ISmsBillingModel>('SmsBilling', smsBillingSchema);

export default SmsBilling; 