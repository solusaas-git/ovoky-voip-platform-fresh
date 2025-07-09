import { connectToDatabase } from '@/lib/db';
import SmsBillingSettings from '@/models/SmsBillingSettings';
import SmsBilling from '@/models/SmsBilling';
import SmsMessage from '@/models/SmsMessage';
import SmsCampaign from '@/models/SmsCampaign';
import User from '@/models/User';
import mongoose from 'mongoose';

export interface SMSBillingContext {
  userId: string;
  messageCount: number;
  totalCost: number;
  country?: string;
  prefix?: string;
  provider?: string;
  campaignId?: string;
  messageType: 'single' | 'campaign';
}

export interface BillingCheckResult {
  shouldCreateBilling: boolean;
  shouldBlock: boolean;
  reason?: string;
  currentUsage?: {
    totalCost: number;
    totalMessages: number;
    pendingBillings: number;
  };
}

export class SMSBillingService {
  /**
   * Check if billing should be triggered for a user before sending SMS
   */
  static async checkBillingBeforeSend(context: SMSBillingContext): Promise<BillingCheckResult> {
    try {
      await connectToDatabase();

      // Get user's billing settings (with fallback to global)
      const settings = await SmsBillingSettings.getSettingsForUser(context.userId);
      
      if (!settings || !settings.isActive) {
        return { shouldCreateBilling: false, shouldBlock: false };
      }

      // For campaign messages, never trigger billing during sending
      // Billing will be handled when campaign completes
      if (context.messageType === 'campaign') {
        return { shouldCreateBilling: false, shouldBlock: false };
      }

      // Get current usage for single messages only (exclude campaign messages)
      const currentUsage = await this.getCurrentUsageForSingleMessages(context.userId);
      
      // Check if we should block based on pending billings
      if (!settings.autoProcessing && currentUsage.pendingBillings > 0) {
        return {
          shouldCreateBilling: false,
          shouldBlock: true,
          reason: 'User has pending billings that require manual approval',
          currentUsage
        };
      }

      // Check threshold-based billing for single messages
      if (settings.billingFrequency === 'threshold') {
        const newTotalCost = currentUsage.totalCost + context.totalCost;
        const newTotalMessages = currentUsage.totalMessages + context.messageCount;

        if (newTotalCost >= settings.maxAmount || newTotalMessages >= settings.maxMessages) {
          return {
            shouldCreateBilling: true,
            shouldBlock: false,
            reason: `Threshold reached: $${newTotalCost.toFixed(2)}/${settings.maxAmount} or ${newTotalMessages}/${settings.maxMessages} messages`,
            currentUsage: {
              ...currentUsage,
              totalCost: newTotalCost,
              totalMessages: newTotalMessages
            }
          };
        }
      }

      return { 
        shouldCreateBilling: false, 
        shouldBlock: false,
        currentUsage
      };

    } catch (error) {
      console.error('Error checking billing before send:', error);
      // Don't block SMS on billing check errors
      return { shouldCreateBilling: false, shouldBlock: false };
    }
  }

  /**
   * Process billing after SMS is sent (for threshold-based billing)
   */
  static async processBillingAfterSend(context: SMSBillingContext): Promise<void> {
    try {
      // Only process billing for single messages
      if (context.messageType === 'campaign') {
        return; // Campaign billing is handled separately
      }

      const checkResult = await this.checkBillingBeforeSend(context);
      
      if (checkResult.shouldCreateBilling) {
        await this.createBillingRecord(context.userId, 'threshold', 'single');
      }
    } catch (error) {
      console.error('Error processing billing after send:', error);
      // Don't throw error to avoid breaking SMS flow
    }
  }

  /**
   * Process billing for completed campaign
   */
  static async processCampaignBilling(campaignId: string): Promise<void> {
    try {
      await connectToDatabase();

      const campaign = await SmsCampaign.findById(campaignId);
      if (!campaign || campaign.status !== 'completed') {
        console.log(`⏭️ Campaign ${campaignId} not ready for billing (status: ${campaign?.status})`);
        return;
      }

      // Check if campaign already has billing
      const existingBilling = await SmsBilling.findOne({
        userId: campaign.userId,
        'campaignId': new mongoose.Types.ObjectId(campaignId)
      });

      if (existingBilling) {
        console.log(`💳 Campaign ${campaignId} already has billing record`);
        return;
      }

      // Get user's billing settings
      const settings = await SmsBillingSettings.getSettingsForUser(campaign.userId.toString());
      
      if (!settings || !settings.isActive) {
        console.log(`⚠️ No active billing settings for user ${campaign.userId}`);
        return;
      }

      // Create billing for campaign's delivered messages only
      await this.createCampaignBillingRecord(campaignId);
      
      console.log(`✅ Created billing for completed campaign ${campaignId}`);

    } catch (error) {
      console.error('Error processing campaign billing:', error);
    }
  }

