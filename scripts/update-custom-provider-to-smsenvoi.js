#!/usr/bin/env node

const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://sippy:owTWo84Nf2JL5q5z@176.9.26.121:27017/sippy?directConnection=true';

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log(`🔗 Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// SMS Provider schema
const smsProviderSchema = new mongoose.Schema({
  name: String,
  displayName: String,
  type: String,
  provider: String,
  isActive: Boolean,
  apiEndpoint: String,
  apiKey: String,
  apiSecret: String,
  supportedCountries: [String],
  rateLimit: {
    messagesPerSecond: Number,
    messagesPerMinute: Number,
    messagesPerHour: Number
  },
  webhookUrl: String,
  settings: mongoose.Schema.Types.Mixed
}, {
  collection: 'smsproviders',
  timestamps: true
});

const SmsProvider = mongoose.model('SmsProvider', smsProviderSchema);

async function updateCustomProviderToSMSenvoi() {
  try {
    console.log('🔧 Looking for custom providers to update to SMSenvoi...\n');
    
    // Find providers with provider type 'custom'
    const customProviders = await SmsProvider.find({ provider: 'custom' });
    
    if (customProviders.length === 0) {
      console.log('ℹ️ No custom providers found.');
      return;
    }
    
    console.log(`📋 Found ${customProviders.length} custom provider(s):`);
    customProviders.forEach((provider, index) => {
      console.log(`   ${index + 1}. ${provider.displayName} (${provider.name}) - ${provider.isActive ? 'Active' : 'Inactive'}`);
    });
    
    console.log('\n🔄 Updating custom providers to SMSenvoi type...');
    
    for (const provider of customProviders) {
      // Update the provider type to smsenvoi
      const updateResult = await SmsProvider.findByIdAndUpdate(
        provider._id,
        { 
          provider: 'smsenvoi',
          // Set default API endpoint if not already set
          apiEndpoint: provider.apiEndpoint || 'https://api.smsenvoi.com/API/v1.0/REST',
          // Ensure settings include messageType
          settings: {
            ...provider.settings,
            messageType: provider.settings?.messageType || 'PRM'
          }
        },
        { new: true }
      );
      
      console.log(`   ✅ Updated "${provider.displayName}" from custom to smsenvoi`);
      console.log(`      - API Endpoint: ${updateResult.apiEndpoint}`);
      console.log(`      - Message Type: ${updateResult.settings?.messageType || 'PRM'}`);
    }
    
    console.log('\n✅ All custom providers updated to SMSenvoi successfully!');
    console.log('\n🔧 Next Steps:');
    console.log('1. Go to Admin → SMS → Providers in your application');
    console.log('2. Edit your SMSenvoi provider(s) to configure credentials:');
    console.log('   - API Key: Your SMSenvoi username/email');
    console.log('   - API Secret: Your SMSenvoi password');
    console.log('3. Test sending SMS messages');
    
  } catch (error) {
    console.error('❌ Error updating custom providers:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectToDatabase();
    await updateCustomProviderToSMSenvoi();
    console.log('\n✅ Update completed successfully!');
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { updateCustomProviderToSMSenvoi };
