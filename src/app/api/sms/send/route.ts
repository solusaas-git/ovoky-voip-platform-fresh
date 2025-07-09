import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import SmsProvider from '@/models/SmsGateway';
import SmsUserProviderAssignment from '@/models/SmsUserProviderAssignment';
import SmsMessage from '@/models/SmsMessage';
import SmsBlacklistedNumber from '@/models/SmsBlacklistedNumber';
import SmsKeywordBlacklist from '@/models/SmsKeywordBlacklist';
import SmsSenderId from '@/models/SmsSenderId';
import SmsRate from '@/models/SmsRate';
import RateDeckAssignment from '@/models/RateDeckAssignment';
import mongoose from 'mongoose';

interface SendSmsRequest {
  to: string;
  content: string;
  senderId?: string;
  gatewayId?: string;
  country: string;
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body: SendSmsRequest = await request.json();
    const { to, content, senderId, gatewayId, country } = body;

    // Validate required fields
    if (!to || !content || !country) {
      return NextResponse.json(
        { error: 'Phone number, content, and country are required' },
        { status: 400 }
      );
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?\d{7,15}$/;
    if (!phoneRegex.test(to)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Check if phone number is blacklisted
    const isBlacklisted = await SmsBlacklistedNumber.isBlacklisted(userId, to);
    if (isBlacklisted) {
      return NextResponse.json(
        { error: 'Phone number is blacklisted and cannot receive SMS messages' },
        { status: 400 }
      );
    }

    // Check message against keyword blacklist
    const blacklistCheck = await SmsKeywordBlacklist.checkMessage(content);
    if (blacklistCheck.blocked) {
      return NextResponse.json(
        { 
          error: 'Message contains blocked keywords',
          blockedKeywords: blacklistCheck.matchedKeywords
        },
        { status: 400 }
      );
    }

    // Get user's SMS rate deck assignment
    const rateDeckAssignment = await RateDeckAssignment.findOne({
      userId,
      rateDeckType: 'sms',
      isActive: true
    }).populate('rateDeckId');

    if (!rateDeckAssignment) {
      console.log(`❌ No SMS rate deck assignment found for user ${userId}`);
      return NextResponse.json(
        { error: 'No SMS rate deck assigned to user' },
        { status: 400 }
      );
    }

    console.log(`✅ Found SMS rate deck assignment for user ${userId}: ${rateDeckAssignment.rateDeckId?._id}`);

    // Find rate for the destination country
    const matchedRate = await SmsRate.findOne({
      rateDeckId: rateDeckAssignment.rateDeckId,
      country: country
    });

    if (!matchedRate) {
      return NextResponse.json(
        { error: `No rate found for destination country: ${country}` },
        { status: 400 }
      );
    }

    // Validate sender ID if provided
    let senderIdDoc = null;
    if (senderId) {
      // Check if senderId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(senderId)) {
        console.log(`❌ Invalid sender ID format: ${senderId}`);
        return NextResponse.json(
          { error: 'Invalid sender ID format' },
          { status: 400 }
        );
      }

      senderIdDoc = await SmsSenderId.findOne({
        userId,
        _id: senderId,
        status: 'approved'
      });

      if (!senderIdDoc) {
        console.log(`❌ Sender ID not found or not approved: ${senderId}`);
        return NextResponse.json(
          { error: 'Invalid or unapproved sender ID' },
          { status: 400 }
        );
      }
      
      console.log(`✅ Found approved sender ID: ${senderIdDoc.senderId}`);
    }

    // Get user's assigned SMS gateways
    const providerAssignments = await SmsUserProviderAssignment.findActiveByUserId(userId);
    if (providerAssignments.length === 0) {
      return NextResponse.json(
        { error: 'No SMS gateways assigned to user' },
        { status: 400 }
      );
    }

    // Select gateway based on gatewayId if provided, otherwise use highest priority
    let selectedProvider = null;
    
    if (gatewayId) {
      // Find specific gateway requested by user
      selectedProvider = providerAssignments.find(assignment => 
        assignment.providerId && assignment.providerId._id.toString() === gatewayId
      );
      
      if (!selectedProvider) {
        return NextResponse.json(
          { error: 'Requested gateway not assigned to user or inactive' },
          { status: 400 }
        );
      }
      
      // Check limits for the specific gateway
      if ((selectedProvider.dailyLimit && selectedProvider.dailyUsage >= selectedProvider.dailyLimit) ||
          (selectedProvider.monthlyLimit && selectedProvider.monthlyUsage >= selectedProvider.monthlyLimit)) {
        return NextResponse.json(
          { error: 'Selected gateway has exceeded usage limits' },
          { status: 400 }
        );
      }
      
      // Check if gateway is active
      if (!selectedProvider.providerId || !(selectedProvider.providerId as any).isActive) {
        return NextResponse.json(
          { error: 'Selected gateway is inactive' },
          { status: 400 }
        );
      }
    } else {
      // Auto-select the highest priority gateway that hasn't exceeded limits
      for (const assignment of providerAssignments) {
        // Check daily limit
        if (assignment.dailyLimit && assignment.dailyUsage >= assignment.dailyLimit) {
          continue;
        }
        
        // Check monthly limit
        if (assignment.monthlyLimit && assignment.monthlyUsage >= assignment.monthlyLimit) {
          continue;
        }

        // Check if gateway is active
        if (assignment.providerId && (assignment.providerId as any).isActive) {
          selectedProvider = assignment;
          break;
        }
      }

      if (!selectedProvider) {
        return NextResponse.json(
          { error: 'No available SMS gateways (limits exceeded or inactive)' },
          { status: 400 }
        );
      }
    }

    // Calculate message cost
    const messageCost = matchedRate.rate;

    // Check billing before sending (for threshold-based billing)
    try {
      const { SMSBillingService } = await import('@/lib/services/smsBillingService');
      const billingCheck = await SMSBillingService.checkBillingBeforeSend({
        userId,
        messageCount: 1,
        totalCost: messageCost,
        country,
        prefix: matchedRate.prefix,
        messageType: 'single'
      });

      // Block if user has pending billings and manual approval is required
      if (billingCheck.shouldBlock) {
        return NextResponse.json(
          { error: `SMS blocked: ${billingCheck.reason}` },
          { status: 400 }
        );
      }
    } catch (billingError) {
      console.error('Billing check error:', billingError);
      // Don't block SMS on billing check errors
    }

    // Create SMS message record
    const smsMessage = new SmsMessage({
      userId,
      to,
      content,
      from: senderIdDoc?.senderId,
      senderId: senderIdDoc?._id,
      providerId: selectedProvider.providerId,
      cost: messageCost,
      currency: 'USD',
      rateDeckId: rateDeckAssignment.rateDeckId,
      prefix: matchedRate.prefix,
      messageType: 'single',
      status: 'pending'
    });

    await smsMessage.save();

    // Send SMS via selected provider (supports both real and simulation providers)
    try {
      let providerResponse;
      
      // Check if this is a simulation provider
      if ((selectedProvider.providerId as any)?.provider === 'simulation') {
        console.log(`🎭 Using simulation provider: ${(selectedProvider.providerId as any)?.displayName}`);
        // Import simulation provider
        const { smsSimulationProvider } = await import('@/lib/services/SmsSimulationProvider');
        
        // Use the simulation type from provider settings
        const configType = (selectedProvider.providerId as any)?.settings?.simulationType || 'standard';
        
        providerResponse = await smsSimulationProvider.sendSms(
          to,
          content,
          senderIdDoc?.senderId,
          configType,
          smsMessage._id?.toString()
        );
      } else {
        // Real provider integration - implement actual API calls
        const providerType = (selectedProvider.providerId as any)?.provider;
        console.log(`📡 Using real provider: ${(selectedProvider.providerId as any)?.displayName} (${providerType})`);
        
        switch (providerType) {
          case 'twilio':
            providerResponse = await sendViaTwilio(
              selectedProvider.providerId,
              to,
              content,
              senderIdDoc?.senderId
            );
            break;
            
          case 'messagebird':
            providerResponse = await sendViaMessageBird(
              selectedProvider.providerId,
              to,
              content,
              senderIdDoc?.senderId
            );
            break;
            
          case 'aws-sns':
            providerResponse = await sendViaAWSSNS(
              selectedProvider.providerId,
              to,
              content,
              senderIdDoc?.senderId
            );
            break;
            
          case 'smsenvoi':
            providerResponse = await sendViaSMSenvoi(
              selectedProvider.providerId,
              to,
              content,
              senderIdDoc?.senderId
            );
            break;
            
          default:
            throw new Error(`Provider integration not implemented: ${providerType}. Please use a simulation provider for testing or contact support to implement ${providerType} integration.`);
        }
      }

      // Update message status based on provider response
      smsMessage.status = providerResponse.success ? 'sent' : 'failed';
      smsMessage.messageId = providerResponse.messageId;
      smsMessage.providerResponse = providerResponse;
      smsMessage.sentAt = providerResponse.success ? new Date() : undefined;
      smsMessage.errorMessage = providerResponse.error;

      await smsMessage.save();

      // Update usage counters if message was sent successfully
      if (providerResponse.success) {
        await SmsUserProviderAssignment.incrementUsage(userId, selectedProvider.providerId._id.toString());
        await SmsProvider.findByIdAndUpdate(selectedProvider.providerId._id, {
          $inc: { usageCount: 1, dailyUsage: 1, monthlyUsage: 1 }
        });
        
        if (senderIdDoc) {
          await SmsSenderId.findByIdAndUpdate(senderIdDoc._id, {
            $inc: { usageCount: 1 },
            $set: { lastUsedAt: new Date() }
          });
        }

        // Process billing after successful send (for threshold-based billing)
        try {
          const { SMSBillingService } = await import('@/lib/services/smsBillingService');
          await SMSBillingService.processBillingAfterSend({
            userId,
            messageCount: 1,
            totalCost: messageCost,
            country,
            prefix: matchedRate.prefix,
            messageType: 'single'
          });
        } catch (billingError) {
          console.error('Billing processing error:', billingError);
          // Don't fail SMS on billing errors
        }
      }

      return NextResponse.json({
        success: true,
        messageId: smsMessage._id,
        providerMessageId: providerResponse.messageId,
        cost: messageCost,
        currency: 'USD',
        status: smsMessage.status
      });

    } catch (providerError) {
      // Update message status to failed
      smsMessage.status = 'failed';
      smsMessage.errorMessage = providerError instanceof Error ? providerError.message : 'Unknown provider error';
      smsMessage.failedAt = new Date();
      await smsMessage.save();

      return NextResponse.json(
        { error: 'Failed to send SMS', details: smsMessage.errorMessage },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('SMS send error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Real provider integration functions
async function sendViaTwilio(
  provider: any,
  to: string,
  content: string,
  from?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // TODO: Implement Twilio API integration
    // const twilio = require('twilio');
    // const client = twilio(provider.apiKey, provider.apiSecret);
    // const message = await client.messages.create({
    //   body: content,
    //   from: from || provider.defaultSenderId,
    //   to: to
    // });
    // return { success: true, messageId: message.sid };
    
    throw new Error('Twilio integration not yet implemented. Please configure Twilio API credentials and implement the integration.');
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Twilio API error'
    };
  }
}

async function sendViaMessageBird(
  provider: any,
  to: string,
  content: string,
  from?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // TODO: Implement MessageBird API integration
    // const messagebird = require('messagebird');
    // const client = messagebird(provider.apiKey);
    // const result = await client.messages.create({
    //   originator: from || provider.defaultSenderId,
    //   recipients: [to],
    //   body: content
    // });
    // return { success: true, messageId: result.id };
    
    throw new Error('MessageBird integration not yet implemented. Please configure MessageBird API credentials and implement the integration.');
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'MessageBird API error'
    };
  }
}

async function sendViaAWSSNS(
  provider: any,
  to: string,
  content: string,
  from?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // TODO: Implement AWS SNS integration
    // const AWS = require('aws-sdk');
    // const sns = new AWS.SNS({
    //   accessKeyId: provider.apiKey,
    //   secretAccessKey: provider.apiSecret,
    //   region: provider.region || 'us-east-1'
    // });
    // const result = await sns.publish({
    //   PhoneNumber: to,
    //   Message: content,
    //   MessageAttributes: {
    //     'AWS.SNS.SMS.SenderID': {
    //       DataType: 'String',
    //       StringValue: from || provider.defaultSenderId
    //     }
    //   }
    // }).promise();
    // return { success: true, messageId: result.MessageId };
    
    throw new Error('AWS SNS integration not yet implemented. Please configure AWS SNS credentials and implement the integration.');
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AWS SNS API error'
    };
  }
}

