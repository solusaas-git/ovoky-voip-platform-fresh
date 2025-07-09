import { connectToDatabase } from '@/lib/db';
import SmsMessage from '@/models/SmsMessage';

export interface SmsGatewayResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  status?: 'sent' | 'failed' | 'pending';
  cost?: number;
  deliveryTime?: number;
  providerResponse?: any;
  retryable?: boolean;
}

export interface SimulationConfig {
  // Success rates (0-1)
  successRate: number;
  deliveryRate: number; // Of successful sends, how many get delivered
  
  // Timing
  minDelay: number; // Minimum response time in ms
  maxDelay: number; // Maximum response time in ms
  deliveryDelay: number; // Time until delivery report (ms)
  
  // Failure patterns
  temporaryFailureRate: number; // Rate of temporary failures (retriable)
  permanentFailureRate: number; // Rate of permanent failures
  
  // Special behaviors
  blacklistSimulation: boolean; // Simulate blacklisted numbers
  rateLimitSimulation: boolean; // Simulate rate limit errors
  
  // Provider characteristics
  providerId: string;
  providerName: string;
  maxConcurrent: number; // Max concurrent sends
}

export class SmsSimulationProvider {
  private static instance: SmsSimulationProvider;
  private configs = new Map<string, SimulationConfig>();
  private activeConnections = new Map<string, number>();
  private rateLimitCounters = new Map<string, { count: number; resetTime: number }>();
  
  // Enhanced tracking with strict duplicate prevention
  private sentMessages = new Set<string>(); // Track sent message IDs
  private scheduledDeliveries = new Set<string>(); // Track scheduled delivery reports
  private deliveryTimers = new Map<string, NodeJS.Timeout>(); // Track active timers

  private constructor() {
    this.initializeDefaultConfigs();
  }

  public static getInstance(): SmsSimulationProvider {
    if (!SmsSimulationProvider.instance) {
      SmsSimulationProvider.instance = new SmsSimulationProvider();
    }
    return SmsSimulationProvider.instance;
  }

  /**
   * Initialize default simulation configurations for different provider types
   */
  private initializeDefaultConfigs(): void {
    // High-quality provider (like Twilio)
    this.configs.set('premium', {
      successRate: 0.98,
      deliveryRate: 0.96,
      minDelay: 100,
      maxDelay: 500,
      deliveryDelay: 2000,
      temporaryFailureRate: 0.01,
      permanentFailureRate: 0.01,
      blacklistSimulation: true,
      rateLimitSimulation: true,
      providerId: 'sim_premium',
      providerName: 'Premium SMS Gateway',
      maxConcurrent: 100
    });

    // Standard provider
    this.configs.set('standard', {
      successRate: 0.94,
      deliveryRate: 0.92,
      minDelay: 200,
      maxDelay: 1000,
      deliveryDelay: 3000, // Reduced for faster testing
      temporaryFailureRate: 0.03,
      permanentFailureRate: 0.03,
      blacklistSimulation: true,
      rateLimitSimulation: true,
      providerId: 'sim_standard',
      providerName: 'Standard SMS Gateway',
      maxConcurrent: 50
    });

    // Budget provider (more failures)
    this.configs.set('budget', {
      successRate: 0.88,
      deliveryRate: 0.85,
      minDelay: 300,
      maxDelay: 2000,
      deliveryDelay: 8000,
      temporaryFailureRate: 0.07,
      permanentFailureRate: 0.05,
      blacklistSimulation: true,
      rateLimitSimulation: true,
      providerId: 'sim_budget',
      providerName: 'Budget SMS Gateway',
      maxConcurrent: 20
    });

    // Testing provider (fast and predictable)
    this.configs.set('testing', {
      successRate: 0.95,
      deliveryRate: 0.90,
      minDelay: 50,
      maxDelay: 200,
      deliveryDelay: 1500, // Fast delivery for testing
      temporaryFailureRate: 0.03,
      permanentFailureRate: 0.02,
      blacklistSimulation: true,
      rateLimitSimulation: false,
      providerId: 'sim_testing',
      providerName: 'Testing SMS Gateway',
      maxConcurrent: 1000
    });
  }

