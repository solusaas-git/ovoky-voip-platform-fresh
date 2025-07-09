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
  retryCount: Number
}, { collection: 'sms_messages' });

const SmsCampaign = mongoose.model('SmsCampaign', smsCampaignSchema);
const SmsMessage = mongoose.model('SmsMessage', smsMessageSchema);

async function testQueueCompletionFix() {
  try {
    await connectToDatabase();
    console.log('🔍 Testing SMS Queue Service completion fix...\n');
    
    // Find the test campaign
    const campaign = await SmsCampaign.findOne({ name: 'test 100' }).sort({ createdAt: -1 });
    if (!campaign) {
      console.log('❌ No test campaign found');
      return;
    }
    
    console.log('📊 Campaign Status:', campaign.status);
    console.log('📊 Campaign ID:', campaign._id);
    
    // Check message statuses
    const messageStatuses = await SmsMessage.aggregate([
      { $match: { campaignId: campaign._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    console.log('\n📋 Message Status Breakdown:');
    const statusCounts = {};
    messageStatuses.forEach(status => {
      statusCounts[status._id] = status.count;
      console.log(`  ${status._id}: ${status.count}`);
    });
    
    // Test the queue filtering logic
    console.log('\n🧪 Testing Queue Filtering Logic:');
    
    // Simulate what the SMS Queue Service does
    const activeCampaigns = await SmsCampaign.find({
      status: { $in: ['draft', 'sending'] }
    }).select('_id').lean();
    
    const activeCampaignIds = activeCampaigns.map(c => c._id);
    console.log('Active campaign count:', activeCampaigns.length);
    
    // Check if our test campaign is in the active list
    const isTestCampaignActive = activeCampaignIds.some(id => id.toString() === campaign._id.toString());
    console.log('Test campaign is active:', isTestCampaignActive);
    
    // Check how many messages would be processed by the queue
    const queuedMessages = await SmsMessage.find({
      status: 'queued',
      retryCount: { $lt: 3 },
      $or: [
        { campaignId: { $in: activeCampaignIds } },
        { campaignId: null }
      ]
    }).countDocuments();
    
    const processingMessages = await SmsMessage.find({
      status: 'processing',
      campaignId: campaign._id
    }).countDocuments();
    
    console.log('Queued messages that would be processed:', queuedMessages);
    console.log('Processing messages from test campaign:', processingMessages);
    
    // Verify the fix
    if (campaign.status === 'completed') {
      if (queuedMessages === 0 && processingMessages === 0) {
        console.log('\n✅ SUCCESS: No messages from completed campaign would be processed');
      } else {
        console.log('\n❌ ISSUE: Messages from completed campaign would still be processed');
        console.log('  - Queued messages:', queuedMessages);
        console.log('  - Processing messages:', processingMessages);
      }
    } else {
      console.log('\n⚠️ Campaign is not completed yet, cannot test completion fix');
    }
    
    // Summary
    const totalMessages = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    const totalProcessed = (statusCounts.sent || 0) + (statusCounts.delivered || 0) + (statusCounts.failed || 0) + (statusCounts.undelivered || 0);
    const totalPending = (statusCounts.queued || 0) + (statusCounts.processing || 0);
    
    console.log('\n📈 Summary:');
    console.log(`  Campaign Status: ${campaign.status}`);
    console.log(`  Total Messages: ${totalMessages}`);
    console.log(`  Total Processed: ${totalProcessed}/${campaign.contactCount}`);
    console.log(`  Total Pending: ${totalPending}`);
    console.log(`  Progress: ${campaign.progress}%`);
    
    if (campaign.status === 'completed' && totalPending > 0) {
      console.log('\n🚨 DETECTED ISSUE: Campaign completed but has pending messages!');
      console.log('This indicates the completion fix may not be working properly.');
    } else if (campaign.status === 'completed' && totalPending === 0) {
      console.log('\n✅ GOOD: Campaign completed and no pending messages.');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testQueueCompletionFix(); 