const mongoose = require('mongoose');

// Database connection
async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sipp';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }
}

// Define schemas
const smsCampaignSchema = new mongoose.Schema({
  name: String,
  status: String,
  progress: Number,
  sentCount: Number,
  deliveredCount: Number,
  failedCount: Number,
  contactCount: Number,
  createdAt: Date
}, { collection: 'smscampaigns' });

const smsMessageSchema = new mongoose.Schema({
  campaignId: mongoose.Schema.Types.ObjectId,
  status: String,
  to: String,
  retryCount: Number,
  sentAt: Date
}, { collection: 'sms_messages' });

const SmsCampaign = mongoose.model('SmsCampaign', smsCampaignSchema);
const SmsMessage = mongoose.model('SmsMessage', smsMessageSchema);

async function cleanupCompletedCampaigns() {
  try {
    await connectToDatabase();
    console.log('🧹 Cleaning up processing messages from completed campaigns...\n');
    
    // Find completed campaigns
    const completedCampaigns = await SmsCampaign.find({
      status: { $in: ['completed', 'paused'] }
    }).select('_id name status').lean();
    
    console.log('Found completed/paused campaigns:', completedCampaigns.length);
    completedCampaigns.forEach(campaign => {
      console.log(`  - ${campaign.name} (${campaign._id}): ${campaign.status}`);
    });
    
    if (completedCampaigns.length === 0) {
      console.log('No completed campaigns found, nothing to clean up.');
      process.exit(0);
      return;
    }
    
    const completedCampaignIds = completedCampaigns.map(c => c._id);
    
    // Find processing messages from completed campaigns
    const processingMessages = await SmsMessage.find({
      status: 'processing',
      campaignId: { $in: completedCampaignIds }
    });
    
    console.log(`\nFound ${processingMessages.length} processing messages from completed campaigns`);
    
    if (processingMessages.length === 0) {
      console.log('No processing messages to clean up.');
      process.exit(0);
      return;
    }
    
    // Reset processing messages to sent status
    const cleanupResult = await SmsMessage.updateMany(
      {
        status: 'processing',
        campaignId: { $in: completedCampaignIds }
      },
      {
        status: 'sent',
        sentAt: new Date()
      }
    );
    
    console.log(`\n✅ Cleaned up ${cleanupResult.modifiedCount} processing messages`);
    console.log('These messages have been marked as "sent" to prevent further processing.');
    
    // Also clean up any queued messages from completed campaigns
    const queuedCleanupResult = await SmsMessage.updateMany(
      {
        status: 'queued',
        campaignId: { $in: completedCampaignIds }
      },
      {
        status: 'sent',
        sentAt: new Date()
      }
    );
    
    if (queuedCleanupResult.modifiedCount > 0) {
      console.log(`✅ Also cleaned up ${queuedCleanupResult.modifiedCount} queued messages from completed campaigns`);
    }
    
    console.log('\n🎯 Cleanup complete! The SMS Queue Service should no longer process messages from completed campaigns.');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanupCompletedCampaigns(); 