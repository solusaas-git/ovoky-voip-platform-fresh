import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import SmsMessage from '@/models/SmsMessage';
import SmsCampaign from '@/models/SmsCampaign';
import crypto from 'crypto';
import mongoose from 'mongoose';

interface DeliveryReportPayload {
  messageId: string;
  status: 'delivered' | 'failed' | 'undelivered' | 'expired';
  timestamp: string;
  errorCode?: string;
  errorMessage?: string;
  providerMessageId?: string;
  providerId?: string;
  recipient?: string;
}

// Track processed delivery reports to prevent duplicates
const processedDeliveryReports = new Set<string>();

/**
 * Webhook handler for SMS delivery reports from providers
 * POST /api/sms/webhook/delivery
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Check content type to determine how to parse the body
    const contentType = request.headers.get('content-type') || '';
    let body: any;
    
    if (contentType.includes('application/json')) {
      // Parse as JSON (most providers)
      body = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // Parse as form data (SMSenvoi and some others)
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    } else {
      // Try to parse as text first, then determine format
      const text = await request.text();
      try {
        // Try JSON first
        body = JSON.parse(text);
      } catch {
        // If not JSON, try to parse as URL-encoded
        const params = new URLSearchParams(text);
        body = Object.fromEntries(params.entries());
      }
    }
    
    console.log('📱 Received SMS delivery webhook:', body);
    console.log('🔍 Webhook debugging info:', {
      contentType,
      bodyType: typeof body,
      bodyKeys: Object.keys(body || {}),
      hasDeliveryDate: !!body?.delivery_date,
      hasOrderId: !!body?.order_id,
      hasStatus: !!body?.status,
      hasRecipient: !!body?.recipient,
      rawBody: body
    });

    // Check if this is from simulation provider
    const isSimulation = request.headers.get('X-Webhook-Source') === 'simulation';
    
    // Validate webhook signature if provider supports it (skip for simulation)
    const signature = request.headers.get('x-webhook-signature');
    if (signature && !isSimulation && !verifyWebhookSignature(body, signature)) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Handle different provider webhook formats
    const deliveryReport = normalizeDeliveryReport(body);
    
    if (!deliveryReport.messageId) {
      console.error('❌ Missing messageId in delivery report');
      return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });
    }

    // Process the delivery report
    const result = await processDeliveryReport(deliveryReport);

    return NextResponse.json({ 
      success: true, 
      message: 'Delivery report processed successfully',
      result
    });

  } catch (error) {
    console.error('❌ Error processing SMS delivery webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process delivery report' },
      { status: 500 }
    );
  }
}

/**
 * Normalize delivery report from different provider formats
 */
function normalizeDeliveryReport(body: any): DeliveryReportPayload {
  // Handle different provider formats
  
  // Twilio format
  if (body.MessageSid && body.MessageStatus) {
    return {
      messageId: body.MessageSid,
      status: mapTwilioStatus(body.MessageStatus),
      timestamp: body.DateUpdated || new Date().toISOString(),
      errorCode: body.ErrorCode,
      errorMessage: body.ErrorMessage,
      providerMessageId: body.MessageSid,
      providerId: 'twilio'
    };
  }

  // AWS SNS format
  if (body.notification && body.notification.messageId && body.notification.status) {
    return {
      messageId: body.notification.messageId,
      status: mapAwsStatus(body.notification.status),
      timestamp: body.notification.timestamp || new Date().toISOString(),
      errorMessage: body.notification.reasonForFailure,
      providerMessageId: body.notification.messageId,
      providerId: 'aws-sns'
    };
  }

  // MessageBird format
  if (body.id && body.status) {
    return {
      messageId: body.id,
      status: mapMessageBirdStatus(body.status),
      timestamp: body.updatedDatetime || new Date().toISOString(),
      errorCode: body.errors?.[0]?.code?.toString(),
      errorMessage: body.errors?.[0]?.description,
      providerMessageId: body.id,
      providerId: 'messagebird'
    };
  }

  // SMSenvoi format
  if (body.delivery_date && body.order_id && body.status) {
    return {
      messageId: body.order_id,
      status: mapSMSenvoiStatus(body.status),
      timestamp: parseSMSenvoiDate(body.delivery_date) || new Date().toISOString(),
      errorCode: body.status === 'DLVRD' ? undefined : body.status,
      errorMessage: body.status === 'DLVRD' ? undefined : getSMSenvoiErrorMessage(body.status),
      providerMessageId: body.order_id,
      providerId: 'smsenvoi'
    };
  }

  // SMSenvoi format (alternative detection - sometimes order_id might be null)
  if (body.delivery_date && body.status && body.recipient) {
    return {
      messageId: body.order_id || `smsenvoi_${Date.now()}`, // Fallback if order_id is null
      status: mapSMSenvoiStatus(body.status),
      timestamp: parseSMSenvoiDate(body.delivery_date) || new Date().toISOString(),
      errorCode: body.status === 'DLVRD' ? undefined : body.status,
      errorMessage: body.status === 'DLVRD' ? undefined : getSMSenvoiErrorMessage(body.status),
      providerMessageId: body.order_id,
      providerId: 'smsenvoi',
      recipient: body.recipient
    };
  }

  // Generic format (our internal format)
  return {
    messageId: body.messageId,
    status: body.status,
    timestamp: body.timestamp || new Date().toISOString(),
    errorCode: body.errorCode,
    errorMessage: body.errorMessage,
    providerMessageId: body.providerMessageId,
    providerId: body.providerId
  };
}

