const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Sequential SMS Test
 * Send messages one by one and verify each delivery report
 */
async function testSequentialSMS() {
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

    console.log('🎯 Sequential SMS Test\n');

    // 1. Get campaign
    const campaign = await SmsCampaign.findById(campaignId);
    if (!campaign) {
      console.error('❌ Campaign not found');
      process.exit(1);
    }

    console.log(`📋 Campaign: ${campaign.name}`);
    console.log(`📊 Status: ${campaign.status}`);

    if (campaign.status !== 'draft') {
      console.log('🔄 Resetting campaign to draft status...');
      await SmsCampaign.findByIdAndUpdate(campaignId, {
        status: 'draft',
        sentCount: 0,
        failedCount: 0,
        deliveredCount: 0,
        progress: 0,
        actualCost: 0,
        $unset: { startedAt: 1, completedAt: 1 }
      });
      await SmsMessage.deleteMany({ campaignId: new mongoose.Types.ObjectId(campaignId) });
      console.log('✅ Campaign reset to draft\n');
    }

    // 2. Get first 3 contacts for testing
    const contacts = await Contact.find({ contactListId: campaign.contactListId }).limit(3);
    console.log(`📞 Testing with ${contacts.length} contacts\n`);

    // 3. Send messages sequentially
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      console.log(`\n📤 Sending message ${i + 1}/${contacts.length}`);
      console.log(`   To: ${contact.firstName || 'Unknown'} ${contact.lastName || ''} (${contact.phoneNumber})`);

      // Create message
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
      console.log(`   ✅ Message created: ${message._id}`);

      // Send via SMS queue service
      try {
        const response = await fetch('http://localhost:3000/api/sms/campaigns/' + campaignId + '/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId: message._id.toString() })
        });

        if (response.ok) {
          console.log(`   📡 Message sent to provider`);
        } else {
          console.log(`   ❌ Failed to send: ${response.status}`);
          continue;
        }
      } catch (error) {
        console.log(`   ❌ Error sending: ${error.message}`);
        continue;
      }

      // Wait for delivery report
      console.log(`   ⏳ Waiting for delivery report...`);
      
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max
      let finalStatus = null;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const updatedMessage = await SmsMessage.findById(message._id);
        
        if (updatedMessage.status !== 'queued' && updatedMessage.status !== 'processing' && updatedMessage.status !== 'sent') {
          finalStatus = updatedMessage.status;
          console.log(`   ✅ Final status: ${finalStatus} (after ${attempts + 1}s)`);
          break;
        }
        
        if (updatedMessage.status === 'sent') {
          console.log(`   📤 Status: sent (waiting for delivery report...)`);
        }
        
        attempts++;
      }

      if (!finalStatus) {
        console.log(`   ⚠️  Timeout waiting for delivery report (status: ${(await SmsMessage.findById(message._id)).status})`);
      }

      // Check for duplicate messages
      const duplicateMessages = await SmsMessage.find({
        campaignId: new mongoose.Types.ObjectId(campaignId),
        phoneNumber: contact.phoneNumber
      });

      if (duplicateMessages.length > 1) {
        console.log(`   🚨 DUPLICATE DETECTED: ${duplicateMessages.length} messages for same phone number!`);
        duplicateMessages.forEach((msg, idx) => {
          console.log(`      Message ${idx + 1}: ${msg._id} (${msg.status})`);
        });
      } else {
        console.log(`   ✅ No duplicates found`);
      }

      // Check campaign counters
      const updatedCampaign = await SmsCampaign.findById(campaignId);
      console.log(`   📊 Campaign counters: sent=${updatedCampaign.sentCount}, delivered=${updatedCampaign.deliveredCount}, failed=${updatedCampaign.failedCount}`);
    }

    // Final summary
    console.log('\n📊 FINAL SUMMARY');
    console.log('=' .repeat(50));
    
    const finalCampaign = await SmsCampaign.findById(campaignId);
    const allMessages = await SmsMessage.find({ campaignId: new mongoose.Types.ObjectId(campaignId) });
    
    console.log(`Campaign Counters:`);
    console.log(`  Sent: ${finalCampaign.sentCount}`);
    console.log(`  Delivered: ${finalCampaign.deliveredCount}`);
    console.log(`  Failed: ${finalCampaign.failedCount}`);
    console.log(`  Progress: ${finalCampaign.progress}%`);
    
    console.log(`\nActual Messages: ${allMessages.length}`);
    const statusBreakdown = {};
    allMessages.forEach(msg => {
      statusBreakdown[msg.status] = (statusBreakdown[msg.status] || 0) + 1;
    });
    
    Object.entries(statusBreakdown).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // Check for discrepancies
    const expectedTotal = allMessages.length;
    const reportedTotal = finalCampaign.sentCount + finalCampaign.deliveredCount + finalCampaign.failedCount;
    
    if (expectedTotal !== reportedTotal) {
      console.log(`\n🚨 DISCREPANCY DETECTED:`);
      console.log(`   Expected total: ${expectedTotal}`);
      console.log(`   Reported total: ${reportedTotal}`);
      console.log(`   Difference: ${reportedTotal - expectedTotal}`);
    } else {
      console.log(`\n✅ Counters match actual messages!`);
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
  testSequentialSMS();
}

module.exports = { testSequentialSMS }; 