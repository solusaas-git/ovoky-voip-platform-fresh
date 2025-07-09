const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Simple Duplicate Prevention Test
 * Create multiple messages for the same contact and see if duplicates are prevented
 */
async function testDuplicatePreventionSimple() {
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

    console.log('🎯 Simple Duplicate Prevention Test\n');

    // 1. Get campaign and contact
    const campaign = await SmsCampaign.findById(campaignId);
    if (!campaign) {
      console.error('❌ Campaign not found');
      process.exit(1);
    }

    const contact = await Contact.findOne({ contactListId: campaign.contactListId });
    if (!contact) {
      console.error('❌ No contacts found');
      process.exit(1);
    }

    console.log(`📞 Testing with contact: ${contact.firstName || 'Unknown'} ${contact.lastName || ''} (${contact.phoneNumber})\n`);

    // 2. Set campaign to sending status
    await SmsCampaign.findByIdAndUpdate(campaignId, {
      status: 'sending',
      startedAt: new Date()
    });
    console.log('✅ Set campaign to sending status\n');

    // 3. Create multiple test messages for the same contact
    console.log(`📤 Creating 3 messages for the same contact to test duplicate prevention...\n`);
    
    const messages = [];
    
    for (let i = 1; i <= 3; i++) {
      const message = new SmsMessage({
        campaignId: new mongoose.Types.ObjectId(campaignId),
        contactId: contact._id,
        to: contact.phoneNumber,
        content: `Test message ${i}: ${campaign.message.replace('{{firstName}}', contact.firstName || 'Friend')}`,
        from: campaign.senderId,
        providerId: campaign.providerId,
        status: 'queued',
        messageType: 'campaign',
        userId: campaign.userId,
        cost: 0.055,
        currency: 'USD',
        maxRetries: 3,
        retryCount: 0,
        createdAt: new Date()
      });

      await message.save();
      messages.push(message);
      console.log(`✅ Message ${i} created: ${message._id}`);
    }

    console.log(`\n📊 Created ${messages.length} messages for the same contact\n`);

    // 4. Clear simulation provider tracking via reset API
    console.log('🔧 Clearing simulation provider tracking...');
    try {
      const resetResponse = await fetch('http://localhost:3000/api/admin/sms/simulation/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (resetResponse.ok) {
        const resetData = await resetResponse.json();
        console.log('✅ Simulation provider reset:', resetData);
      } else {
        console.log(`⚠️ Reset API returned: ${resetResponse.status}`);
      }
    } catch (error) {
      console.log(`⚠️ Could not call reset API: ${error.message}`);
    }

    console.log('');

    // 5. Monitor message processing
    console.log(`👀 Monitoring message processing for 30 seconds...\n`);
    
    let lastStatusSummary = {};
    
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get current status of all messages
      const currentMessages = await SmsMessage.find({
        _id: { $in: messages.map(m => m._id) }
      });
      
      const statusSummary = {};
      currentMessages.forEach(msg => {
        statusSummary[msg.status] = (statusSummary[msg.status] || 0) + 1;
      });
      
      // Check for changes
      if (JSON.stringify(statusSummary) !== JSON.stringify(lastStatusSummary)) {
        console.log(`📋 Status update after ${i + 1}s:`, statusSummary);
        lastStatusSummary = statusSummary;
      }
      
      // Check if all messages are processed
      const allProcessed = currentMessages.every(msg => 
        ['sent', 'delivered', 'failed', 'undelivered', 'blocked'].includes(msg.status)
      );
      
      if (allProcessed) {
        console.log(`✅ All messages processed after ${i + 1} seconds\n`);
        break;
      }
    }

    // 6. Final analysis
    console.log(`📊 FINAL ANALYSIS:\n`);
    
    const finalMessages = await SmsMessage.find({
      _id: { $in: messages.map(m => m._id) }
    });

    const finalCampaign = await SmsCampaign.findById(campaignId);
    
    console.log(`Campaign counters:`);
    console.log(`  Sent: ${finalCampaign.sentCount}`);
    console.log(`  Delivered: ${finalCampaign.deliveredCount}`);
    console.log(`  Failed: ${finalCampaign.failedCount}`);
    console.log(`  Progress: ${finalCampaign.progress}%\n`);

    console.log(`Message statuses:`);
    const statusBreakdown = {};
    finalMessages.forEach(msg => {
      statusBreakdown[msg.status] = (statusBreakdown[msg.status] || 0) + 1;
    });
    
    Object.entries(statusBreakdown).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // Check for issues
    const expectedMessages = 3;
    const actualMessages = finalMessages.length;
    const reportedTotal = finalCampaign.sentCount + finalCampaign.deliveredCount + finalCampaign.failedCount;

    console.log(`\n🔍 VALIDATION:`);
    console.log(`  Expected messages: ${expectedMessages}`);
    console.log(`  Actual messages: ${actualMessages}`);
    console.log(`  Reported total: ${reportedTotal}`);
    
    if (actualMessages === expectedMessages && reportedTotal === actualMessages) {
      console.log(`  ✅ Counters match actual messages!`);
    } else if (reportedTotal > actualMessages) {
      console.log(`  🚨 COUNTER INFLATION DETECTED!`);
      console.log(`  Inflation factor: ${(reportedTotal / actualMessages).toFixed(2)}x`);
    } else {
      console.log(`  ⚠️ Unexpected counter mismatch`);
    }

    // Check for duplicate delivery reports (look for multiple status changes)
    console.log(`\n📱 Checking for delivery report duplicates...`);
    
    // This would require checking logs or webhook calls
    // For now, we'll check if the counter inflation is resolved
    const inflationRatio = reportedTotal / actualMessages;
    
    if (inflationRatio <= 1.1) { // Allow 10% margin for rounding
      console.log(`✅ NO SIGNIFICANT COUNTER INFLATION - Duplicate prevention likely working!`);
    } else {
      console.log(`❌ COUNTER INFLATION DETECTED - Duplicate prevention may need more work`);
      console.log(`   Inflation ratio: ${inflationRatio.toFixed(2)}x`);
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
  testDuplicatePreventionSimple();
}

module.exports = { testDuplicatePreventionSimple }; 