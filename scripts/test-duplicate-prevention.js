const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Test Duplicate Prevention
 * Test the improved duplicate prevention in SMS simulation provider
 */
async function testDuplicatePrevention() {
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

    console.log('🎯 Duplicate Prevention Test\n');

    // 1. Get campaign and contact
    const campaign = await SmsCampaign.findById(campaignId);
    if (!campaign) {
      console.error('❌ Campaign not found');
      process.exit(1);
    }

    const contact = await Contact.findOne({ contactListId: campaign.contactListId });
    if (!contact) {
      console.error('❌ No contacts found');
      process.exit(1);
    }

    console.log(`📞 Testing with contact: ${contact.firstName || 'Unknown'} ${contact.lastName || ''} (${contact.phoneNumber})\n`);

    // 2. Create a test message
    console.log(`📤 Creating test message...`);
    
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
    console.log(`✅ Message created: ${message._id}`);
    console.log(`📋 Initial status: ${message.status}\n`);

    // 3. Test multiple sendSms calls for the same message
    console.log(`🧪 Testing multiple sendSms calls for the same message...\n`);

    // Import the simulation provider
    const { SmsSimulationProvider } = await import('../src/lib/services/SmsSimulationProvider');
    const smsSimProvider = SmsSimulationProvider.getInstance();

    // Clear any existing tracking for this message
    smsSimProvider.clearMessageTracking(message._id.toString());

    const messageId = message._id.toString();
    const phoneNumber = contact.phoneNumber;
    const messageContent = message.content;
    const senderId = campaign.senderId;

    console.log(`📞 Simulating 5 sendSms calls for message: ${messageId}\n`);

    const results = [];
    
    // Call sendSms 5 times for the same message
    for (let i = 1; i <= 5; i++) {
      console.log(`🔄 Call ${i}/5:`);
      
      try {
        const result = await smsSimProvider.sendSms(
          phoneNumber,
          messageContent,
          senderId,
          'testing',
          messageId
        );
        
        console.log(`   Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`   Message ID: ${result.messageId}`);
        if (result.providerResponse?.cached) {
          console.log(`   ✅ Cached response (duplicate prevented)`);
        }
        console.log('');
        
        results.push(result);
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
        results.push({ success: false, error: error.message });
      }
    }

    // 4. Check tracking stats
    console.log(`📊 Simulation provider tracking stats:`);
    const trackingStats = smsSimProvider.getDeliveryTrackingStats();
    console.log(`   Total tracked: ${trackingStats.totalTracked}`);
    console.log(`   Sample keys: ${trackingStats.trackingKeys.slice(0, 5).join(', ')}\n`);

    // 5. Monitor for delivery reports
    console.log(`👀 Monitoring for delivery reports (15 seconds)...\n`);
    
    let deliveryReportCount = 0;
    const startTime = Date.now();
    
    // Monitor webhook logs or check message status
    for (let i = 0; i < 15; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if message status changed (indicating delivery report received)
      const updatedMessage = await SmsMessage.findById(messageId);
      if (updatedMessage.status !== 'queued' && updatedMessage.status !== 'processing') {
        console.log(`📋 Message status changed to: ${updatedMessage.status} (after ${i + 1}s)`);
        break;
      }
    }

    // 6. Final analysis
    console.log(`\n📊 RESULTS ANALYSIS:`);
    console.log(`   Total sendSms calls: 5`);
    console.log(`   Successful calls: ${results.filter(r => r.success).length}`);
    console.log(`   Cached responses: ${results.filter(r => r.providerResponse?.cached).length}`);
    console.log(`   Failed calls: ${results.filter(r => !r.success).length}`);

    // Check for unique message IDs (should have different gateway message IDs for first call vs cached calls)
    const uniqueMessageIds = new Set(results.filter(r => r.messageId).map(r => r.messageId));
    console.log(`   Unique gateway message IDs: ${uniqueMessageIds.size}`);

    // Expected result: 
    // - First call should succeed and schedule delivery report
    // - Subsequent calls should return cached responses
    // - Only ONE delivery report should be sent
    
    if (uniqueMessageIds.size <= 2 && results.filter(r => r.providerResponse?.cached).length >= 3) {
      console.log(`\n✅ DUPLICATE PREVENTION WORKING!`);
      console.log(`   - First call processed normally`);
      console.log(`   - Subsequent calls returned cached responses`);
      console.log(`   - Only one delivery report should be scheduled`);
    } else {
      console.log(`\n❌ DUPLICATE PREVENTION MAY NOT BE WORKING`);
      console.log(`   - Expected 1-2 unique message IDs, got ${uniqueMessageIds.size}`);
      console.log(`   - Expected 3+ cached responses, got ${results.filter(r => r.providerResponse?.cached).length}`);
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
  testDuplicatePrevention();
}

module.exports = { testDuplicatePrevention }; 