  /**
   * Send SMS message with enhanced duplicate prevention
   */
  public async sendSms(
    to: string,
    message: string,
    from?: string,
    configType: string = 'standard',
    messageId?: string
  ): Promise<SmsGatewayResponse> {
    const config = this.configs.get(configType);
    if (!config) {
      throw new Error(`Unknown simulation config: ${configType}`);
    }

    // CRITICAL: Prevent duplicate sends for the same message
    if (messageId && this.sentMessages.has(messageId)) {
      console.log(`⚠️ Message ${messageId} already sent, returning cached result`);
      
      return {
        success: true,
        messageId: `${config.providerId}_cached_${Date.now()}`,
        status: 'sent',
        cost: this.calculateCost(message, to),
        providerResponse: {
          cached: true,
          reason: 'Duplicate send prevented'
        }
      };
    }

    // Mark message as being sent immediately to prevent race conditions
    if (messageId) {
      this.sentMessages.add(messageId);
    }

    try {
      // Check rate limits
      if (config.rateLimitSimulation && this.isRateLimited(config.providerId)) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          status: 'failed',
          retryable: true,
          providerResponse: {
            error_code: 429,
            error_message: 'Too many requests'
          }
        };
      }

      // Check concurrent connections
      const currentConnections = this.activeConnections.get(config.providerId) || 0;
      if (currentConnections >= config.maxConcurrent) {
        return {
          success: false,
          error: 'Maximum concurrent connections reached',
          status: 'failed',
          retryable: true,
          providerResponse: {
            error_code: 503,
            error_message: 'Service temporarily unavailable'
          }
        };
      }

      // Increment active connections
      this.activeConnections.set(config.providerId, currentConnections + 1);

