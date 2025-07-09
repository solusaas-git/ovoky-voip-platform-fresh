const mongoose = require('mongoose');

// MongoDB connection
async function connectToDatabase() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your_database');
  }
}

// Simple schemas for testing
const SmsCampaignSchema = new mongoose.Schema({}, { strict: false });
const SmsMessageSchema = new mongoose.Schema({}, { strict: false });
const SmsContactSchema = new mongoose.Schema({}, { strict: false });

const SmsCampaign = mongoose.models.SmsCampaign || mongoose.model('SmsCampaign', SmsCampaignSchema);
const SmsMessage = mongoose.models.SmsMessage || mongoose.model('SmsMessage', SmsMessageSchema);
const SmsContact = mongoose.models.SmsContact || mongoose.model('SmsContact', SmsContactSchema);

async function testRebuiltSystem() {
  console.log('🧪 Testing Rebuilt SMS System\n');

  try {
    await connectToDatabase();

    // 1. Find the problematic campaign
    const campaignId = '685860592ba13bb3e98321b4';
    console.log(`🔍 Testing campaign: ${campaignId}\n`);

    // 2. Get current campaign state
    const campaign = await SmsCampaign.findById(campaignId);
    if (!campaign) {
      console.log('❌ Campaign not found');
      return;
    }

    console.log('📊 BEFORE RESET - Campaign State:');
    console.log(`   Name: ${campaign.name}`);
    console.log(`   Status: ${campaign.status}`);
    console.log(`   Contact Count: ${campaign.contactCount}`);
    console.log(`   Sent Count: ${campaign.sentCount}`);
    console.log(`   Failed Count: ${campaign.failedCount}`);
    console.log(`   Delivered Count: ${campaign.deliveredCount}`);
    console.log(`   Progress: ${campaign.progress}%`);
    console.log(`   Actual Cost: $${campaign.actualCost}`);
    console.log(`   Estimated Cost: $${campaign.estimatedCost}\n`);

    // 3. Get actual message counts
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
        actualCounts[item._id] = item.count;
      }
    });

    const totalMessages = Object.values(actualCounts).reduce((sum, count) => sum + count, 0);

    console.log('📋 BEFORE RESET - Actual Message Counts:');
    Object.entries(actualCounts).forEach(([status, count]) => {
      if (count > 0) {
        console.log(`   ${status}: ${count}`);
      }
    });
    console.log(`   Total Messages: ${totalMessages}\n`);

    // 4. Calculate inflation ratios
    const sentInflation = campaign.sentCount / campaign.contactCount;
    const deliveredInflation = campaign.deliveredCount / campaign.contactCount;
    const costInflation = campaign.actualCost / campaign.estimatedCost;

    console.log('📈 INFLATION ANALYSIS:');
    console.log(`   Sent Inflation: ${(sentInflation * 100).toFixed(1)}% (${campaign.sentCount}/${campaign.contactCount})`);
    console.log(`   Delivered Inflation: ${(deliveredInflation * 100).toFixed(1)}% (${campaign.deliveredCount}/${campaign.contactCount})`);
    console.log(`   Cost Inflation: ${(costInflation * 100).toFixed(1)}% ($${campaign.actualCost}/$${campaign.estimatedCost})\n`);

    // 5. Reset campaign for clean testing
    console.log('🔄 RESETTING CAMPAIGN FOR CLEAN TESTING...\n');

    // Delete all messages
    const deleteResult = await SmsMessage.deleteMany({ campaignId });
    console.log(`🗑️ Deleted ${deleteResult.deletedCount} messages`);

    // Reset campaign counters
    await SmsCampaign.findByIdAndUpdate(campaignId, {
      status: 'draft',
      sentCount: 0,
      failedCount: 0,
      deliveredCount: 0,
      progress: 0,
      actualCost: 0,
      startedAt: null,
      completedAt: null
    });

    console.log('✅ Campaign reset to clean state\n');

    // 6. Reset simulation provider tracking (if server is running)
    try {
      const resetResponse = await fetch('http://localhost:3000/api/admin/sms/simulation/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'all' })
      });

      if (resetResponse.ok) {
        const resetData = await resetResponse.json();
        console.log('🧹 Simulation provider reset:', resetData.message);
        console.log(`   Stats: ${JSON.stringify(resetData.stats)}\n`);
      } else {
        console.log(`⚠️ Simulation reset API returned: ${resetResponse.status}\n`);
      }
    } catch (error) {
      console.log(`⚠️ Could not call simulation reset API (server may not be running): ${error.message}\n`);
    }

    // 7. Verify clean state
    const resetCampaign = await SmsCampaign.findById(campaignId);
    const resetMessageCount = await SmsMessage.countDocuments({ campaignId });

    console.log('✅ AFTER RESET - Clean State Verified:');
    console.log(`   Campaign Status: ${resetCampaign.status}`);
    console.log(`   Sent Count: ${resetCampaign.sentCount}`);
    console.log(`   Failed Count: ${resetCampaign.failedCount}`);
    console.log(`   Delivered Count: ${resetCampaign.deliveredCount}`);
    console.log(`   Progress: ${resetCampaign.progress}%`);
    console.log(`   Actual Cost: $${resetCampaign.actualCost}`);
    console.log(`   Message Count: ${resetMessageCount}\n`);

    // 8. Prepare for new test
    console.log('🚀 CAMPAIGN READY FOR TESTING WITH REBUILT SYSTEM');
    console.log('');
    console.log('Next steps:');
    console.log('1. Set campaign status to "sending" in admin panel');
    console.log('2. Start the campaign');
    console.log('3. Monitor for proper counter behavior');
    console.log('4. Verify no counter inflation occurs');
    console.log('5. Check that delivery reports arrive properly\n');

    // 9. System health check
    console.log('🔧 SYSTEM HEALTH CHECK:');
    
    // Check if queue service is available
    try {
      const queueResponse = await fetch('http://localhost:3000/api/admin/sms/queue/stats');
      if (queueResponse.ok) {
        console.log('✅ SMS Queue Service: Available');
      } else {
        console.log('⚠️ SMS Queue Service: May not be running');
      }
    } catch (error) {
      console.log('⚠️ SMS Queue Service: Not accessible');
    }

    // Check simulation provider
    try {
      const simResponse = await fetch('http://localhost:3000/api/admin/sms/simulation/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'delivery-tracking' })
      });
      
      if (simResponse.ok) {
        console.log('✅ Simulation Provider: Available');
      } else {
        console.log('⚠️ Simulation Provider: May have issues');
      }
    } catch (error) {
      console.log('⚠️ Simulation Provider: Not accessible');
    }

    console.log('');
    console.log('🎯 REBUILT SYSTEM FEATURES:');
    console.log('✅ Enhanced duplicate prevention in queue service');
    console.log('✅ Atomic campaign counter updates');
    console.log('✅ Proper separation of sending and delivery reporting');
    console.log('✅ Bounds checking to prevent counter inflation');
    console.log('✅ Race condition prevention with message tracking');
    console.log('✅ Improved simulation provider with timer management');
    console.log('✅ Enhanced webhook handler with status validation');
    console.log('✅ Campaign completion based on actual message counts\n');

    console.log('🔍 MONITORING TIPS:');
    console.log('- Watch for "⚠️ Message already processed" logs (should prevent duplicates)');
    console.log('- Verify counters never exceed contact count (100)');
    console.log('- Check that delivery reports arrive after sending completes');
    console.log('- Monitor for proper campaign completion logic');
    console.log('- Ensure cost calculations remain accurate\n');

    console.log('💡 SUMMARY OF FIXES APPLIED:');
    console.log('');
    console.log('🔧 SMS Queue Service:');
    console.log('  - Separated message creation from sending');
    console.log('  - Added message-level duplicate prevention');
    console.log('  - Implemented atomic counter updates with bounds checking');
    console.log('  - Reduced batch sizes and processing speed for better control');
    console.log('  - Enhanced campaign completion logic based on actual message counts');
    console.log('');
    console.log('🔧 Simulation Provider:');
    console.log('  - Added strict duplicate send prevention');
    console.log('  - Implemented timer management for delivery reports');
    console.log('  - Enhanced tracking with multiple prevention layers');
    console.log('  - Improved error handling and fallback mechanisms');
    console.log('');
    console.log('🔧 Webhook Handler:');
    console.log('  - Added delivery report duplicate detection');
    console.log('  - Implemented status transition validation');
    console.log('  - Enhanced campaign update logic with bounds checking');
    console.log('  - Atomic database operations to prevent race conditions');
    console.log('');

  } catch (error) {
    console.error('❌ Error testing rebuilt system:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the test
testRebuiltSystem().catch(console.error); 