  /**
   * Get current usage for single messages only (excluding campaigns)
   */
  private static async getCurrentUsageForSingleMessages(userId: string): Promise<{
    totalCost: number;
    totalMessages: number;
    pendingBillings: number;
  }> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Get last successful billing for single messages
    const lastBilling = await SmsBilling.findOne({
      userId: userObjectId,
      status: { $in: ['paid', 'cancelled'] },
      'billingType': 'single' // Only consider single message billings
    }).sort({ billingPeriodEnd: -1 });

    const startDate = lastBilling 
      ? lastBilling.billingPeriodEnd 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    // Get successful single messages since last billing
    const singleMessages = await SmsMessage.find({
      userId: userObjectId,
      messageType: 'single', // Only single messages
      status: { $in: ['sent', 'delivered'] },
      $or: [
        { sentAt: { $gte: startDate } },
        { deliveredAt: { $gte: startDate } },
        { createdAt: { $gte: startDate } }
      ]
    });

    const totalCost = singleMessages.reduce((sum, msg) => sum + msg.cost, 0);
    const totalMessages = singleMessages.length;

    // Count pending billings for single messages
    const pendingBillings = await SmsBilling.countDocuments({
      userId: userObjectId,
      status: 'pending',
      'billingType': 'single'
    });

    return {
      totalCost,
      totalMessages,
      pendingBillings
    };
  }

  /**
   * Get current usage for a user (unbilled messages/costs)
   */
  static async getCurrentUsage(userId: string): Promise<{
    totalCost: number;
    totalMessages: number;
    pendingBillings: number;
  }> {
    await connectToDatabase();

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Get the last billing date for this user
    const lastBilling = await SmsBilling.findOne({
      userId: userObjectId,
      status: { $in: ['paid', 'cancelled'] }
    }).sort({ billingPeriodEnd: -1 });

    const startDate = lastBilling ? lastBilling.billingPeriodEnd : new Date('2000-01-01');

    // Aggregate unbilled SMS usage
    const usage = await SmsMessage.aggregate([
      {
        $match: {
          userId: userObjectId,
          createdAt: { $gt: startDate },
          cost: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$cost' },
          totalMessages: { $sum: 1 }
        }
      }
    ]);

    // Count pending billings
    const pendingBillings = await SmsBilling.countDocuments({
      userId: userObjectId,
      status: 'pending'
    });

    return {
      totalCost: usage[0]?.totalCost || 0,
      totalMessages: usage[0]?.totalMessages || 0,
      pendingBillings
    };
  }

  /**
   * Create a billing record for a user
   */
  static async createBillingRecord(
    userId: string, 
    triggerType: 'daily' | 'weekly' | 'monthly' | 'threshold',
    billingType: 'single' | 'campaign' = 'single'
  ): Promise<string | null> {
    try {
      await connectToDatabase();

      const userObjectId = new mongoose.Types.ObjectId(userId);
      const currentDate = new Date();

      // Calculate billing period based on trigger type
      let billingPeriodStart: Date;
      let billingPeriodEnd: Date = currentDate;

      switch (triggerType) {
        case 'daily':
          billingPeriodStart = new Date(currentDate);
          billingPeriodStart.setDate(billingPeriodStart.getDate() - 1);
          break;
        case 'weekly':
          billingPeriodStart = new Date(currentDate);
          billingPeriodStart.setDate(billingPeriodStart.getDate() - 7);
          break;
        case 'monthly':
          billingPeriodStart = new Date(currentDate);
          billingPeriodStart.setMonth(billingPeriodStart.getMonth() - 1);
          break;
        case 'threshold':
          // For threshold billing, get last billing or start of current period
          const lastBilling = await SmsBilling.findOne({
            userId: userObjectId,
            status: { $in: ['paid', 'cancelled'] },
            'billingType': billingType
          }).sort({ billingPeriodEnd: -1 });
          
          billingPeriodStart = lastBilling ? lastBilling.billingPeriodEnd : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          billingPeriodStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
      }

      // Use the SmsBilling model's createBillingForPeriod method with message type filter
      const billing = await SmsBilling.createBillingForPeriod(
        userId,
        billingPeriodStart,
        billingPeriodEnd,
        billingType // Pass billing type to filter messages
      );

      if (billing) {
        console.log(`✅ Created ${billingType} billing record: ${billing.id} for user ${userId}`);
        return billing.id;
      }

      return null;
    } catch (error) {
      console.error('Error creating billing record:', error);
      return null;
    }
  }

  /**
   * Create billing record specifically for a completed campaign
   */
  static async createCampaignBillingRecord(campaignId: string): Promise<string | null> {
    try {
      await connectToDatabase();

      const campaign = await SmsCampaign.findById(campaignId);
      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      // Get all delivered messages for this campaign
      const deliveredMessages = await SmsMessage.find({
        campaignId: new mongoose.Types.ObjectId(campaignId),
        status: { $in: ['sent', 'delivered'] }
      });

      if (deliveredMessages.length === 0) {
        console.log(`⚠️ No delivered messages found for campaign ${campaignId}`);
        return null;
      }

      // Calculate totals
      const totalCost = deliveredMessages.reduce((sum, msg) => sum + msg.cost, 0);
      const totalMessages = deliveredMessages.length;

      // Create billing record
      const billing = new SmsBilling({
        userId: campaign.userId,
        billingPeriodStart: campaign.startedAt || campaign.createdAt,
        billingPeriodEnd: campaign.completedAt || new Date(),
        totalMessages,
        successfulMessages: totalMessages,
        failedMessages: 0,
        totalCost,
        currency: 'EUR', // Will be updated based on account settings
        campaignId: new mongoose.Types.ObjectId(campaignId),
        billingType: 'campaign',
        status: 'pending',
        billingDate: new Date(),
        notes: `Campaign billing for "${campaign.name}" (${totalMessages} delivered messages)`,
        messageBreakdown: [] // Will be populated by pre-save hook
      });

      await billing.save();
      
      console.log(`✅ Created campaign billing: ${billing.id} for campaign ${campaignId} ($${totalCost})`);
      return billing.id;

    } catch (error) {
      console.error('Error creating campaign billing record:', error);
      return null;
    }
  }

  /**
   * Auto-process a billing record via Sippy
   */
  static async autoProcessBilling(billingId: string): Promise<boolean> {
    try {
      // Call the billing API to process the billing
      const response = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/sms/billing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ billingId }),
      });

      if (response.ok) {
        console.log(`✅ Auto-processed billing ${billingId}`);
        return true;
      } else {
        console.error(`❌ Failed to auto-process billing ${billingId}:`, await response.text());
        return false;
      }
    } catch (error) {
      console.error('Error auto-processing billing:', error);
      return false;
    }
  }

  /**
   * Check if user should be notified about billing
   */
  static async checkNotificationThreshold(userId: string, currentCost: number): Promise<boolean> {
    try {
      const settings = await SmsBillingSettings.getSettingsForUser(userId);
      
      if (!settings?.notificationEnabled) {
        return false;
      }

      return currentCost >= settings.notificationThreshold;
    } catch (error) {
      console.error('Error checking notification threshold:', error);
      return false;
    }
  }

  /**
   * Get billing summary for a user
   */
  static async getUserBillingSummary(userId: string): Promise<{
    currentUsage: { totalCost: number; totalMessages: number };
    pendingBillings: number;
    lastBillingDate?: Date;
    nextBillingDate?: Date;
    settings: any;
  }> {
    try {
      await connectToDatabase();

      const currentUsage = await this.getCurrentUsage(userId);
      const settings = await SmsBillingSettings.getSettingsForUser(userId);
      
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const lastBilling = await SmsBilling.findOne({
        userId: userObjectId
      }).sort({ createdAt: -1 });

      // Calculate next billing date based on frequency
      let nextBillingDate: Date | undefined;
      if (settings && settings.billingFrequency !== 'threshold') {
        const now = new Date();
        switch (settings.billingFrequency) {
          case 'daily':
            nextBillingDate = new Date(now);
            nextBillingDate.setDate(nextBillingDate.getDate() + 1);
            break;
          case 'weekly':
            nextBillingDate = new Date(now);
            nextBillingDate.setDate(nextBillingDate.getDate() + (7 - now.getDay() + (settings.billingDayOfWeek || 1)) % 7);
            break;
          case 'monthly':
            nextBillingDate = new Date(now.getFullYear(), now.getMonth() + 1, settings.billingDayOfMonth || 1);
            break;
        }
      }

      return {
        currentUsage,
        pendingBillings: currentUsage.pendingBillings,
        lastBillingDate: lastBilling?.createdAt,
        nextBillingDate,
        settings
      };

    } catch (error) {
      console.error('Error getting user billing summary:', error);
      throw error;
    }
  }
} 