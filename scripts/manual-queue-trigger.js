const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Manual Queue Trigger
 * Manually trigger SMS queue processing for testing
 */
async function manualQueueTrigger() {
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

    console.log('🎯 Manual Queue Processing Test\n');

    // 1. Check current queue status
    console.log('📊 Checking current queue status...');
    
    const queuedCount = await SmsMessage.countDocuments({ status: 'queued' });
    const processingCount = await SmsMessage.countDocuments({ status: 'processing' });
    const sentCount = await SmsMessage.countDocuments({ status: 'sent' });
    const failedCount = await SmsMessage.countDocuments({ status: 'failed' });
    
    console.log(`   Queued: ${queuedCount}`);
    console.log(`   Processing: ${processingCount}`);
    console.log(`   Sent: ${sentCount}`);
    console.log(`   Failed: ${failedCount}\n`);

    if (queuedCount === 0) {
      console.log('⚠️ No queued messages found. Let me create a test message first...\n');
      
      // Get campaign and contact
      const campaign = await SmsCampaign.findById(campaignId);
      if (!campaign) {
        console.error('❌ Campaign not found');
        process.exit(1);
      }

      const Contact = mongoose.model('Contact', new mongoose.Schema({}, { 
        strict: false, 
        collection: 'smscontacts'
      }));

      const contact = await Contact.findOne({ contactListId: campaign.contactListId });
      if (!contact) {
        console.error('❌ No contacts found');
        process.exit(1);
      }

      // Create test message
      const message = new SmsMessage({
        campaignId: new mongoose.Types.ObjectId(campaignId),
        contactId: contact._id,
        to: contact.phoneNumber,
        content: campaign.message.replace('{{firstName}}', contact.firstName || 'Friend')
                                 .replace('{{lastName}}', contact.lastName || ''),
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
      console.log(`✅ Created test message: ${message._id}`);
      console.log(`📋 Status: ${message.status}\n`);

      // Ensure campaign is in sending status
      if (campaign.status !== 'sending') {
        await SmsCampaign.findByIdAndUpdate(campaignId, {
          status: 'sending',
          startedAt: new Date()
        });
        console.log('✅ Set campaign to sending status\n');
      }
    }

    // 2. Try to trigger queue processing via API
    console.log('🚀 Attempting to trigger queue processing...\n');
    
    try {
      // First try to get queue stats to see if service is running
      const statsResponse = await fetch('http://localhost:3000/api/admin/sms/queue-stats', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('📊 Queue service is running! Stats:', statsData.stats);
      } else if (statsResponse.status === 401 || statsResponse.status === 403) {
        console.log('⚠️ Queue stats API requires authentication');
      } else {
        console.log(`⚠️ Queue stats API returned: ${statsResponse.status}`);
      }
    } catch (error) {
      console.log(`⚠️ Could not call queue stats API: ${error.message}`);
    }

    // Try to trigger campaign processing
    try {
      const processResponse = await fetch(`http://localhost:3000/api/sms/campaigns/${campaignId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (processResponse.ok) {
        const processData = await processResponse.json();
        console.log('✅ Campaign processing triggered:', processData);
      } else {
        console.log(`⚠️ Campaign process API returned: ${processResponse.status}`);
        const errorData = await processResponse.text();
        console.log(`   Error: ${errorData}`);
      }
    } catch (error) {
      console.log(`⚠️ Could not call campaign process API: ${error.message}`);
    }

    // 3. Monitor for changes
    console.log('\n👀 Monitoring for 20 seconds...\n');
    
    let attempts = 0;
    const maxAttempts = 20;
    let lastCounts = { queued: queuedCount, processing: processingCount, sent: sentCount, failed: failedCount };

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const currentCounts = {
        queued: await SmsMessage.countDocuments({ status: 'queued' }),
        processing: await SmsMessage.countDocuments({ status: 'processing' }),
        sent: await SmsMessage.countDocuments({ status: 'sent' }),
        failed: await SmsMessage.countDocuments({ status: 'failed' })
      };
      
      // Check for changes
      if (JSON.stringify(currentCounts) !== JSON.stringify(lastCounts)) {
        console.log(`📋 Change detected after ${attempts + 1}s:`);
        console.log(`   Queued: ${lastCounts.queued} → ${currentCounts.queued}`);
        console.log(`   Processing: ${lastCounts.processing} → ${currentCounts.processing}`);
        console.log(`   Sent: ${lastCounts.sent} → ${currentCounts.sent}`);
        console.log(`   Failed: ${lastCounts.failed} → ${currentCounts.failed}\n`);
        
        lastCounts = currentCounts;
      }
      
      attempts++;
    }

    // 4. Final status
    const finalCounts = {
      queued: await SmsMessage.countDocuments({ status: 'queued' }),
      processing: await SmsMessage.countDocuments({ status: 'processing' }),
      sent: await SmsMessage.countDocuments({ status: 'sent' }),
      failed: await SmsMessage.countDocuments({ status: 'failed' })
    };

    console.log('📊 Final queue status:');
    console.log(`   Queued: ${finalCounts.queued}`);
    console.log(`   Processing: ${finalCounts.processing}`);
    console.log(`   Sent: ${finalCounts.sent}`);
    console.log(`   Failed: ${finalCounts.failed}\n`);

    if (finalCounts.queued > 0) {
      console.log('⚠️ Messages still queued - SMS Queue Service may not be running');
      console.log('💡 The queue service should process queued messages every second when running');
    } else if (finalCounts.sent > 0 || finalCounts.failed > 0) {
      console.log('✅ Messages were processed - SMS Queue Service is working!');
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
  manualQueueTrigger();
}

module.exports = { manualQueueTrigger }; 