/**
 * Map Twilio status to our internal status
 */
function mapTwilioStatus(twilioStatus: string): 'delivered' | 'failed' | 'undelivered' | 'expired' {
  switch (twilioStatus.toLowerCase()) {
    case 'delivered':
      return 'delivered';
    case 'failed':
    case 'undelivered':
      return 'failed';
    case 'expired':
      return 'expired';
    default:
      return 'failed';
  }
}

/**
 * Map AWS SNS status to our internal status
 */
function mapAwsStatus(awsStatus: string): 'delivered' | 'failed' | 'undelivered' | 'expired' {
  switch (awsStatus.toLowerCase()) {
    case 'success':
      return 'delivered';
    case 'failure':
    case 'unknown':
      return 'failed';
    default:
      return 'failed';
  }
}

/**
 * Map MessageBird status to our internal status
 */
function mapMessageBirdStatus(mbStatus: string): 'delivered' | 'failed' | 'undelivered' | 'expired' {
  switch (mbStatus.toLowerCase()) {
    case 'delivered':
      return 'delivered';
    case 'delivery_failed':
    case 'expired':
      return 'failed';
    default:
      return 'failed';
  }
}

/**
 * Map SMSenvoi status to our internal status
 */
function mapSMSenvoiStatus(smsEnvoiStatus: string): 'delivered' | 'failed' | 'undelivered' | 'expired' {
  switch (smsEnvoiStatus.toUpperCase()) {
    case 'DLVRD':
      return 'delivered';
    case 'EXPIRED':
    case 'EXPRD':
      return 'expired';
    case 'UNDELIV':
    case 'FAILED':
    case 'REJECTD':
      return 'failed';
    default:
      return 'failed';
  }
}

/**
 * Parse SMSenvoi date format (YYYYMMDDHHMMSS) to ISO string
 */
function parseSMSenvoiDate(dateStr: string): string {
  if (!dateStr || dateStr.length !== 14) {
    return new Date().toISOString();
  }
  
  try {
    // Format: YYYYMMDDHHMMSS -> YYYY-MM-DDTHH:MM:SS
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(8, 10);
    const minute = dateStr.substring(10, 12);
    const second = dateStr.substring(12, 14);
    
    const isoDate = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
    return new Date(isoDate).toISOString();
  } catch (error) {
    console.error('❌ Error parsing SMSenvoi date:', dateStr, error);
    return new Date().toISOString();
  }
}

/**
 * Get SMSenvoi error message based on status code
 */
function getSMSenvoiErrorMessage(status: string): string {
  switch (status.toUpperCase()) {
    case 'EXPIRED':
    case 'EXPRD':
      return 'Message expired before delivery';
    case 'UNDELIV':
      return 'Message undelivered';
    case 'FAILED':
      return 'Message delivery failed';
    case 'REJECTD':
      return 'Message rejected by recipient';
    default:
      return `Delivery failed with status: ${status}`;
  }
}

/**
 * Verify webhook signature (implement based on provider)
 */
