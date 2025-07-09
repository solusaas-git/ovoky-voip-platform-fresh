const mongoose = require('mongoose');
require('dotenv').config();

// Import the SMS queue service directly
const path = require('path');
const { SmsQueueService } = require('../src/lib/services/SmsQueueService.ts');

/**
 * Direct Sequential SMS Test
 * Send messages one by one using SMS queue service directly
 */
async function testSequentialDirect() {
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

    console.log('🎯 Direct Sequential SMS Test\n');

    // 1. Get campaign
    const campaign = await SmsCampaign.findById(campaignId);
    if (!campaign) {
      console.error('❌ Campaign not found');
      process.exit(1);
    }

    console.log(`📋 Campaign: ${campaign.name}`);
    console.log(`📊 Status: ${campaign.status}`);

    // 2. Get first 3 contacts for testing
    const contacts = await Contact.find({ contactListId: campaign.contactListId }).limit(3);
    console.log(`📞 Testing with ${contacts.length} contacts\n`);

    // 3. Initialize SMS queue service
    const smsQueueService = new SmsQueueService();

    // 4. Send messages sequentially
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

      // Send via SMS queue service directly
      try {
        console.log(`   📡 Sending via SMS queue service...`);
        
        // Process this specific message
        await smsQueueService.processMessage(message._id.toString());
        
        console.log(`   ✅ Message processed by queue service`);
      } catch (error) {
        console.log(`   ❌ Error processing: ${error.message}`);
        continue;
      }

      // Wait for delivery report
      console.log(`   ⏳ Waiting for delivery report...`);
      
      let attempts = 0;
      const maxAttempts = 15; // 15 seconds max
      let finalStatus = null;
      let statusHistory = [];

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const updatedMessage = await SmsMessage.findById(message._id);
        const currentStatus = updatedMessage.status;
        
        // Track status changes
        if (statusHistory.length === 0 || statusHistory[statusHistory.length - 1] !== currentStatus) {
          statusHistory.push(currentStatus);
          console.log(`   📋 Status change: ${currentStatus} (after ${attempts + 1}s)`);
        }
        
        if (currentStatus !== 'queued' && currentStatus !== 'processing' && currentStatus !== 'sent') {
          finalStatus = currentStatus;
          console.log(`   ✅ Final status: ${finalStatus} (after ${attempts + 1}s)`);
          break;
        }
        
        attempts++;
      }

      if (!finalStatus) {
        const lastMessage = await SmsMessage.findById(message._id);
        console.log(`   ⚠️  Timeout waiting for delivery report (final status: ${lastMessage.status})`);
        console.log(`   📋 Status history: ${statusHistory.join(' → ')}`);
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
      
      // Small delay between messages
      console.log(`   ⏳ Waiting 2 seconds before next message...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
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
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  testSequentialDirect();
}

module.exports = { testSequentialDirect }; 