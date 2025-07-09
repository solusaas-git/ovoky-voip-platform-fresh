const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Test with Queue Processing
 * Initialize SMS queue service and process messages properly
 */
async function testWithQueueProcessing() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const campaignId = '685860592ba13bb3e98321b4';
    
    // Use correct collection names
    const SmsMessage = mongoose.model('SmsMessage', new mongoose.Schema({}, { 
      strict: false, 
      collection: 'sms_messages'
    }));
    
    const SmsCampaign = mongoose.model('SmsCampaign', new mongoose.Schema({}, { 
      strict: false, 
      collection: 'smscampaigns' 
    }));

    const Contact = mongoose.model('Contact', new mongoose.Schema({}, { 
      strict: false, 
      collection: 'smscontacts'
    }));

    console.log('🎯 Queue Processing Test\n');

    // 1. Get campaign
    const campaign = await SmsCampaign.findById(campaignId);
    if (!campaign) {
      console.error('❌ Campaign not found');
      process.exit(1);
    }

    console.log(`📋 Campaign: ${campaign.name}`);
    console.log(`📊 Status: ${campaign.status}`);

    // 2. Get first contact for testing
    const contact = await Contact.findOne({ contactListId: campaign.contactListId });
    if (!contact) {
      console.error('❌ No contacts found');
      process.exit(1);
    }

    console.log(`📞 Testing with contact: ${contact.firstName || 'Unknown'} ${contact.lastName || ''} (${contact.phoneNumber})\n`);

    // 3. Create a single test message
    console.log(`📤 Creating test message...`);
    
    const message = new SmsMessage({
      campaignId: new mongoose.Types.ObjectId(campaignId),
      contactId: contact._id,
      to: contact.phoneNumber, // Use 'to' field as per SmsMessage schema
      phoneNumber: contact.phoneNumber, // Keep phoneNumber for compatibility
      content: campaign.message.replace('{{firstName}}', contact.firstName || 'Friend')
                               .replace('{{lastName}}', contact.lastName || ''),
      from: campaign.senderId,
      providerId: campaign.providerId,
      status: 'queued',
      messageType: 'campaign',
      userId: campaign.userId,
      cost: 0.055, // Set a test cost
      currency: 'USD',
      maxRetries: 3,
      retryCount: 0,
      createdAt: new Date()
    });

    await message.save();
    console.log(`✅ Message created: ${message._id}`);
    console.log(`📋 Initial status: ${message.status}\n`);

    // 4. Set campaign to sending status
    console.log(`🚀 Setting campaign to sending status...`);
    await SmsCampaign.findByIdAndUpdate(campaignId, {
      status: 'sending',
      startedAt: new Date()
    });
    console.log(`✅ Campaign status changed to 'sending'\n`);

    // 5. Initialize SMS Queue Service
    console.log(`🔧 Initializing SMS Queue Service...`);
    try {
      // Call the initialization endpoint to start queue processing
      const initResponse = await fetch('http://localhost:3000/api/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (initResponse.ok) {
        console.log(`✅ SMS Queue Service initialized via API\n`);
      } else {
        console.log(`⚠️ SMS Queue Service init API returned: ${initResponse.status}\n`);
      }
    } catch (error) {
      console.log(`⚠️ Could not call init API (server may not be running): ${error.message}\n`);
    }

    // 6. Monitor message processing
    console.log(`👀 Monitoring message processing...`);
    
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    let statusHistory = [];
    let lastStatus = 'queued';

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const updatedMessage = await SmsMessage.findById(message._id);
      const currentStatus = updatedMessage.status;
      
      // Track status changes
      if (currentStatus !== lastStatus) {
        statusHistory.push(`${currentStatus} (${attempts + 1}s)`);
        console.log(`📋 Status change: ${lastStatus} → ${currentStatus} (after ${attempts + 1}s)`);
        lastStatus = currentStatus;
      }
      
      // Check for final statuses
      if (currentStatus === 'delivered' || currentStatus === 'failed' || currentStatus === 'undelivered' || currentStatus === 'blocked') {
        console.log(`✅ Final status reached: ${currentStatus} (after ${attempts + 1}s)`);
        break;
      }
      
      // Also show intermediate statuses
      if (currentStatus === 'processing' && attempts % 5 === 0) {
        console.log(`   ⏳ Still processing... (${attempts + 1}s)`);
      }
      
      if (currentStatus === 'sent' && attempts % 3 === 0) {
        console.log(`   📤 Sent, waiting for delivery report... (${attempts + 1}s)`);
      }
      
      attempts++;
    }

    // 7. Check for duplicates
    console.log(`\n🔍 Checking for duplicate messages...`);
    const duplicateMessages = await SmsMessage.find({
      campaignId: new mongoose.Types.ObjectId(campaignId),
      to: contact.phoneNumber
    });

    console.log(`📊 Found ${duplicateMessages.length} messages for phone number ${contact.phoneNumber}`);
    
    if (duplicateMessages.length > 1) {
      console.log(`🚨 DUPLICATE DETECTED!`);
      duplicateMessages.forEach((msg, idx) => {
        console.log(`   Message ${idx + 1}: ${msg._id} (${msg.status}) - Created: ${msg.createdAt}`);
      });
    } else {
      console.log(`✅ No duplicates found`);
    }

    // 8. Check campaign counters
    const finalCampaign = await SmsCampaign.findById(campaignId);
    console.log(`\n📊 Campaign counters after test:`);
    console.log(`   Sent: ${finalCampaign.sentCount}`);
    console.log(`   Delivered: ${finalCampaign.deliveredCount}`);
    console.log(`   Failed: ${finalCampaign.failedCount}`);
    console.log(`   Progress: ${finalCampaign.progress}%`);

    // 9. Final analysis
    console.log(`\n📋 Status history: queued → ${statusHistory.join(' → ')}`);
    console.log(`⏱️  Total monitoring time: ${attempts} seconds`);

    // Expected vs Actual
    const expectedMessages = 1;
    const actualMessages = duplicateMessages.length;
    const reportedTotal = finalCampaign.sentCount + finalCampaign.deliveredCount + finalCampaign.failedCount;

    console.log(`\n🔍 ANALYSIS:`);
    console.log(`   Expected messages: ${expectedMessages}`);
    console.log(`   Actual messages: ${actualMessages}`);
    console.log(`   Reported total: ${reportedTotal}`);
    
    if (actualMessages !== expectedMessages) {
      console.log(`   🚨 MESSAGE DUPLICATION DETECTED!`);
    }
    
    if (reportedTotal !== actualMessages) {
      console.log(`   🚨 COUNTER MISMATCH DETECTED!`);
    }
    
    if (actualMessages === expectedMessages && reportedTotal === actualMessages) {
      console.log(`   ✅ Everything looks correct!`);
    }

    // 10. Check if message was actually processed
    const finalMessage = await SmsMessage.findById(message._id);
    if (finalMessage.status === 'queued') {
      console.log(`\n⚠️  ISSUE: Message remained in 'queued' status`);
      console.log(`   This suggests the SMS Queue Service is not running or not processing messages`);
      console.log(`   The queue processing loop should pick up queued messages every second`);
    } else {
      console.log(`\n✅ Message was processed successfully`);
      console.log(`   Final message status: ${finalMessage.status}`);
      if (finalMessage.providerResponse) {
        console.log(`   Provider response:`, finalMessage.providerResponse);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  testWithQueueProcessing();
}

module.exports = { testWithQueueProcessing }; 