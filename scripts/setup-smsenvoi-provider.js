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

async function setupSMSenvoiProvider() {
  try {
    console.log('🔧 Setting up SMSenvoi Provider...\n');
    
    // Check if SMSenvoi provider already exists
    const existingProvider = await SmsProvider.findOne({ provider: 'smsenvoi' });
    
    if (existingProvider) {
      console.log('⚠️ SMSenvoi provider already exists:');
      console.log(`   Name: ${existingProvider.displayName}`);
      console.log(`   Status: ${existingProvider.isActive ? 'Active' : 'Inactive'}`);
      console.log(`   ID: ${existingProvider._id}`);
      console.log('\n💡 You can update the credentials in the admin panel or delete this provider first.');
      return;
    }
    
    // Create new SMSenvoi provider
    const smsEnvoiProvider = new SmsProvider({
      name: 'smsenvoi-main',
      displayName: 'SMSenvoi API',
      type: 'one-way',
      provider: 'smsenvoi',
      isActive: false, // Start as inactive until credentials are configured
      apiEndpoint: 'https://api.smsenvoi.com/API/v1.0/REST',
      apiKey: '', // Username - to be configured in admin panel
      apiSecret: '', // Password - to be configured in admin panel
      supportedCountries: [], // Empty means all countries supported
      rateLimit: {
        messagesPerSecond: 10,
        messagesPerMinute: 300,
        messagesPerHour: 5000
      },
      webhookUrl: '',
      settings: {
        messageType: 'PRM', // PRM = Premium quality, -- = Standard quality
        description: 'SMSenvoi SMS provider integration with premium quality messaging'
      }
    });
    
    await smsEnvoiProvider.save();
    
    console.log('✅ SMSenvoi provider created successfully!');
    console.log('\n📋 Provider Details:');
    console.log(`   ID: ${smsEnvoiProvider._id}`);
    console.log(`   Name: ${smsEnvoiProvider.displayName}`);
    console.log(`   Provider Type: ${smsEnvoiProvider.provider}`);
    console.log(`   Status: ${smsEnvoiProvider.isActive ? 'Active' : 'Inactive'}`);
    console.log(`   API Endpoint: ${smsEnvoiProvider.apiEndpoint}`);
    console.log(`   Message Quality: ${smsEnvoiProvider.settings.messageType} (Premium)`);
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Go to Admin → SMS → Providers in your application');
    console.log('2. Find the "SMSenvoi API" provider and click Edit');
    console.log('3. Configure your SMSenvoi credentials:');
    console.log('   - API Key: Your SMSenvoi username/email');
    console.log('   - API Secret: Your SMSenvoi password');
    console.log('4. Set the provider as Active');
    console.log('5. Assign the provider to users who should use SMSenvoi');
    
    console.log('\n📚 SMSenvoi Settings Options:');
    console.log('   - messageType: "PRM" (Premium) or "--" (Standard)');
    console.log('   - You can modify these in the provider settings JSON field');
    
    console.log('\n🌍 Country Support:');
    console.log('   - Currently set to support all countries');
    console.log('   - You can restrict to specific countries in the admin panel if needed');
    
  } catch (error) {
    console.error('❌ Error setting up SMSenvoi provider:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectToDatabase();
    await setupSMSenvoiProvider();
    console.log('\n✅ Setup completed successfully!');
  } catch (error) {
    console.error('❌ Setup failed:', error);
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

module.exports = { setupSMSenvoiProvider };
