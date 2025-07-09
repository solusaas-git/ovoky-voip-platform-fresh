import { connectToDatabase } from '@/lib/db';
import SmsMessage from '@/models/SmsMessage';
import SmsCampaign from '@/models/SmsCampaign';
import SmsContact from '@/models/SmsContact';
import SmsProvider from '@/models/SmsGateway';
import SmsUserProviderAssignment from '@/models/SmsUserProviderAssignment';
import SmsBlacklistedNumber from '@/models/SmsBlacklistedNumber';
import SmsRate from '@/models/SmsRate';
import RateDeckAssignment from '@/models/RateDeckAssignment';
import SmsSenderId from '@/models/SmsSenderId';
import mongoose from 'mongoose';

interface QueuedMessage {
  id: string;
  userId: string;
  campaignId?: string;
  to: string;
  content: string;
  senderId?: string;
  providerId: string;
  priority: number;
  retryCount: number;
  maxRetries: number;
  scheduledAt: Date;
  rateDeckId: string;
  cost: number;
  prefix: string;
}

interface ProviderRateTracker {
  providerId: string;
  messagesThisSecond: number;
  messagesThisMinute: number;
  messagesThisHour: number;
  lastSecondReset: number;
  lastMinuteReset: number;
  lastHourReset: number;
  rateLimit: {
    messagesPerSecond: number;
    messagesPerMinute: number;
    messagesPerHour: number;
  };
}

export class SmsQueueService {
  private static instance: SmsQueueService;
  private isProcessing = false;
  private providerTrackers = new Map<string, ProviderRateTracker>();
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 25; // Reduced batch size for better control
  private readonly PROCESSING_INTERVAL = 2000; // Slower processing to prevent race conditions
  private readonly MAX_CONCURRENT_PROVIDERS = 2; // Reduced concurrency
  
  // Enhanced tracking for duplicate prevention
  private processedMessages = new Set<string>(); // Track processed message IDs
  private campaignLocks = new Map<string, boolean>(); // Campaign-level locks

  private constructor() {}

  public static getInstance(): SmsQueueService {
    if (!SmsQueueService.instance) {
      SmsQueueService.instance = new SmsQueueService();
    }
    return SmsQueueService.instance;
  }

  /**
   * Initialize the queue processing system
   */
  public async initialize(): Promise<void> {
    await connectToDatabase();
    await this.loadProviderRateLimits();
    
    // Start processing queue
    this.startProcessing();
    
    // Start periodic cleanup of processed tracking (every 5 minutes)
    setInterval(() => {
      this.cleanupProcessedTracking();
    }, 5 * 60 * 1000);
    
    // Start periodic campaign counter synchronization (every 10 minutes)
    setInterval(() => {
      this.synchronizeCampaignCounters();
    }, 10 * 60 * 1000);
    
    console.log('✅ SMS Queue Service initialized with counter synchronization');
  }

  /**
   * Load rate limits for all providers (including inactive ones to handle queued messages)
   */
  private async loadProviderRateLimits(): Promise<void> {
    await connectToDatabase();
    // Load ALL providers, not just active ones, to handle existing queued messages
    const providers = await SmsProvider.find({});
    
    for (const provider of providers) {
      this.providerTrackers.set(provider._id.toString(), {
        providerId: provider._id.toString(),
        messagesThisSecond: 0,
        messagesThisMinute: 0,
        messagesThisHour: 0,
        lastSecondReset: Date.now(),
        lastMinuteReset: Date.now(),
        lastHourReset: Date.now(),
        rateLimit: {
          // Use conservative limits for inactive providers
          messagesPerSecond: provider.isActive ? (provider.rateLimit?.messagesPerSecond || 5) : 1,
          messagesPerMinute: provider.isActive ? (provider.rateLimit?.messagesPerMinute || 100) : 10,
          messagesPerHour: provider.isActive ? (provider.rateLimit?.messagesPerHour || 1000) : 50
        }
      });
    }
    
    console.log(`📊 Loaded rate limits for ${providers.length} providers (${providers.filter(p => p.isActive).length} active, ${providers.filter(p => !p.isActive).length} inactive)`);
  }