async function sendViaSMSenvoi(
  provider: any,
  to: string,
  content: string,
  from?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    console.log(`📤 SMSenvoi: Sending SMS to ${to}`);
    console.log(`🔍 SMSenvoi: Provider data received:`, {
      id: provider._id,
      name: provider.name,
      displayName: provider.displayName,
      provider: provider.provider,
      isActive: provider.isActive,
      apiEndpoint: provider.apiEndpoint,
      hasApiKey: !!provider.apiKey,
      hasApiSecret: !!provider.apiSecret,
      apiKeyLength: provider.apiKey?.length || 0,
      apiSecretLength: provider.apiSecret?.length || 0,
      settings: provider.settings
    });
    
    // Validate required credentials
    if (!provider.apiKey || !provider.apiSecret) {
      console.error(`❌ SMSenvoi: Missing credentials - apiKey: ${!!provider.apiKey}, apiSecret: ${!!provider.apiSecret}`);
      throw new Error('SMSenvoi credentials missing. Please configure username and password in provider settings.');
    }

    // Ensure baseUrl ends with a slash
    let baseUrl = provider.apiEndpoint || 'https://api.smsenvoi.com/API/v1.0/REST';
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }
    
    // Step 1: Authenticate to get user_key and session_key
    const authUrl = `${baseUrl}login?username=${encodeURIComponent(provider.apiKey)}&password=${encodeURIComponent(provider.apiSecret)}`;
    
    console.log(`🔐 SMSenvoi: Authenticating with URL: ${authUrl}`);
    const authResponse = await fetch(authUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!authResponse.ok) {
      console.error(`❌ SMSenvoi: Authentication failed - Status: ${authResponse.status}, StatusText: ${authResponse.statusText}`);
      const errorText = await authResponse.text();
      console.error(`❌ SMSenvoi: Authentication error response: ${errorText}`);
      throw new Error(`SMSenvoi authentication failed: ${authResponse.status} ${authResponse.statusText} - ${errorText}`);
    }

    const authData = await authResponse.text();
    console.log(`📋 SMSenvoi: Raw auth response: ${authData}`);
    
    const [userKey, sessionKey] = authData.split(';');
    
    if (!userKey || !sessionKey) {
      console.error(`❌ SMSenvoi: Invalid auth response format - userKey: ${userKey}, sessionKey: ${sessionKey}`);
      throw new Error('SMSenvoi authentication failed: Invalid response format');
    }

    console.log(`✅ SMSenvoi: Authentication successful - userKey: ${userKey.substring(0, 10)}..., sessionKey: ${sessionKey.substring(0, 10)}...`);

    // Step 2: Send SMS
    const smsUrl = `${baseUrl}sms`;
    
    // Clean phone number format for SMSenvoi 
    // SMSenvoi expects phone numbers in international format WITHOUT the + sign
    let cleanedPhone = to.replace(/[\s+\-()]/g, '');
    
    // Ensure the phone number has proper international format
    // For France (+33), remove the leading + and ensure it starts with 33
    if (cleanedPhone.startsWith('33') && cleanedPhone.length >= 11) {
      // French number format is correct (33XXXXXXXXX)
    } else if (cleanedPhone.startsWith('0') && cleanedPhone.length === 10) {
      // Convert French local format (0XXXXXXXXX) to international (33XXXXXXXXX)
      cleanedPhone = '33' + cleanedPhone.substring(1);
    } else if (!cleanedPhone.match(/^\d+$/)) {
      // Ensure only digits remain
      cleanedPhone = cleanedPhone.replace(/\D/g, '');
    }
    
    console.log(`📞 SMSenvoi: Phone number formatting - Original: ${to}, Cleaned: ${cleanedPhone}`);
    
    // Prepare SMS payload according to SMSenvoi API
    const smsPayload = {
      message: content,
      message_type: provider.settings?.messageType || 'PRM', // PRM = Premium quality, -- = Standard
      recipient: [cleanedPhone], // Array of recipients - phone number without + sign
      returnCredits: true,
      ...(from && { sender: from }) // Optional sender ID
    };

    console.log(`📤 SMSenvoi: Sending SMS with payload:`, { 
      ...smsPayload, 
      recipient: smsPayload.recipient
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
      console.error(`❌ SMSenvoi: SMS send failed - Status: ${smsResponse.status}, Error: ${errorText}`);
      throw new Error(`SMSenvoi SMS send failed: ${smsResponse.status} ${smsResponse.statusText} - ${errorText}`);
    }

    const smsResult = await smsResponse.json();
    
    console.log(`📊 SMSenvoi: Response received:`, smsResult);

    // Check if the SMS was sent successfully
    if (smsResult.result === 'OK') {
      return {
        success: true,
        messageId: smsResult.order_id || smsResult.internal_order_id
      };
    } else {
      return {
        success: false,
        error: `SMSenvoi error: ${smsResult.result || 'Unknown error'}`
      };
    }

  } catch (error) {
    console.error('❌ SMSenvoi error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'SMSenvoi API error'
    };
  }
} 