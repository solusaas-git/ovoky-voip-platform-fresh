const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Simple Message Monitoring Test
 * Create messages and monitor their processing
 */
async function testSimpleMonitoring() {
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

    console.log('🎯 Simple Message Monitoring Test\n');

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

    // 3. Create a single message
    console.log(`📤 Creating test message...`);
    
    const message = new SmsMessage({
      campaignId: new mongoose.Types.ObjectId(campaignId),
      contactId: contact._id,
      phoneNumber: contact.phoneNumber,
      message: campaign.message.replace('{{firstName}}', contact.firstName || 'Friend')
                               .replace('{{lastName}}', contact.lastName || ''),
      status: 'queued',
      providerId: campaign.providerId,
      senderId: campaign.senderId,
      country: campaign.country,
      createdAt: new Date()
    });

    await message.save();
    console.log(`✅ Message created: ${message._id}`);
    console.log(`📋 Initial status: ${message.status}\n`);

    // 4. Start campaign (this should trigger queue processing)
    console.log(`🚀 Starting campaign...`);
    await SmsCampaign.findByIdAndUpdate(campaignId, {
      status: 'sending',
      startedAt: new Date()
    });
    console.log(`✅ Campaign status changed to 'sending'\n`);

    // 5. Monitor message status changes
    console.log(`👀 Monitoring message status changes...`);
    
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    let statusHistory = [];
    let lastStatus = 'queued';
    let deliveryReportCount = 0;

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
      
      attempts++;
    }

    // 6. Check for duplicate messages
    console.log(`\n🔍 Checking for duplicate messages...`);
    const duplicateMessages = await SmsMessage.find({
      campaignId: new mongoose.Types.ObjectId(campaignId),
      phoneNumber: contact.phoneNumber
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

    // 7. Check campaign counters
    const finalCampaign = await SmsCampaign.findById(campaignId);
    console.log(`\n📊 Campaign counters after test:`);
    console.log(`   Sent: ${finalCampaign.sentCount}`);
    console.log(`   Delivered: ${finalCampaign.deliveredCount}`);
    console.log(`   Failed: ${finalCampaign.failedCount}`);
    console.log(`   Progress: ${finalCampaign.progress}%`);

    // 8. Final summary
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

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  testSimpleMonitoring();
}

module.exports = { testSimpleMonitoring }; 