  /**
   * Queue a campaign for processing - PHASE 1: CREATE MESSAGES ONLY
   */
  public async queueCampaign(campaignId: string): Promise<void> {
    try {
      await connectToDatabase();
      
      const campaign = await SmsCampaign.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.status !== 'sending') {
        throw new Error('Campaign must be in sending status');
      }

      // Check if campaign is already locked (being processed)
      if (this.campaignLocks.get(campaignId)) {
        console.log(`⚠️ Campaign ${campaignId} is already being processed`);
        return;
      }

      // Lock campaign during processing
      this.campaignLocks.set(campaignId, true);

      try {
        // Get contacts in batches to avoid memory issues
        const contactCount = await SmsContact.countDocuments({ 
          contactListId: campaign.contactListId 
        });

        console.log(`📋 Queueing campaign ${campaignId} with ${contactCount} contacts`);

        // Process contacts in smaller batches
        const batchSize = 500; // Smaller batch size
        let processed = 0;

        while (processed < contactCount) {
          const contacts = await SmsContact.find({ 
            contactListId: campaign.contactListId 
          })
          .skip(processed)
          .limit(batchSize)
          .lean();

          await this.createCampaignMessages(campaign, contacts);
          processed += contacts.length;
          
          console.log(`📦 Created messages for batch: ${processed}/${contactCount} contacts`);
        }

        console.log(`✅ Campaign ${campaignId} messages created and queued`);
      } finally {
        // Always unlock campaign
        this.campaignLocks.delete(campaignId);
      }
    } catch (error) {
      console.error(`❌ Error queueing campaign ${campaignId}:`, error);
      this.campaignLocks.delete(campaignId);
      throw error;
    }
  }

  /**
   * Create campaign messages - SEPARATE FROM SENDING
   */
  private async createCampaignMessages(campaign: any, contacts: any[]): Promise<void> {
    const userId = campaign.userId.toString();
    
    // Get user's rate deck assignment
    const rateDeckAssignment = await RateDeckAssignment.findOne({
      userId: campaign.userId,
      rateDeckType: 'sms',
      isActive: true
    });

    if (!rateDeckAssignment) {
      throw new Error('No SMS rate deck assigned to user');
    }

    // Get rate for destination country - STRICT VALIDATION
    const matchedRate = await SmsRate.findOne({
      rateDeckId: rateDeckAssignment.rateDeckId,
      country: campaign.country
    });

    if (!matchedRate) {
      throw new Error(`No rate found for campaign country: ${campaign.country}`);
    }

    // Validate provider assignment
    const providerAssignments = await SmsUserProviderAssignment.findActiveByUserId(userId);
    if (providerAssignments.length === 0) {
      throw new Error('No SMS providers assigned to user');
    }

    const campaignProviderAssignment = providerAssignments.find(assignment => 
      assignment.providerId && 
      assignment.providerId._id.toString() === campaign.providerId.toString() &&
      (assignment.providerId as any).isActive
    );

    if (!campaignProviderAssignment) {
      throw new Error(`Campaign provider ${campaign.providerId} is not assigned to user or is inactive`);
    }

    // Get the provider to check supported countries
    const provider = await SmsProvider.findById(campaign.providerId);
    if (!provider) {
      throw new Error(`Provider ${campaign.providerId} not found`);
    }

    // Validate provider supports campaign country
    if (provider.supportedCountries && provider.supportedCountries.length > 0) {
      // Both campaign and provider use country names now - direct comparison
      if (!provider.supportedCountries.includes(campaign.country)) {
        throw new Error(`Provider ${provider.name} does not support country: ${campaign.country}`);
      }
      
      console.log(`✅ Provider ${provider.name} supports ${campaign.country}`);
    }

    const messagesToCreate: any[] = [];
    let validContacts = 0;
    let invalidContacts = 0;

    for (const contact of contacts) {
      // STRICT COUNTRY PREFIX VALIDATION
      const isValidPrefix = this.validateCountryPrefix(contact.phoneNumber, campaign.country, matchedRate.prefix);
      
      if (!isValidPrefix) {
        // Process template variables with contact data even for failed messages
        const processedMessage = this.processTemplateVariables(campaign.message, contact);
        
        // Create failed message record for invalid country prefix
        const failedMessage = new SmsMessage({
          userId: campaign.userId,
          campaignId: campaign._id,
          to: contact.phoneNumber,
          content: processedMessage,
          from: campaign.senderId,
          providerId: campaign.providerId,
          cost: 0,
          currency: 'USD',
          rateDeckId: rateDeckAssignment.rateDeckId,
          messageType: 'campaign',
          status: 'failed',
          errorMessage: `Country not supported by campaign. Campaign restricted to ${campaign.country} (prefix: ${matchedRate.prefix})`,
          failedAt: new Date()
        });
        
        await failedMessage.save();
        invalidContacts++;
        continue;
      }

      // Check if blacklisted
      const isBlacklisted = await SmsBlacklistedNumber.isBlacklisted(
        userId, 
        contact.phoneNumber
      );

      if (isBlacklisted) {
        // Process template variables with contact data even for blocked messages
        const processedMessage = this.processTemplateVariables(campaign.message, contact);
        
        // Create blocked message record
        const blockedMessage = new SmsMessage({
          userId: campaign.userId,
          campaignId: campaign._id,
          to: contact.phoneNumber,
          content: processedMessage,
          from: campaign.senderId,
          providerId: campaign.providerId,
          cost: 0,
          currency: 'USD',
          rateDeckId: rateDeckAssignment.rateDeckId,
          messageType: 'campaign',
          status: 'blocked',
          errorMessage: 'Phone number is blacklisted',
          failedAt: new Date()
        });
        
        await blockedMessage.save();
        invalidContacts++;
        continue;
      }

      // Process template variables with contact data
      const processedMessage = this.processTemplateVariables(campaign.message, contact);

      // Create valid message for sending
      const smsMessage = new SmsMessage({
        userId: campaign.userId,
        campaignId: campaign._id,
        to: contact.phoneNumber,
        content: processedMessage,
        from: campaign.senderId,
        providerId: campaign.providerId,
        cost: matchedRate.rate,
        currency: 'USD',
        rateDeckId: rateDeckAssignment.rateDeckId,
        prefix: matchedRate.prefix,
        messageType: 'campaign',
        status: 'queued',
        maxRetries: 3,
        retryCount: 0
      });

      await smsMessage.save();
      validContacts++;
    }

    console.log(`📤 Created ${validContacts} valid messages, ${invalidContacts} invalid/blocked for campaign ${campaign.name}`);
    
    // Update campaign statistics with actual failed/blocked counts
    await SmsCampaign.findByIdAndUpdate(campaign._id, {
      $inc: { 
        failedCount: invalidContacts
      }
    });
  }

  /**
   * Start the queue processing loop - PHASE 2: SEND MESSAGES
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.isProcessing = true;
    this.processingInterval = setInterval(async () => {
      try {
        await this.processQueue();
      } catch (error) {
        console.error('❌ Error processing SMS queue:', error);
      }
    }, this.PROCESSING_INTERVAL);

    console.log('🔄 SMS queue processing started');
  }

  /**
   * Process queued messages with enhanced duplicate prevention
   */
  private async processQueue(): Promise<void> {
    await connectToDatabase();

    // Get active campaigns only
    const activeCampaigns = await SmsCampaign.find({
      status: 'sending'
    }).select('_id').lean();

    const activeCampaignIds = activeCampaigns.map(c => c._id);

    // Get queued messages from active campaigns only
    // Add timeout barrier: fail messages stuck in retry for more than 5 minutes
    const retryTimeout = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    
    // First, handle stuck retry messages
    const stuckMessages = await SmsMessage.find({
      status: 'queued',
      retryCount: { $gte: 1 },
      updatedAt: { $lt: retryTimeout }
    });

    if (stuckMessages.length > 0) {
      console.log(`🚨 Found ${stuckMessages.length} stuck retry messages, force-failing them`);
      
      for (const stuckMessage of stuckMessages) {
        await SmsMessage.findByIdAndUpdate(stuckMessage._id, {
          status: 'failed',
          retryCount: stuckMessage.maxRetries,
          failedAt: new Date(),
          errorMessage: (stuckMessage.errorMessage || 'Unknown error') + ' (Retry timeout - stuck for >5min)'
        });
        
        // Update campaign counter if needed
        if (stuckMessage.campaignId) {
          await this.incrementCampaignCounter(stuckMessage.campaignId.toString(), 'failedCount', stuckMessage.cost || 0);
        }
        
        console.log(`❌ Force-failed stuck message ${stuckMessage._id} (${stuckMessage.errorMessage})`);
      }
    }

    // Add retry delay barrier: don't retry messages too quickly
    const retryDelay = new Date(Date.now() - 30 * 1000); // 30 seconds minimum between retries
    
    const queuedMessages = await SmsMessage.find({
      status: 'queued',
      retryCount: { $lt: 3 },
      $and: [
        {
          $or: [
            { campaignId: { $in: activeCampaignIds } },
            { campaignId: null } // Single SMS messages
          ]
        },
        {
          $or: [
            { retryCount: 0 }, // First attempt - no delay needed
            { updatedAt: { $lt: retryDelay } } // Retry attempts - must wait 30 seconds
          ]
        }
      ]
    })
    .sort({ createdAt: 1 })
    .limit(this.BATCH_SIZE)
    .lean();

    // Filter out messages that are already processed in memory
    const unprocessedMessages = queuedMessages.filter(message => {
      const messageId = message._id.toString();
      return !this.processedMessages.has(messageId);
    });

    if (unprocessedMessages.length === 0) {
      return;
    }

    console.log(`🔄 Processing ${unprocessedMessages.length} queued messages`);

    // Group messages by provider for efficient processing
    const messagesByProvider = new Map<string, any[]>();
    
    for (const message of unprocessedMessages) {
      if (!message.providerId) continue;
      
      const providerId = message.providerId.toString();
      if (!messagesByProvider.has(providerId)) {
        messagesByProvider.set(providerId, []);
      }
      messagesByProvider.get(providerId)!.push(message);
    }

    // Process messages for each provider with concurrency limits
    const processingPromises: Promise<void>[] = [];
    
    for (const [providerId, messages] of messagesByProvider) {
      processingPromises.push(this.processProviderMessages(providerId, messages));
    }

    // Process all providers concurrently but with limits
    await Promise.all(processingPromises);
  }

  /**
   * Process messages for a specific provider with enhanced duplicate prevention
   */
  private async processProviderMessages(providerId: string, messages: any[]): Promise<void> {
    const provider = await SmsProvider.findById(providerId);
    if (!provider) {
      console.error(`❌ Provider ${providerId} not found`);
      // Mark messages as failed if provider doesn't exist
      await this.markMessagesAsFailed(messages, 'Provider not found');
      return;
    }

    const tracker = this.providerTrackers.get(providerId);
    if (!tracker) {
      console.error(`❌ No rate tracker found for provider ${providerId}`);
      // Mark messages as failed if no rate tracker
      await this.markMessagesAsFailed(messages, 'Rate tracker not found');
      return;
    }

    // Check if provider is active
    if (!provider.isActive) {
      console.warn(`⚠️ Provider ${provider.name} is inactive, marking messages as failed`);
      await this.markMessagesAsFailed(messages, 'Provider is inactive');
      return;
    }

    // Reset rate counters if needed
    this.resetRateCounters(tracker);

    // Calculate how many messages we can process based on rate limits
    const maxToProcess = Math.min(
      messages.length,
      tracker.rateLimit.messagesPerSecond - tracker.messagesThisSecond,
      Math.floor((tracker.rateLimit.messagesPerMinute - tracker.messagesThisMinute) / 60),
      Math.floor((tracker.rateLimit.messagesPerHour - tracker.messagesThisHour) / 3600)
    );

    if (maxToProcess <= 0) {
      console.log(`⏸️ Rate limit reached for provider ${provider.name}`);
      return;
    }

    let processedCount = 0;

    for (let i = 0; i < maxToProcess && i < messages.length; i++) {
      const message = messages[i];
      const messageId = message._id.toString();
      
      // CRITICAL: Check if message was already processed
      if (this.processedMessages.has(messageId)) {
        console.log(`⚠️ Message ${messageId} already processed, skipping`);
        continue;
      }

      try {
        // Mark as processed immediately to prevent race conditions
        this.processedMessages.add(messageId);

        // Atomically update message status to processing
        const updateResult = await SmsMessage.findOneAndUpdate(
          { 
            _id: message._id, 
            status: 'queued' // Only update if still queued
          },
          {
            status: 'processing',
            $inc: { retryCount: 1 }
          },
          { new: true }
        );

        if (!updateResult) {
          console.log(`⚠️ Message ${messageId} was already processed by another instance`);
          continue;
        }

        // Send SMS message
        const result = await this.sendSmsMessage(provider, updateResult);
        
        // Determine final status based on success and retryability
        let finalStatus: string;
        let shouldRetry = false;
        
        if (result.success) {
          finalStatus = 'sent';
        } else {
          // Check if failure is retryable and we haven't exceeded max retries
          const isRetryable = result.retryable !== false; // Default to true if not specified
          const canRetry = updateResult.retryCount < updateResult.maxRetries;
          
          if (isRetryable && canRetry) {
            finalStatus = 'queued'; // Retry
            shouldRetry = true;
          } else {
            finalStatus = 'failed'; // Permanent failure or max retries exceeded
          }
        }
        
        // Update message based on result
        const updateData: any = {
          status: finalStatus,
          providerResponse: result,
          sentAt: result.success ? new Date() : undefined,
          failedAt: finalStatus === 'failed' ? new Date() : undefined,
          errorMessage: result.error
        };

        if (result.success && result.messageId) {
          updateData.messageId = result.messageId;
        }

        await SmsMessage.findByIdAndUpdate(message._id, updateData);

        // Update campaign counters ATOMICALLY - only for final status changes
        if (message.campaignId && result.success) {
          await this.incrementCampaignCounter(message.campaignId.toString(), 'sentCount', message.cost || 0);
        } else if (message.campaignId && finalStatus === 'failed') {
          await this.incrementCampaignCounter(message.campaignId.toString(), 'failedCount', message.cost || 0);
        }

        // Log retry vs permanent failure
        if (!result.success) {
          if (shouldRetry) {
            console.log(`🔄 Message ${messageId} will retry (${updateResult.retryCount}/${updateResult.maxRetries}): ${result.error}`);
          } else {
            const reason = result.retryable === false ? 'permanent failure' : 'max retries exceeded';
            console.log(`❌ Message ${messageId} permanently failed (${reason}): ${result.error}`);
          }
        }

        // Update rate counters
        tracker.messagesThisSecond++;
        tracker.messagesThisMinute++;
        tracker.messagesThisHour++;
        
        processedCount++;

        // Add 1-second delay between each send to prevent overwhelming the system
        if (i < maxToProcess - 1 && i < messages.length - 1) {
          console.log(`⏳ Waiting 1 second before next send...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`❌ Error processing message ${messageId}:`, error);
        
        // Remove from processed tracking on error to allow retry
        this.processedMessages.delete(messageId);
        
        // Update message as failed if max retries exceeded
        const currentMessage = await SmsMessage.findById(message._id);
        if (currentMessage && currentMessage.retryCount >= currentMessage.maxRetries) {
          await SmsMessage.findByIdAndUpdate(message._id, {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            failedAt: new Date()
          });
          
          if (message.campaignId) {
            await this.incrementCampaignCounter(message.campaignId.toString(), 'failedCount', message.cost || 0);
          }
        }
      }
    }

    console.log(`✅ Processed ${processedCount} messages for provider ${provider.name}`);

    // Check campaign completion for all processed campaigns
    const campaignIds = new Set(
      messages
        .filter(m => m.campaignId)
        .map(m => m.campaignId.toString())
    );

    for (const campaignId of campaignIds) {
      await this.checkCampaignCompletion(campaignId);
    }
  }

  /**
   * Atomically increment campaign counters with bounds checking
   */
  private async incrementCampaignCounter(campaignId: string, counter: 'sentCount' | 'failedCount', cost: number = 0): Promise<void> {
    try {
      const campaign = await SmsCampaign.findById(campaignId);
      if (!campaign) return;

      const updateObj: any = {};
      
      // Bounds checking - never exceed contact count
      if (counter === 'sentCount') {
        const newSentCount = Math.min(campaign.contactCount, campaign.sentCount + 1);
        if (newSentCount > campaign.sentCount) {
          updateObj.sentCount = newSentCount;
          // Don't increment actualCost for sent messages - only for delivered messages
        }
      } else if (counter === 'failedCount') {
        const newFailedCount = Math.min(campaign.contactCount, campaign.failedCount + 1);
        if (newFailedCount > campaign.failedCount) {
          updateObj.failedCount = newFailedCount;
          // Don't increment actualCost for failed messages
        }
      }

      if (Object.keys(updateObj).length > 0) {
        await SmsCampaign.findByIdAndUpdate(campaignId, updateObj);
      }
    } catch (error) {
      console.error(`❌ Error incrementing campaign counter:`, error);
    }
  }

  /**
   * Send SMS message via provider
   */
  private async sendSmsMessage(provider: any, message: any): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    retryable?: boolean;
  }> {
    // Check if this is a simulation provider
    if (provider.provider === 'simulation') {
      console.log(`🎭 Using simulation provider: ${provider.displayName}`);
      const { smsSimulationProvider } = await import('./SmsSimulationProvider');
      
      const configType = provider.settings?.simulationType || 'standard';
      
      try {
        const result = await smsSimulationProvider.sendSms(
          message.to,
          message.content,
          message.from,
          configType,
          message._id.toString()
        );
        
        return {
          success: result.success,
          messageId: result.messageId,
          error: result.error,
          retryable: result.retryable
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Simulation provider error',
          retryable: true // System errors are typically retryable
        };
      }
    }
    
    // Real provider integration - implement actual API calls
    const providerType = provider.provider;
    console.log(`📡 Using real provider: ${provider.displayName} (${providerType})`);
    
    try {
      switch (providerType) {
        case 'twilio':
          return await this.sendViaTwilio(provider, message);
          
        case 'messagebird':
          return await this.sendViaMessageBird(provider, message);
          
        case 'aws-sns':
          return await this.sendViaAWSSNS(provider, message);
          
        case 'smsenvoi':
          return await this.sendViaSMSenvoi(provider, message);
          
        default:
          throw new Error(`Provider integration not implemented: ${providerType}. Please use a simulation provider for testing or contact support to implement ${providerType} integration.`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Provider API error',
        retryable: true // Provider errors are typically retryable
      };
    }
  }

  /**
   * Check campaign completion using actual message counts
   */
  private async checkCampaignCompletion(campaignId: string): Promise<void> {
    try {
      const campaign = await SmsCampaign.findById(campaignId);
      if (!campaign || campaign.status === 'completed') {
        return;
      }

      console.log(`🔍 Checking completion for campaign ${campaign.name} (${campaignId})`);

      // Get actual message counts from database
      const messageCounts = await SmsMessage.aggregate([
        { $match: { campaignId: new mongoose.Types.ObjectId(campaignId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      const actualCounts = {
        sent: 0,
        delivered: 0,
        failed: 0,
        undelivered: 0,
        processing: 0,
        queued: 0,
        paused: 0,
        blocked: 0
      };

      messageCounts.forEach(item => {
        if (item._id in actualCounts) {
          actualCounts[item._id as keyof typeof actualCounts] = item.count;
        }
      });

      const totalMessages = Object.values(actualCounts).reduce((sum, count) => sum + count, 0);
      const totalProcessed = actualCounts.sent + actualCounts.delivered + actualCounts.failed + actualCounts.undelivered + actualCounts.blocked;
      const totalPending = actualCounts.queued + actualCounts.processing + actualCounts.paused;

      console.log(`📊 Campaign ${campaign.name} message breakdown:`, {
        totalMessages,
        totalProcessed,
        totalPending,
        contactCount: campaign.contactCount,
        actualCounts
      });

      // Campaign is complete when all messages are processed (no queued or processing)
      if (totalPending === 0 && totalMessages > 0) {
        // Calculate actual cost based on delivered messages only
        const deliveredMessagesCost = await SmsMessage.aggregate([
          { 
            $match: { 
              campaignId: new mongoose.Types.ObjectId(campaignId),
              status: 'delivered'
            } 
          },
          { 
            $group: { 
              _id: null, 
              totalCost: { $sum: '$cost' } 
            } 
          }
        ]);

        const actualCostFromDelivered = deliveredMessagesCost[0]?.totalCost || 0;

        // Update campaign with final accurate counts
        const finalUpdateObj: any = {
          status: 'completed',
          completedAt: new Date(),
          progress: 100,
          // Use actual counts with bounds checking
          sentCount: Math.min(campaign.contactCount, actualCounts.sent),
          deliveredCount: Math.min(campaign.contactCount, actualCounts.delivered),
          failedCount: Math.min(campaign.contactCount, actualCounts.failed + actualCounts.undelivered + actualCounts.blocked),
          // Update actual cost to reflect only delivered messages
          actualCost: actualCostFromDelivered
        };

        await SmsCampaign.findByIdAndUpdate(campaignId, finalUpdateObj);
        
        // Process campaign billing after completion
        try {
          const { SMSBillingService } = await import('@/lib/services/smsBillingService');
          await SMSBillingService.processCampaignBilling(campaignId);
        } catch (error) {
          console.error(`❌ Failed to process campaign billing for ${campaignId}:`, error);
        }
        
        console.log(`✅ Campaign ${campaign.name} (${campaignId}) completed:`, {
          sent: finalUpdateObj.sentCount,
          delivered: finalUpdateObj.deliveredCount,
          failed: finalUpdateObj.failedCount,
          actualCost: finalUpdateObj.actualCost,
          totalProcessed,
          contactCount: campaign.contactCount
        });

        // Emit completion event
        this.emitProgressUpdate(campaignId, {
          progress: 100,
          sentCount: finalUpdateObj.sentCount,
          failedCount: finalUpdateObj.failedCount,
          deliveredCount: finalUpdateObj.deliveredCount,
          status: 'completed'
        });
      } else {
        // Update progress for ongoing campaign
        const progress = campaign.contactCount > 0 ? 
          Math.min(100, Math.round((totalProcessed / campaign.contactCount) * 100)) : 0;

        if (campaign.progress !== progress) {
          await SmsCampaign.findByIdAndUpdate(campaignId, { progress });
          
          this.emitProgressUpdate(campaignId, {
            progress,
            sentCount: Math.min(campaign.contactCount, actualCounts.sent),
            failedCount: Math.min(campaign.contactCount, actualCounts.failed + actualCounts.undelivered + actualCounts.blocked),
            deliveredCount: Math.min(campaign.contactCount, actualCounts.delivered),
            status: campaign.status
          });
        }

        console.log(`⏳ Campaign ${campaign.name} still processing: ${totalProcessed}/${campaign.contactCount} processed, ${totalPending} pending`);
      }
    } catch (error) {
      console.error(`❌ Error checking campaign completion:`, error);
    }
  }

  /**
   * Reset rate counters if time periods have elapsed
   */
  private resetRateCounters(tracker: ProviderRateTracker): void {
    const now = Date.now();
    
    if (now - tracker.lastSecondReset >= 1000) {
      tracker.messagesThisSecond = 0;
      tracker.lastSecondReset = now;
    }
    
    if (now - tracker.lastMinuteReset >= 60000) {
      tracker.messagesThisMinute = 0;
      tracker.lastMinuteReset = now;
    }
    
    if (now - tracker.lastHourReset >= 3600000) {
      tracker.messagesThisHour = 0;
      tracker.lastHourReset = now;
    }
  }

  /**
   * Mark messages as failed with a specific error message
   */
  private async markMessagesAsFailed(messages: any[], errorMessage: string): Promise<void> {
    for (const message of messages) {
      try {
        await SmsMessage.findByIdAndUpdate(message._id, {
          status: 'failed',
          errorMessage,
          failedAt: new Date()
        });

        // Update campaign counters if applicable
        if (message.campaignId) {
          await this.incrementCampaignCounter(message.campaignId.toString(), 'failedCount', message.cost || 0);
        }
      } catch (error) {
        console.error(`❌ Error marking message ${message._id} as failed:`, error);
      }
    }
  }

  /**
   * Validate country prefix for phone number
   */
  private validateCountryPrefix(phoneNumber: string, country: string, expectedPrefix: string): boolean {
    // Remove any leading + or 00
    const cleanNumber = phoneNumber.replace(/^\+?0*/, '');
    
    // Check if number starts with expected prefix
    return cleanNumber.startsWith(expectedPrefix.replace(/^\+/, ''));
  }

  /**
   * Process template variables in message content
   */
  private processTemplateVariables(message: string, contact: any): string {
    let processedMessage = message;
    
    // Replace common template variables
    const variables = {
      '{{firstName}}': contact.firstName || '',
      '{{lastName}}': contact.lastName || '',
      '{{fullName}}': `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
      '{{phoneNumber}}': contact.phoneNumber || '',
      '{{email}}': contact.email || '',
      '{{company}}': contact.company || '',
      '{{customField1}}': contact.customField1 || '',
      '{{customField2}}': contact.customField2 || '',
      '{{customField3}}': contact.customField3 || '',
    };

    for (const [variable, value] of Object.entries(variables)) {
      processedMessage = processedMessage.replace(new RegExp(variable, 'g'), value);
    }

    return processedMessage;
  }

  /**
   * Emit real-time progress update
   */
  private emitProgressUpdate(campaignId: string, data: any): void {
    console.log(`📡 Real-time update for campaign ${campaignId}:`, data);
    // TODO: Implement WebSocket or SSE for real-time updates
  }

  /**
   * Reset the SMS queue service (clear internal state)
   */
  public resetQueueService(): void {
    // Clear processed messages tracking
    this.processedMessages.clear();
    
    // Clear campaign locks
    this.campaignLocks.clear();
    
    // Reset provider rate counters
    for (const [providerId, tracker] of this.providerTrackers) {
      tracker.messagesThisSecond = 0;
      tracker.messagesThisMinute = 0;
      tracker.messagesThisHour = 0;
      tracker.lastSecondReset = Date.now();
      tracker.lastMinuteReset = Date.now();
      tracker.lastHourReset = Date.now();
    }
    
    console.log('🔄 SMS Queue Service internal state reset');
  }

  /**
   * Get queue statistics
   */
  public async getQueueStats(): Promise<{
    queued: number;
    processing: number;
    sent: number;
    failed: number;
    providerStats: Array<{
      providerId: string;
      name: string;
      messagesThisSecond: number;
      messagesThisMinute: number;
      messagesThisHour: number;
      rateLimit: any;
    }>;
  }> {
    await connectToDatabase();
    
    const [queued, processing, sent, failed] = await Promise.all([
      SmsMessage.countDocuments({ status: 'queued' }),
      SmsMessage.countDocuments({ status: 'processing' }),
      SmsMessage.countDocuments({ status: 'sent' }),
      SmsMessage.countDocuments({ status: 'failed' })
    ]);

    const providerStats = [];
    for (const [providerId, tracker] of this.providerTrackers) {
      const provider = await SmsProvider.findById(providerId);
      if (provider) {
        providerStats.push({
          providerId,
          name: provider.name,
          messagesThisSecond: tracker.messagesThisSecond,
          messagesThisMinute: tracker.messagesThisMinute,
          messagesThisHour: tracker.messagesThisHour,
          rateLimit: tracker.rateLimit
        });
      }
    }

    return {
      queued,
      processing,
      sent,
      failed,
      providerStats
    };
  }

  /**
   * Stop the queue processing
   */
  public stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isProcessing = false;
    this.processedMessages.clear();
    this.campaignLocks.clear();
    console.log('🛑 SMS Queue Service stopped');
  }

  /**
   * Clear processed message tracking (for testing and memory management)
   */
  public clearProcessedTracking(): void {
    this.processedMessages.clear();
    console.log('🧹 Cleared processed message tracking');
  }

  /**
   * Clean up processed messages tracking periodically
   */
  private async cleanupProcessedTracking(): Promise<void> {
    try {
      // Get all message IDs that are still in 'processing' or 'queued' status
      const activeMessages = await SmsMessage.find({
        status: { $in: ['queued', 'processing'] }
      }).select('_id').lean();

      const activeMessageIds = new Set(activeMessages.map(m => m._id.toString()));

      // Remove processed messages that are no longer active
      const processedArray = Array.from(this.processedMessages);
      let cleanedCount = 0;

      for (const messageId of processedArray) {
        if (!activeMessageIds.has(messageId)) {
          this.processedMessages.delete(messageId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} processed message IDs from tracking`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up processed tracking:', error);
    }
  }

  /**
   * Pause campaign processing
   */
  public async pauseCampaign(campaignId: string): Promise<void> {
    await connectToDatabase();
    
    await SmsMessage.updateMany(
      { campaignId, status: 'queued' },
      { status: 'paused' }
    );
    
    console.log(`⏸️ Campaign ${campaignId} processing paused`);
  }

  /**
   * Resume campaign processing
   */
  public async resumeCampaign(campaignId: string): Promise<void> {
    await connectToDatabase();
    
    await SmsMessage.updateMany(
      { campaignId, status: 'paused' },
      { status: 'queued' }
    );
    
    console.log(`▶️ Campaign ${campaignId} processing resumed`);
  }

  /**
   * Synchronize campaign counters with actual message data (prevents inconsistencies)
   */
  public async synchronizeCampaignCounters(campaignId?: string): Promise<void> {
    try {
      await connectToDatabase();
      
      // Get campaigns to sync (specific campaign or all active/sending campaigns)
      const campaignsToSync = campaignId 
        ? await SmsCampaign.find({ _id: campaignId })
        : await SmsCampaign.find({ 
            status: { $in: ['sending', 'completed'] },
            updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
          });

      console.log(`🔄 Synchronizing counters for ${campaignsToSync.length} campaigns`);

      for (const campaign of campaignsToSync) {
        await this.syncSingleCampaign(campaign._id.toString());
      }

      console.log(`✅ Campaign counter synchronization completed`);
    } catch (error) {
      console.error('❌ Error synchronizing campaign counters:', error);
    }
  }

  /**
   * Synchronize a single campaign's counters with actual message data
   */
  private async syncSingleCampaign(campaignId: string): Promise<void> {
    try {
      const campaign = await SmsCampaign.findById(campaignId);
      if (!campaign) return;

      // Get actual message counts from database
      const messageCounts = await SmsMessage.aggregate([
        { $match: { campaignId: new mongoose.Types.ObjectId(campaignId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      const actualCounts = {
        sent: 0,
        delivered: 0,
        failed: 0,
        undelivered: 0,
        processing: 0,
        queued: 0,
        paused: 0,
        blocked: 0
      };

      messageCounts.forEach(item => {
        if (item._id in actualCounts) {
          actualCounts[item._id as keyof typeof actualCounts] = item.count;
        }
      });

      const totalMessages = Object.values(actualCounts).reduce((sum, count) => sum + count, 0);
      const totalProcessed = actualCounts.sent + actualCounts.delivered + actualCounts.failed + actualCounts.undelivered + actualCounts.blocked;
      const totalPending = actualCounts.queued + actualCounts.processing + actualCounts.paused;

      // Calculate what the counters should be
      const correctCounts = {
        sentCount: actualCounts.sent,
        deliveredCount: actualCounts.delivered,
        failedCount: actualCounts.failed + actualCounts.undelivered + actualCounts.blocked,
        progress: totalMessages > 0 ? Math.round((totalProcessed / totalMessages) * 100) : 0,
        status: totalPending === 0 && totalMessages > 0 ? 'completed' : campaign.status
      };

      // Check if synchronization is needed
      const needsSync = (
        campaign.sentCount !== correctCounts.sentCount ||
        campaign.deliveredCount !== correctCounts.deliveredCount ||
        campaign.failedCount !== correctCounts.failedCount ||
        campaign.progress !== correctCounts.progress ||
        (correctCounts.status === 'completed' && campaign.status !== 'completed')
      );

      if (needsSync) {
        console.log(`🔧 Syncing campaign ${campaign.name} counters:`, {
          before: {
            sent: campaign.sentCount,
            delivered: campaign.deliveredCount,
            failed: campaign.failedCount,
            progress: campaign.progress,
            status: campaign.status
          },
          after: correctCounts,
          actualMessageCounts: actualCounts
        });

        const updateObj: any = {
          sentCount: correctCounts.sentCount,
          deliveredCount: correctCounts.deliveredCount,
          failedCount: correctCounts.failedCount,
          progress: correctCounts.progress
        };

        if (correctCounts.status === 'completed' && campaign.status !== 'completed') {
          updateObj.status = 'completed';
          updateObj.completedAt = new Date();
        }

        await SmsCampaign.findByIdAndUpdate(campaignId, updateObj);
        console.log(`✅ Campaign ${campaign.name} counters synchronized`);
      }
    } catch (error) {
      console.error(`❌ Error syncing campaign ${campaignId}:`, error);
    }
  }

  private getCountryCodeFromName(countryName: string): string {
    // This method is no longer needed since both campaigns and providers
    // now use the same country name format (e.g., "France", "Germany", "Spain")
    return countryName;
  }

  // Real provider integration methods
  private async sendViaTwilio(provider: any, message: any): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    retryable?: boolean;
  }> {
    try {
      // TODO: Implement Twilio API integration
      // const twilio = require('twilio');
      // const client = twilio(provider.apiKey, provider.apiSecret);
      // const result = await client.messages.create({
      //   body: message.content,
      //   from: message.from || provider.defaultSenderId,
      //   to: message.to
      // });
      // return { success: true, messageId: result.sid };
      
      throw new Error('Twilio integration not yet implemented. Please configure Twilio API credentials and implement the integration.');
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Twilio API error',
        retryable: true
      };
    }
  }

  private async sendViaMessageBird(provider: any, message: any): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    retryable?: boolean;
  }> {
    try {
      // TODO: Implement MessageBird API integration
      // const messagebird = require('messagebird');
      // const client = messagebird(provider.apiKey);
      // const result = await client.messages.create({
      //   originator: message.from || provider.defaultSenderId,
      //   recipients: [message.to],
      //   body: message.content
      // });
      // return { success: true, messageId: result.id };
      
      throw new Error('MessageBird integration not yet implemented. Please configure MessageBird API credentials and implement the integration.');
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'MessageBird API error',
        retryable: true
      };
    }
  }

  private async sendViaAWSSNS(provider: any, message: any): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    retryable?: boolean;
  }> {
    try {
      // TODO: Implement AWS SNS integration
      // const AWS = require('aws-sdk');
      // const sns = new AWS.SNS({
      //   accessKeyId: provider.apiKey,
      //   secretAccessKey: provider.apiSecret,
      //   region: provider.region || 'us-east-1'
      // });
      // const result = await sns.publish({
      //   PhoneNumber: message.to,
      //   Message: message.content,
      //   MessageAttributes: {
      //     'AWS.SNS.SMS.SenderID': {
      //       DataType: 'String',
      //       StringValue: message.from || provider.defaultSenderId
      //     }
      //   }
      // }).promise();
      // return { success: true, messageId: result.MessageId };
      
      throw new Error('AWS SNS integration not yet implemented. Please configure AWS SNS credentials and implement the integration.');
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'AWS SNS API error',
        retryable: true
      };
    }
  }

  private async sendViaSMSenvoi(provider: any, message: any): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    retryable?: boolean;
  }> {
    try {
      console.log(`📤 SMSenvoi: Sending SMS to ${message.to}`);
      
      // Validate required credentials
      if (!provider.apiKey || !provider.apiSecret) {
        throw new Error('SMSenvoi credentials missing. Please configure username and password in provider settings.');
      }

      const baseUrl = provider.apiEndpoint || 'https://api.smsenvoi.com/API/v1.0/REST';
      
      // Step 1: Authenticate to get user_key and session_key
      const authUrl = `${baseUrl}/login?username=${encodeURIComponent(provider.apiKey)}&password=${encodeURIComponent(provider.apiSecret)}`;
      
      console.log(`🔐 SMSenvoi: Authenticating...`);
      const authResponse = await fetch(authUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!authResponse.ok) {
        throw new Error(`SMSenvoi authentication failed: ${authResponse.status} ${authResponse.statusText}`);
      }

      const authData = await authResponse.text();
      const [userKey, sessionKey] = authData.split(';');
      
      if (!userKey || !sessionKey) {
        throw new Error('SMSenvoi authentication failed: Invalid response format');
      }

      console.log(`✅ SMSenvoi: Authentication successful`);

      // Step 2: Send SMS
      const smsUrl = `${baseUrl}/sms`;
      
      // Prepare SMS payload according to SMSenvoi API
      const smsPayload = {
        message: message.content,
        message_type: provider.settings?.messageType || 'PRM', // PRM = Premium quality, -- = Standard
        recipient: [message.to], // Array of recipients
        returnCredits: true,
        ...(message.from && { sender: message.from }) // Optional sender ID
      };

      console.log(`📤 SMSenvoi: Sending SMS with payload:`, { 
        ...smsPayload, 
        recipient: smsPayload.recipient.length + ' recipients' 
      });

      const smsResponse = await fetch(smsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'user_key': userKey,
          'Session_key': sessionKey
        },
        body: JSON.stringify(smsPayload)
      });

      if (!smsResponse.ok) {
        const errorText = await smsResponse.text();
        throw new Error(`SMSenvoi SMS send failed: ${smsResponse.status} ${smsResponse.statusText} - ${errorText}`);
      }

      const smsResult = await smsResponse.json();
      
      console.log(`📊 SMSenvoi: Response received:`, smsResult);

      // Check if the SMS was sent successfully
      if (smsResult.result === 'OK') {
        return {
          success: true,
          messageId: smsResult.order_id || smsResult.internal_order_id,
          retryable: false
        };
      } else {
        return {
          success: false,
          error: `SMSenvoi error: ${smsResult.result || 'Unknown error'}`,
          retryable: true // SMSenvoi errors might be temporary
        };
      }

    } catch (error) {
      console.error('❌ SMSenvoi error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMSenvoi API error',
        retryable: true
      };
    }
  }
}

// Export singleton instance
export const smsQueueService = SmsQueueService.getInstance(); 