      try {
        // Simulate processing delay
        const delay = Math.random() * (config.maxDelay - config.minDelay) + config.minDelay;
        await new Promise(resolve => setTimeout(resolve, delay));

        // Determine if send is successful
        const isSuccess = Math.random() < config.successRate;

        if (isSuccess) {
          const gatewayMessageId = `${config.providerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Schedule delivery report ONLY for successful sends and ONLY once
          if (messageId && !this.scheduledDeliveries.has(messageId)) {
            this.scheduleDeliveryReport(messageId, config, gatewayMessageId);
          }

          // Update rate limit counter
          this.updateRateLimit(config.providerId);

          return {
            success: true,
            messageId: gatewayMessageId,
            status: 'sent',
            cost: this.calculateCost(message, to),
            deliveryTime: delay,
            providerResponse: {
              message_id: gatewayMessageId,
              status: 'accepted',
              timestamp: new Date().toISOString(),
              provider: config.providerName
            }
          };
        } else {
          // Determine failure type
          const failureRandom = Math.random();
          const totalFailureRate = config.temporaryFailureRate + config.permanentFailureRate;
          const isTemporaryFailure = failureRandom < (config.temporaryFailureRate / totalFailureRate);

          const errorTypes = isTemporaryFailure ? [
            'Gateway temporarily unavailable',
            'Network timeout',
            'Service overloaded',
            'Temporary routing failure'
          ] : [
            'Invalid phone number format',
            'Destination not reachable',
            'Message content rejected',
            'Blocked by carrier',
            'Number does not exist'
          ];

          const error = errorTypes[Math.floor(Math.random() * errorTypes.length)];

          return {
            success: false,
            error,
            status: 'failed',
            retryable: isTemporaryFailure,
            providerResponse: {
              error_code: isTemporaryFailure ? 500 : 400,
              error_message: error,
              retry_after: isTemporaryFailure ? Math.floor(Math.random() * 60) + 30 : undefined
            }
          };
        }
      } finally {
        // Decrement active connections
        this.activeConnections.set(config.providerId, Math.max(0, currentConnections));
      }
    } catch (error) {
      // Remove from sent tracking on error to allow retry
      if (messageId) {
        this.sentMessages.delete(messageId);
      }
      throw error;
    }
  }

  /**
   * Schedule delivery report with enhanced duplicate prevention and staggered delays
   */
  private scheduleDeliveryReport(
    messageId: string, 
    config: SimulationConfig, 
    gatewayMessageId: string
  ): void {
    // CRITICAL: Ensure only ONE delivery report per message
    if (this.scheduledDeliveries.has(messageId)) {
      console.log(`⚠️ Delivery report already scheduled for message: ${messageId}`);
      return;
    }

    // Mark delivery as scheduled immediately
    this.scheduledDeliveries.add(messageId);
    
    // Add staggered delay to prevent webhook flooding
    // Each delivery report gets an additional 1-second delay based on current scheduled count
    const staggerDelay = this.scheduledDeliveries.size * 1000; // 1 second per delivery report
    const totalDelay = config.deliveryDelay + staggerDelay;
    
    console.log(`📋 Scheduling delivery report for message: ${messageId} in ${totalDelay}ms (base: ${config.deliveryDelay}ms + stagger: ${staggerDelay}ms)`);

    // Create timer for delivery report
    const timer = setTimeout(async () => {
      try {
        // Remove timer from tracking
        this.deliveryTimers.delete(messageId);

        // Determine if delivery was successful
        const isDelivered = Math.random() < config.deliveryRate;
        
        // Create delivery report payload
        const deliveryReport = {
          messageId: messageId, // Our internal message ID
          providerMessageId: gatewayMessageId, // Provider's message ID
          status: isDelivered ? 'delivered' : 'undelivered',
          timestamp: new Date().toISOString(),
          errorCode: isDelivered ? undefined : 'EXPIRED',
          errorMessage: isDelivered ? undefined : 'Message not delivered to handset',
          providerId: config.providerId
        };

        console.log(`📤 Sending delivery report for message: ${messageId} -> ${deliveryReport.status}`);

        // Call the webhook delivery endpoint
        const webhookUrl = process.env.WEBHOOK_BASE_URL || 'http://localhost:3000';
        
        try {
          const response = await fetch(`${webhookUrl}/api/sms/webhook/delivery`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': `SMS-Simulation-Provider/${config.providerId}`,
              'X-Webhook-Source': 'simulation'
            },
            body: JSON.stringify(deliveryReport)
          });

          if (response.ok) {
            console.log(`✅ Simulation delivery report sent successfully: ${messageId} -> ${deliveryReport.status}`);
          } else {
            console.error(`❌ Failed to send simulation delivery report: ${response.status} for message: ${messageId}`);
          }
        } catch (webhookError) {
          console.error(`❌ Error calling delivery webhook for message ${messageId}:`, webhookError);
          
          // Fallback: Update message directly if webhook fails
          console.log(`🔄 Using fallback direct update for message: ${messageId}`);
          await this.fallbackDirectUpdate(messageId, deliveryReport, isDelivered);
        }
      } catch (error) {
        console.error(`❌ Error processing delivery report for message ${messageId}:`, error);
      }
    }, totalDelay);

    // Track the timer
    this.deliveryTimers.set(messageId, timer);
  }

  /**
   * Fallback direct update if webhook fails
   */
  private async fallbackDirectUpdate(messageId: string, deliveryReport: any, isDelivered: boolean): Promise<void> {
    try {
      await connectToDatabase();
      
      const updateData: any = {
        deliveryReport: {
          status: deliveryReport.status,
          timestamp: deliveryReport.timestamp,
          errorCode: deliveryReport.errorCode,
          errorMessage: deliveryReport.errorMessage,
          providerId: deliveryReport.providerId
        }
      };

      if (isDelivered) {
        updateData.status = 'delivered';
        updateData.deliveredAt = new Date();
      } else {
        updateData.status = 'undelivered';
        updateData.failedAt = new Date();
        updateData.errorMessage = deliveryReport.errorMessage;
      }

      await SmsMessage.findByIdAndUpdate(messageId, updateData);
      console.log(`📱 Fallback delivery update completed: ${messageId} -> ${deliveryReport.status}`);
    } catch (error) {
      console.error(`❌ Fallback update failed for message ${messageId}:`, error);
    }
  }

  /**
   * Calculate message cost based on content and destination
   */
  private calculateCost(message: string, to: string): number {
    // Simple cost calculation - can be enhanced
    const baseRate = 0.055; // $0.055 per message
    const segments = Math.ceil(message.length / 160); // SMS segments
    
    // Premium numbers cost more
    const isPremium = to.includes('900') || to.includes('901');
    const multiplier = isPremium ? 2.5 : 1.0;
    
    return baseRate * segments * multiplier;
  }

  /**
   * Check if provider is rate limited
   */
  private isRateLimited(providerId: string): boolean {
    const counter = this.rateLimitCounters.get(providerId);
    if (!counter) return false;

    const now = Date.now();
    
    // Reset counter if time window passed
    if (now - counter.resetTime > 60000) { // 1 minute window
      counter.count = 0;
      counter.resetTime = now;
    }

    return counter.count >= 100; // 100 messages per minute limit
  }

  /**
   * Update rate limit counter
   */
  private updateRateLimit(providerId: string): void {
    const counter = this.rateLimitCounters.get(providerId) || { count: 0, resetTime: Date.now() };
    counter.count++;
    this.rateLimitCounters.set(providerId, counter);
  }

  /**
   * Clear tracking for specific message (useful for testing)
   */
  public clearMessageTracking(messageId: string): void {
    this.sentMessages.delete(messageId);
    this.scheduledDeliveries.delete(messageId);
    
    // Clear and cancel timer if exists
    const timer = this.deliveryTimers.get(messageId);
    if (timer) {
      clearTimeout(timer);
      this.deliveryTimers.delete(messageId);
    }
    
    console.log(`🧹 Cleared tracking for message ${messageId}`);
  }

  /**
   * Clear delivery report tracking for specific campaign
   */
  public clearDeliveryReportTracking(campaignId?: string): void {
    if (campaignId) {
      // Clear tracking for specific campaign messages
      const keysToDelete = Array.from(this.sentMessages).filter(key => 
        key.includes(campaignId)
      );
      const scheduledToDelete = Array.from(this.scheduledDeliveries).filter(key => 
        key.includes(campaignId)
      );
      
      keysToDelete.forEach(key => this.sentMessages.delete(key));
      scheduledToDelete.forEach(key => {
        this.scheduledDeliveries.delete(key);
        
        // Cancel timer if exists
        const timer = this.deliveryTimers.get(key);
        if (timer) {
          clearTimeout(timer);
          this.deliveryTimers.delete(key);
        }
      });
      
      console.log(`🧹 Cleared delivery report tracking for campaign ${campaignId} (${keysToDelete.length} sent, ${scheduledToDelete.length} scheduled)`);
    } else {
      // Clear all delivery report tracking
      this.sentMessages.clear();
      this.scheduledDeliveries.clear();
      
      // Cancel all timers
      for (const [messageId, timer] of this.deliveryTimers) {
        clearTimeout(timer);
      }
      this.deliveryTimers.clear();
      
      console.log('🧹 Cleared all delivery report tracking');
    }
  }

  /**
   * Reset all counters and state
   */
  public reset(): void {
    this.activeConnections.clear();
    this.rateLimitCounters.clear();
    this.sentMessages.clear();
    this.scheduledDeliveries.clear();
    
    // Cancel all timers
    for (const [messageId, timer] of this.deliveryTimers) {
      clearTimeout(timer);
    }
    this.deliveryTimers.clear();
    
    console.log('🔄 SMS Simulation Provider reset - cleared all tracking data');
  }

  /**
   * Get delivery report tracking stats
   */
  public getDeliveryTrackingStats(): {
    totalSent: number;
    totalScheduled: number;
    activeTimers: number;
    sentMessages: string[];
    scheduledDeliveries: string[];
  } {
    return {
      totalSent: this.sentMessages.size,
      totalScheduled: this.scheduledDeliveries.size,
      activeTimers: this.deliveryTimers.size,
      sentMessages: Array.from(this.sentMessages).slice(0, 10), // Show first 10 for debugging
      scheduledDeliveries: Array.from(this.scheduledDeliveries).slice(0, 10)
    };
  }

  /**
   * Bulk send simulation for campaigns
   */
  public async bulkSend(
    messages: Array<{
      id: string;
      to: string;
      content: string;
      from?: string;
    }>,
    configType: string = 'standard'
  ): Promise<Array<{ id: string; result: SmsGatewayResponse }>> {
    const results: Array<{ id: string; result: SmsGatewayResponse }> = [];
    
    // Process in parallel but respect concurrency limits
    const config = this.configs.get(configType);
    const batchSize = config ? Math.min(config.maxConcurrent, 10) : 10;
    
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchPromises = batch.map(async (msg) => ({
        id: msg.id,
        result: await this.sendSms(msg.to, msg.content, msg.from, configType, msg.id)
      }));
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to simulate realistic processing
      if (i + batchSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * Get configuration for a specific type
   */
  public getConfig(configType: string): SimulationConfig | undefined {
    return this.configs.get(configType);
  }

  /**
   * Update configuration for a specific type
   */
  public updateConfig(configType: string, updates: Partial<SimulationConfig>): void {
    const existing = this.configs.get(configType);
    if (existing) {
      this.configs.set(configType, { ...existing, ...updates });
      console.log(`📝 Updated simulation config for ${configType}`);
    }
  }
}

// Export singleton instance
export const smsSimulationProvider = SmsSimulationProvider.getInstance(); 