function verifyWebhookSignature(body: any, signature: string): boolean {
  // TODO: Implement signature verification based on provider
  // For now, return true (in production, implement proper verification)
  return true;
}

/**
 * Process the delivery report with enhanced duplicate prevention
 */
async function processDeliveryReport(report: DeliveryReportPayload): Promise<{
  processed: boolean;
  reason: string;
  messageId?: string;
  campaignId?: string;
}> {
  try {
    console.log(`🔍 Processing delivery report for message: ${report.messageId} (status: ${report.status})`);
    
    // Create unique key for this delivery report to prevent duplicates
    const deliveryKey = `${report.messageId}-${report.status}-${report.timestamp}`;
    
    if (processedDeliveryReports.has(deliveryKey)) {
      console.log(`⚠️ Duplicate delivery report ignored: ${deliveryKey}`);
      return {
        processed: false,
        reason: 'Duplicate delivery report'
      };
    }

    // Mark as processed immediately to prevent race conditions
    processedDeliveryReports.add(deliveryKey);

    // Find the message by provider message ID or our internal message ID
    // For SMSenvoi, the order_id is stored in the messageId field
    let message = await SmsMessage.findOne({
      $or: [
        { messageId: report.messageId }, // SMSenvoi order_id is stored here
        { messageId: report.providerMessageId }, // Alternative field
        // Only try to match _id if it looks like a valid MongoDB ObjectId
        ...(report.messageId && report.messageId.length === 24 && /^[0-9a-fA-F]{24}$/.test(report.messageId) 
          ? [{ _id: report.messageId }] 
          : [])
      ]
    });

    if (!message) {
      console.error(`❌ Message not found for delivery report: ${report.messageId}`);
      processedDeliveryReports.delete(deliveryKey); // Remove from processed set
      return {
        processed: false,
        reason: 'Message not found'
      };
    }

    console.log(`📋 Found message ${message._id} with current status: ${message.status}`);

    // Store the original status for comparison
    const originalStatus = message.status;
    const newStatus = report.status === 'expired' ? 'failed' : report.status;

    // Validate status transition
    if (!isValidStatusTransition(originalStatus, newStatus)) {
      console.log(`⚠️ Invalid status transition for message ${message._id}: ${originalStatus} → ${newStatus}`);
      return {
        processed: false,
        reason: `Invalid status transition: ${originalStatus} → ${newStatus}`,
        messageId: (message._id as any).toString(),
        campaignId: (message.campaignId as any)?.toString()
      };
    }

    // Check if status actually changed
    if (originalStatus === newStatus) {
      console.log(`⚠️ No status change for message ${message._id}: ${originalStatus} → ${newStatus}`);
      return {
        processed: false,
        reason: 'No status change required',
        messageId: (message._id as any).toString(),
        campaignId: (message.campaignId as any)?.toString()
      };
    }

    console.log(`🔄 Updating message ${message._id}: ${originalStatus} → ${newStatus}`);

    // Update message with delivery report atomically
    const updateData: any = {
      status: newStatus,
      deliveryReport: {
        status: report.status,
        timestamp: report.timestamp,
        errorCode: report.errorCode,
        errorMessage: report.errorMessage,
        providerId: report.providerId
      }
    };

    if (report.status === 'delivered') {
      console.log(`🕐 Processing delivered status - timestamp: ${report.timestamp}, type: ${typeof report.timestamp}`);
      const deliveryDate = new Date(report.timestamp);
      console.log(`🕐 Created date object: ${deliveryDate}, isValid: ${!isNaN(deliveryDate.getTime())}`);
      updateData.deliveredAt = deliveryDate;
    } else if (['failed', 'undelivered', 'expired'].includes(report.status)) {
      console.log(`🕐 Processing failed status - timestamp: ${report.timestamp}, type: ${typeof report.timestamp}`);
      const failureDate = new Date(report.timestamp);
      console.log(`🕐 Created date object: ${failureDate}, isValid: ${!isNaN(failureDate.getTime())}`);
      updateData.failedAt = failureDate;
      if (report.errorMessage) {
        updateData.errorMessage = report.errorMessage;
      }
    }

    // Use findOneAndUpdate for atomic operation
    const updatedMessage = await SmsMessage.findByIdAndUpdate(
      message._id,
      updateData,
      { new: true }
    );

    if (!updatedMessage) {
      console.error(`❌ Failed to update message ${message._id}`);
      processedDeliveryReports.delete(deliveryKey);
      return {
        processed: false,
        reason: 'Failed to update message'
      };
    }

    console.log(`✅ Updated message ${message._id} delivery status: ${originalStatus} → ${newStatus}`);

    // Update campaign statistics atomically if this is a campaign message
    if (message.campaignId) {
      await updateCampaignDeliveryStats(
        (message.campaignId as any).toString(), 
        originalStatus, 
        newStatus,
        (message._id as any).toString()
      );
    }

    return {
      processed: true,
      reason: 'Successfully processed',
      messageId: (message._id as any).toString(),
      campaignId: (message.campaignId as any)?.toString()
    };

  } catch (error) {
    console.error(`❌ Error processing delivery report for ${report.messageId}:`, error);
    return {
      processed: false,
      reason: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Validate if a status transition is allowed
 */
function isValidStatusTransition(fromStatus: string, toStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    'sent': ['delivered', 'failed', 'undelivered'],
    'processing': ['delivered', 'failed', 'undelivered'],
    'queued': ['delivered', 'failed', 'undelivered'], // In case of direct delivery
    // Final states cannot transition
    'delivered': [],
    'failed': [],
    'undelivered': [],
    'blocked': []
  };

  const allowedTransitions = validTransitions[fromStatus] || [];
  return allowedTransitions.includes(toStatus);
}

/**
 * Update campaign delivery statistics atomically with bounds checking
 */
async function updateCampaignDeliveryStats(
  campaignId: string, 
  oldStatus: string, 
  newStatus: string, 
  messageId: string
): Promise<void> {
  try {
    // Get the campaign first to check current state and bounds
    const campaign = await SmsCampaign.findById(campaignId);
    if (!campaign) {
      console.error(`❌ Campaign not found: ${campaignId}`);
      return;
    }

    // Skip updates for paused campaigns (but allow completed campaigns to receive delivery updates)
    if (campaign.status === 'paused') {
      console.log(`⚠️ Skipping delivery update for paused campaign: ${campaignId}`);
      return;
    }

    console.log(`📊 Processing delivery report for campaign: ${campaignId} (status: ${campaign.status})`);

    // SAFEGUARD: Check if counters are already at safe bounds
    const currentTotal = campaign.sentCount + campaign.deliveredCount + campaign.failedCount;
    if (currentTotal >= campaign.contactCount) {
      console.log(`⚠️ Campaign ${campaignId} counters already at or above contact count (${currentTotal}/${campaign.contactCount}), skipping update to prevent inflation`);
      return;
    }

    // Calculate the changes needed based on status transition
    const updateObj: any = {};
    let needsUpdate = false;

    // Handle status transitions with bounds checking
    if (oldStatus === 'sent' && newStatus === 'delivered') {
      // Move from sent to delivered
      const newSentCount = Math.max(0, campaign.sentCount - 1);
      const newDeliveredCount = Math.min(campaign.contactCount, campaign.deliveredCount + 1);
      
      if (newSentCount !== campaign.sentCount) {
        updateObj.sentCount = newSentCount;
        needsUpdate = true;
      }
      if (newDeliveredCount !== campaign.deliveredCount) {
        updateObj.deliveredCount = newDeliveredCount;
        needsUpdate = true;
        
        // Increment actualCost only when message is delivered
        try {
          const messageDoc = await SmsMessage.findById(messageId);
          if (messageDoc && messageDoc.cost) {
            updateObj.$inc = { actualCost: messageDoc.cost };
          }
        } catch (error) {
          console.error(`❌ Error fetching message cost for ${messageId}:`, error);
        }
      }
    } else if (oldStatus === 'sent' && ['failed', 'undelivered'].includes(newStatus)) {
      // Move from sent to failed
      const newSentCount = Math.max(0, campaign.sentCount - 1);
      const newFailedCount = Math.min(campaign.contactCount, campaign.failedCount + 1);
      
      if (newSentCount !== campaign.sentCount) {
        updateObj.sentCount = newSentCount;
        needsUpdate = true;
      }
      if (newFailedCount !== campaign.failedCount) {
        updateObj.failedCount = newFailedCount;
        needsUpdate = true;
      }
    } else if (['processing', 'queued'].includes(oldStatus) && newStatus === 'delivered') {
      // Direct transition to delivered (rare but possible)
      const newDeliveredCount = Math.min(campaign.contactCount, campaign.deliveredCount + 1);
      
      if (newDeliveredCount !== campaign.deliveredCount) {
        updateObj.deliveredCount = newDeliveredCount;
        needsUpdate = true;
        
        // Increment actualCost only when message is delivered
        try {
          const messageDoc = await SmsMessage.findById(messageId);
          if (messageDoc && messageDoc.cost) {
            updateObj.$inc = { actualCost: messageDoc.cost };
          }
        } catch (error) {
          console.error(`❌ Error fetching message cost for ${messageId}:`, error);
        }
      }
    } else if (['processing', 'queued'].includes(oldStatus) && ['failed', 'undelivered'].includes(newStatus)) {
      // Direct transition to failed (rare but possible)
      const newFailedCount = Math.min(campaign.contactCount, campaign.failedCount + 1);
      
      if (newFailedCount !== campaign.failedCount) {
        updateObj.failedCount = newFailedCount;
        needsUpdate = true;
      }
    } else {
      console.log(`⚠️ No campaign stat change needed for transition: ${oldStatus} → ${newStatus}`);
      return;
    }

    // Only update if there are actual changes
    if (!needsUpdate) {
      console.log(`⚠️ No bounds-safe changes to apply for campaign: ${campaignId}`);
      return;
    }

    // FINAL SAFEGUARD: Ensure new totals don't exceed contact count
    const newSentCount = updateObj.sentCount ?? campaign.sentCount;
    const newFailedCount = updateObj.failedCount ?? campaign.failedCount;
    const newDeliveredCount = updateObj.deliveredCount ?? campaign.deliveredCount;
    const newTotal = newSentCount + newFailedCount + newDeliveredCount;
    
    if (newTotal > campaign.contactCount) {
      console.log(`⚠️ Update would cause counter overflow (${newTotal} > ${campaign.contactCount}), skipping update for campaign: ${campaignId}`);
      return;
    }

    // Calculate new progress with bounds checking
    const totalProcessed = Math.min(
      campaign.contactCount,
      newSentCount + newFailedCount + newDeliveredCount
    );
    const newProgress = Math.min(100, Math.round((totalProcessed / campaign.contactCount) * 100));
    
    updateObj.progress = newProgress;
    updateObj.updatedAt = new Date();

    // Perform atomic update
    const updatedCampaign = await SmsCampaign.findByIdAndUpdate(
      campaignId, 
      updateObj, 
      { new: true }
    );

    if (updatedCampaign) {
      console.log(`📊 Updated campaign ${campaignId} delivery stats:`, {
        oldStatus,
        newStatus,
        changes: updateObj
      });

      // Check if campaign should be completed
      await checkCampaignCompletion(campaignId);
    }

  } catch (error) {
    console.error(`❌ Error updating campaign delivery stats for ${campaignId}:`, error);
  }
}

/**
 * Check if campaign should be completed based on actual message counts
 */
async function checkCampaignCompletion(campaignId: string): Promise<void> {
  try {
    const campaign = await SmsCampaign.findById(campaignId);
    if (!campaign || campaign.status === 'completed') {
      return;
    }

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

    // Campaign is complete when all messages are processed (no pending messages)
    if (totalPending === 0 && totalMessages > 0 && campaign.status === 'sending') {
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
      
      console.log(`✅ Campaign ${campaignId} completed via delivery report processing:`, {
        sent: finalUpdateObj.sentCount,
        delivered: finalUpdateObj.deliveredCount,
        failed: finalUpdateObj.failedCount,
        actualCost: finalUpdateObj.actualCost,
        totalProcessed,
        contactCount: campaign.contactCount
      });
    }
  } catch (error) {
    console.error(`❌ Error checking campaign completion for ${campaignId}:`, error);
  }
}

/**
 * Clear processed delivery reports tracking (for testing)
 */
// Utility function to clear processed delivery reports (for testing)
function clearProcessedDeliveryReports(): void {
  processedDeliveryReports.clear();
  console.log('🧹 Cleared processed delivery reports tracking');
}