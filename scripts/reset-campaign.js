const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Simple campaign reset script
 * Resets campaign to clean state when issues are detected
 */
async function resetCampaign() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const campaignId = process.argv[2] || '685860592ba13bb3e98321b4';
    
    if (!campaignId) {
      console.error('❌ Please provide campaign ID as argument');
      console.log('Usage: node scripts/reset-campaign.js <campaignId>');
      process.exit(1);
    }

    // Use correct collection names
    const SmsMessage = mongoose.model('SmsMessage', new mongoose.Schema({}, { 
      strict: false, 
      collection: 'sms_messages'
    }));
    
    const SmsCampaign = mongoose.model('SmsCampaign', new mongoose.Schema({}, { 
      strict: false, 
      collection: 'smscampaigns' 
    }));

    console.log(`🎯 Resetting campaign: ${campaignId}\n`);

    // 1. Get campaign
    const campaign = await SmsCampaign.findById(campaignId);
    if (!campaign) {
      console.error('❌ Campaign not found');
      process.exit(1);
    }

    console.log(`📋 Campaign: ${campaign.name}`);
    console.log(`📊 Contact Count: ${campaign.contactCount}`);

    // 2. Delete all messages for this campaign
    const deleteResult = await SmsMessage.deleteMany({ 
      campaignId: new mongoose.Types.ObjectId(campaignId) 
    });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} messages`);

    // 3. Reset campaign counters
    const resetData = {
      status: 'draft',
      sentCount: 0,
      failedCount: 0,
      deliveredCount: 0,
      progress: 0,
      actualCost: 0,
      $unset: {
        startedAt: 1,
        completedAt: 1
      }
    };

    await SmsCampaign.findByIdAndUpdate(campaignId, resetData);
    console.log('🔄 Reset campaign counters and status');

    // 4. Reset simulation provider tracking (if available)
    try {
      const response = await fetch('http://localhost:3000/api/admin/sms/simulation/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'delivery-tracking',
          campaignId: campaignId
        })
      });
      
      if (response.ok) {
        console.log('🧹 Cleared simulation provider tracking');
      }
    } catch (error) {
      console.log('⚠️  Could not reset simulation provider (server may not be running)');
    }

    console.log('\n✅ Campaign reset completed successfully!');
    console.log('\n📋 Final State:');
    console.log('   - Status: draft');
    console.log('   - All counters: 0');
    console.log('   - All messages: deleted');
    console.log('   - Ready for fresh testing');

  } catch (error) {
    console.error('❌ Error resetting campaign:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  resetCampaign();
}

module.exports = { resetCampaign }; 