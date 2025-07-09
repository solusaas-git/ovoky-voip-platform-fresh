#!/usr/bin/env node

/**
 * Fix Campaign Provider Assignment Script
 * 
 * This script fixes any existing SMS messages that might have incorrect provider assignments
 * due to the previous round-robin provider selection logic. It ensures all messages use
 * the provider that was actually selected for their campaign.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectToDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sipp');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

// Define schemas (simplified for the script)
const SmsMessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'SmsCampaign' },
  to: String,
  content: String,
  from: String,
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'SmsProvider' },
  status: String,
  cost: Number,
  currency: String,
  rateDeckId: { type: mongoose.Schema.Types.ObjectId },
  prefix: String,
  messageType: String,
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  errorMessage: String
}, { timestamps: true });

const SmsCampaignSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  description: String,
  status: String,
  contactListId: { type: mongoose.Schema.Types.ObjectId, ref: 'SmsContactList' },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'SmsTemplate' },
  message: String,
  senderId: String,
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'SmsProvider' },
  country: String,
  contactCount: Number,
  sentCount: Number,
  failedCount: Number,
  deliveredCount: Number,
  estimatedCost: Number,
  actualCost: Number,
  progress: Number
}, { timestamps: true });

const SmsProviderSchema = new mongoose.Schema({
  name: String,
  displayName: String,
  type: String,
  provider: String,
  isActive: Boolean,
  apiEndpoint: String,
  supportedCountries: [String],
  rateLimit: {
    messagesPerSecond: Number,
    messagesPerMinute: Number,
    messagesPerHour: Number
  },
  settings: mongoose.Schema.Types.Mixed
}, { timestamps: true });

// Create models
const SmsMessage = mongoose.model('SmsMessage', SmsMessageSchema);
const SmsCampaign = mongoose.model('SmsCampaign', SmsCampaignSchema);
const SmsProvider = mongoose.model('SmsProvider', SmsProviderSchema);

async function fixProviderAssignments() {
  console.log('🔧 Starting provider assignment fix...\n');

  try {
    // Find all campaigns with their associated messages
    const campaigns = await SmsCampaign.find({}).lean();
    console.log(`📋 Found ${campaigns.length} campaigns to check`);

    let totalFixed = 0;
    let totalChecked = 0;

    for (const campaign of campaigns) {
      console.log(`\n🔍 Checking campaign: ${campaign.name} (${campaign._id})`);
      console.log(`   Selected provider: ${campaign.providerId}`);

      // Find messages for this campaign that might have wrong provider
      const messages = await SmsMessage.find({
        campaignId: campaign._id,
        status: { $in: ['queued', 'processing', 'pending'] } // Only fix pending/queued messages
      }).lean();

      if (messages.length === 0) {
        console.log(`   ✅ No pending messages found for this campaign`);
        continue;
      }

      console.log(`   📨 Found ${messages.length} pending messages`);

      // Check if any messages have different provider than campaign
      const wrongProviderMessages = messages.filter(msg => 
        msg.providerId.toString() !== campaign.providerId.toString()
      );

      if (wrongProviderMessages.length === 0) {
        console.log(`   ✅ All messages already have correct provider`);
        totalChecked += messages.length;
        continue;
      }

      console.log(`   ⚠️  Found ${wrongProviderMessages.length} messages with wrong provider`);

      // Get provider names for logging
      const campaignProvider = await SmsProvider.findById(campaign.providerId).lean();
      const wrongProviders = await SmsProvider.find({
        _id: { $in: wrongProviderMessages.map(msg => msg.providerId) }
      }).lean();

      console.log(`   📝 Campaign should use: ${campaignProvider?.displayName || campaignProvider?.name || 'Unknown'}`);
      console.log(`   📝 Wrong providers found: ${wrongProviders.map(p => p.displayName || p.name).join(', ')}`);

      // Update messages to use correct provider
      const updateResult = await SmsMessage.updateMany(
        {
          campaignId: campaign._id,
          status: { $in: ['queued', 'processing', 'pending'] },
          providerId: { $ne: campaign.providerId }
        },
        {
          $set: { providerId: campaign.providerId }
        }
      );

      console.log(`   ✅ Fixed ${updateResult.modifiedCount} messages`);
      totalFixed += updateResult.modifiedCount;
      totalChecked += messages.length;
    }

    console.log('\n📊 Summary:');
    console.log(`   Total messages checked: ${totalChecked}`);
    console.log(`   Total messages fixed: ${totalFixed}`);
    
    if (totalFixed > 0) {
      console.log(`\n✅ Successfully fixed ${totalFixed} SMS messages to use correct providers!`);
      console.log('   All campaigns will now use only their selected provider.');
    } else {
      console.log('\n✅ No fixes needed - all messages already have correct provider assignments!');
    }

  } catch (error) {
    console.error('❌ Error fixing provider assignments:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 SMS Provider Assignment Fix Script');
    console.log('=====================================\n');

    await connectToDatabase();
    await fixProviderAssignments();

    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { fixProviderAssignments }; 