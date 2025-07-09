const path = require('path');
const mongoose = require('mongoose');

// Database connection
async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sipp';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }
}

// Define schemas directly
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

async function checkCurrentStatus() {
  try {
    await connectToDatabase();
    
    // Find the most recent test campaign
    const campaign = await SmsCampaign.findOne({ name: 'test 100' }).sort({ createdAt: -1 });
    if (!campaign) {
      console.log('❌ No test campaign found');
      return;
    }
    
    console.log('📊 Campaign Status:', campaign.status);
    console.log('📊 Campaign ID:', campaign._id);
    console.log('📊 Campaign Progress:', campaign.progress + '%');
    console.log('📊 Campaign Counters:', {
      sent: campaign.sentCount,
      delivered: campaign.deliveredCount,
      failed: campaign.failedCount,
      contactCount: campaign.contactCount
    });
    
    // Check actual message statuses
    const messageStatuses = await SmsMessage.aggregate([
      { $match: { campaignId: campaign._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    console.log('\n📋 Actual Message Statuses:');
    const statusCounts = {};
    messageStatuses.forEach(status => {
      statusCounts[status._id] = status.count;
      console.log(`  ${status._id}: ${status.count}`);
    });
    
    // Check for processing messages specifically
    const processingMessages = await SmsMessage.find({ 
      campaignId: campaign._id, 
      status: 'processing' 
    }).limit(3);
    
    if (processingMessages.length > 0) {
      console.log('\n⚠️ Processing Messages Found:');
      processingMessages.forEach(msg => {
        console.log(`  ID: ${msg._id}, Retry: ${msg.retryCount}, To: ${msg.to}`);
      });
    }
    
    // Calculate totals
    const totalMessages = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    const totalProcessed = (statusCounts.sent || 0) + (statusCounts.delivered || 0) + (statusCounts.failed || 0) + (statusCounts.undelivered || 0);
    const totalPending = (statusCounts.queued || 0) + (statusCounts.processing || 0);
    
    console.log('\n📈 Summary:');
    console.log(`  Total Messages: ${totalMessages}`);
    console.log(`  Total Processed: ${totalProcessed}`);
    console.log(`  Total Pending: ${totalPending}`);
    console.log(`  Expected Contact Count: ${campaign.contactCount}`);
    
    if (campaign.status === 'completed' && totalPending > 0) {
      console.log('\n🚨 ISSUE DETECTED: Campaign is completed but has pending messages!');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkCurrentStatus(); 