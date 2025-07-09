const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

// Define schemas (simplified versions for seeding)
const UserSchema = new mongoose.Schema({
  email: String,
  name: String,
  role: { type: String, default: 'user' }
}, { timestamps: true });

const SmsContactListSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  description: String,
  contactCount: { type: Number, default: 0 }
}, { timestamps: true });

const SmsTemplateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  message: String,
  variables: [String]
}, { timestamps: true });

const SmsProviderSchema = new mongoose.Schema({
  name: String,
  type: String,
  isActive: { type: Boolean, default: true },
  apiEndpoint: String,
  supportedCountries: [String]
}, { timestamps: true });

const SmsCampaignSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  description: String,
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'completed', 'paused', 'failed', 'archived'],
    default: 'draft'
  },
  contactListId: { type: mongoose.Schema.Types.ObjectId, ref: 'SmsContactList' },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'SmsTemplate' },
  message: String,
  senderId: String,
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'SmsProvider' },
  scheduledAt: Date,
  startedAt: Date,
  completedAt: Date,
  contactCount: { type: Number, default: 0 },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  deliveredCount: { type: Number, default: 0 },
  estimatedCost: { type: Number, default: 0 },
  actualCost: { type: Number, default: 0 },
  progress: { type: Number, default: 0 }
}, { timestamps: true });

// SMS Rate Deck Schema
const SmsRateDeckSchema = new mongoose.Schema({
  name: String,
  description: String,
  currency: { type: String, default: 'USD' },
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  rateCount: { type: Number, default: 0 },
  assignedUsers: { type: Number, default: 0 },
  createdBy: String
}, { timestamps: true, collection: 'sms_rate_decks' });

// SMS Rate Schema
const SmsRateSchema = new mongoose.Schema({
  rateDeckId: { type: mongoose.Schema.Types.ObjectId, ref: 'SmsRateDeck' },
  prefix: String,
  country: String,
  description: String,
  rate: Number,
  effectiveDate: Date,
  createdBy: String
}, { timestamps: true, collection: 'sms_rates' });

// Rate Deck Assignment Schema
const RateDeckAssignmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rateDeckId: { type: mongoose.Schema.Types.ObjectId },
  rateDeckType: { type: String, enum: ['number', 'sms'] },
  assignedBy: String,
  assignedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, { timestamps: true, collection: 'rate_deck_assignments' });

// SMS Contact Schema
const SmsContactSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  contactListId: { type: mongoose.Schema.Types.ObjectId, ref: 'SmsContactList' },
  firstName: String,
  lastName: String,
  phoneNumber: String,
  email: String,
  address: String,
  city: String,
  zipCode: String,
  dateOfBirth: Date,
  customField1: String,
  customField2: String,
  customField3: String,
  customField4: String,
  customField5: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true, collection: 'smscontacts' });

// Create models
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const SmsContactList = mongoose.models.SmsContactList || mongoose.model('SmsContactList', SmsContactListSchema);
const SmsTemplate = mongoose.models.SmsTemplate || mongoose.model('SmsTemplate', SmsTemplateSchema);
const SmsProvider = mongoose.models.SmsProvider || mongoose.model('SmsProvider', SmsProviderSchema);
const SmsCampaign = mongoose.models.SmsCampaign || mongoose.model('SmsCampaign', SmsCampaignSchema);
const SmsRateDeck = mongoose.models.SmsRateDeck || mongoose.model('SmsRateDeck', SmsRateDeckSchema);
const SmsRate = mongoose.models.SmsRate || mongoose.model('SmsRate', SmsRateSchema);
const RateDeckAssignment = mongoose.models.RateDeckAssignment || mongoose.model('RateDeckAssignment', RateDeckAssignmentSchema);
const SmsContact = mongoose.models.SmsContact || mongoose.model('SmsContact', SmsContactSchema);

async function seedData() {
  try {
    console.log('Starting to seed SMS campaign data...');

    // Clear existing data
    await SmsCampaign.deleteMany({});
    await SmsContactList.deleteMany({});
    await SmsTemplate.deleteMany({});
    await SmsProvider.deleteMany({});
    await RateDeckAssignment.deleteMany({ rateDeckType: 'sms' });
    await SmsRate.deleteMany({});
    await SmsRateDeck.deleteMany({});
    await SmsContact.deleteMany({});
    console.log('Cleared existing data');

    // Find or create a test user
    let testUser = await User.findOne({ email: 'test@example.com' });
    if (!testUser) {
      testUser = await User.create({
        email: 'test@example.com',
        name: 'Test User',
        role: 'user'
      });
      console.log('Created test user');
    }

    // Create SMS Rate Deck
    const smsRateDeck = await SmsRateDeck.create({
      name: 'Standard SMS Rates',
      description: 'Standard SMS rates for global destinations',
      currency: 'USD',
      isActive: true,
      isDefault: true,
      rateCount: 0,
      assignedUsers: 0,
      createdBy: 'system'
    });
    console.log('Created SMS rate deck');

    // Create SMS Rates
    const smsRates = [
      // North America
      { prefix: '1', country: 'United States/Canada', description: 'North America Mobile', rate: 0.0075 },
      
      // Europe
      { prefix: '44', country: 'United Kingdom', description: 'UK Mobile', rate: 0.0350 },
      { prefix: '33', country: 'France', description: 'France Mobile', rate: 0.0280 },
      { prefix: '49', country: 'Germany', description: 'Germany Mobile', rate: 0.0320 },
      { prefix: '34', country: 'Spain', description: 'Spain Mobile', rate: 0.0290 },
      { prefix: '39', country: 'Italy', description: 'Italy Mobile', rate: 0.0310 },
      { prefix: '31', country: 'Netherlands', description: 'Netherlands Mobile', rate: 0.0270 },
      
      // Asia Pacific
      { prefix: '91', country: 'India', description: 'India Mobile', rate: 0.0045 },
      { prefix: '86', country: 'China', description: 'China Mobile', rate: 0.0055 },
      { prefix: '81', country: 'Japan', description: 'Japan Mobile', rate: 0.0680 },
      { prefix: '82', country: 'South Korea', description: 'South Korea Mobile', rate: 0.0290 },
      { prefix: '61', country: 'Australia', description: 'Australia Mobile', rate: 0.0420 },
      { prefix: '65', country: 'Singapore', description: 'Singapore Mobile', rate: 0.0380 },
      
      // Middle East & Africa
      { prefix: '971', country: 'UAE', description: 'UAE Mobile', rate: 0.0250 },
      { prefix: '966', country: 'Saudi Arabia', description: 'Saudi Arabia Mobile', rate: 0.0280 },
      { prefix: '27', country: 'South Africa', description: 'South Africa Mobile', rate: 0.0190 },
      
      // Latin America
      { prefix: '52', country: 'Mexico', description: 'Mexico Mobile', rate: 0.0120 },
      { prefix: '55', country: 'Brazil', description: 'Brazil Mobile', rate: 0.0180 },
      { prefix: '54', country: 'Argentina', description: 'Argentina Mobile', rate: 0.0220 }
    ];

    const createdRates = await SmsRate.insertMany(
      smsRates.map(rate => ({
        ...rate,
        rateDeckId: smsRateDeck._id,
        effectiveDate: new Date(),
        createdBy: 'system'
      }))
    );
    console.log(`Created ${createdRates.length} SMS rates`);

    // Update rate deck count
    await SmsRateDeck.findByIdAndUpdate(smsRateDeck._id, {
      rateCount: createdRates.length,
      assignedUsers: 1
    });

    // Assign rate deck to test user
    await RateDeckAssignment.create({
      userId: testUser._id,
      rateDeckId: smsRateDeck._id,
      rateDeckType: 'sms',
      assignedBy: 'system',
      assignedAt: new Date(),
      isActive: true
    });
    console.log('Assigned SMS rate deck to test user');

    // Create SMS Gateways
    const smsProviders = [
      {
        name: 'Twilio API',
        displayName: 'Server 1',
        type: 'two-way',
        provider: 'twilio',
        isActive: true,
        supportedCountries: ['US', 'CA', 'GB', 'FR', 'DE'],
        rateLimit: {
          messagesPerSecond: 10,
          messagesPerMinute: 100,
          messagesPerHour: 1000
        }
      },
      {
        name: 'AWS SNS API',
        displayName: 'Server 2',
        type: 'one-way',
        provider: 'aws-sns',
        isActive: true,
        supportedCountries: ['US', 'CA', 'GB', 'FR', 'DE', 'AU'],
        rateLimit: {
          messagesPerSecond: 20,
          messagesPerMinute: 200,
          messagesPerHour: 2000
        }
      },
      {
        name: 'MessageBird API',
        displayName: 'Server 3',
        type: 'two-way',
        provider: 'messagebird',
        isActive: true,
        supportedCountries: ['NL', 'BE', 'FR', 'DE', 'GB'],
        rateLimit: {
          messagesPerSecond: 15,
          messagesPerMinute: 150,
          messagesPerHour: 1500
        }
      }
    ];

    const providerResult = await SmsProvider.insertMany(smsProviders);
    console.log('Created SMS gateways');

    // Assign SMS providers to test user
    const SmsUserProviderAssignment = require('../src/models/SmsUserProviderAssignment').default;
    
    const providerAssignments = [];
    providerResult.forEach((provider, index) => {
      providerAssignments.push({
        userId: testUser._id,
        providerId: provider._id,
        isActive: true,
        priority: (index + 1) * 10, // Priority 10, 20, 30
        assignedBy: testUser._id,
        assignedAt: new Date()
      });
    });

    await SmsUserProviderAssignment.insertMany(providerAssignments);
    console.log(`Assigned ${providerAssignments.length} SMS providers to test user`);

    // Create Contact Lists
    const contactLists = await SmsContactList.insertMany([
      {
        userId: testUser._id,
        name: 'Marketing List',
        description: 'Main marketing contact list for promotions',
        contactCount: 150
      },
      {
        userId: testUser._id,
        name: 'VIP Customers',
        description: 'Premium customers and high-value clients',
        contactCount: 25
      },
      {
        userId: testUser._id,
        name: 'Newsletter Subscribers',
        description: 'Users subscribed to weekly newsletter',
        contactCount: 300
      },
      {
        userId: testUser._id,
        name: 'Event Attendees',
        description: 'People who attended our last event',
        contactCount: 75
      }
    ]);
    console.log('Created contact lists');

    // Create sample contacts with real phone numbers for cost calculation
    const sampleContacts = [
      // US numbers (prefix 1)
      { firstName: 'John', lastName: 'Smith', phoneNumber: '+15551234567', email: 'john@example.com', city: 'New York' },
      { firstName: 'Jane', lastName: 'Doe', phoneNumber: '+15559876543', email: 'jane@example.com', city: 'Los Angeles' },
      { firstName: 'Mike', lastName: 'Johnson', phoneNumber: '+15555551234', email: 'mike@example.com', city: 'Chicago' },
      
      // UK numbers (prefix 44)
      { firstName: 'David', lastName: 'Wilson', phoneNumber: '+447123456789', email: 'david@example.com', city: 'London' },
      { firstName: 'Sarah', lastName: 'Brown', phoneNumber: '+447987654321', email: 'sarah@example.com', city: 'Manchester' },
      
      // France numbers (prefix 33)
      { firstName: 'Pierre', lastName: 'Martin', phoneNumber: '+33612345678', email: 'pierre@example.com', city: 'Paris' },
      { firstName: 'Marie', lastName: 'Dubois', phoneNumber: '+33687654321', email: 'marie@example.com', city: 'Lyon' },
      
      // Germany numbers (prefix 49)
      { firstName: 'Hans', lastName: 'Mueller', phoneNumber: '+491701234567', email: 'hans@example.com', city: 'Berlin' },
      { firstName: 'Anna', lastName: 'Schmidt', phoneNumber: '+491709876543', email: 'anna@example.com', city: 'Munich' },
      
      // India numbers (prefix 91)
      { firstName: 'Raj', lastName: 'Patel', phoneNumber: '+919876543210', email: 'raj@example.com', city: 'Mumbai' },
      { firstName: 'Priya', lastName: 'Sharma', phoneNumber: '+919123456789', email: 'priya@example.com', city: 'Delhi' }
    ];

    // Add contacts to different lists
    const contactsToCreate = [];
    
    // Add contacts to Marketing List (contactLists[0])
    sampleContacts.slice(0, 8).forEach(contact => {
      contactsToCreate.push({
        ...contact,
        userId: testUser._id,
        contactListId: contactLists[0]._id,
        isActive: true
      });
    });

    // Add some contacts to VIP Customers (contactLists[1])
    sampleContacts.slice(0, 3).forEach(contact => {
      contactsToCreate.push({
        ...contact,
        userId: testUser._id,
        contactListId: contactLists[1]._id,
        isActive: true
      });
    });

    // Add contacts to Newsletter Subscribers (contactLists[2])
    sampleContacts.forEach(contact => {
      contactsToCreate.push({
        ...contact,
        userId: testUser._id,
        contactListId: contactLists[2]._id,
        isActive: true
      });
    });

    // Add some contacts to Event Attendees (contactLists[3])
    sampleContacts.slice(0, 5).forEach(contact => {
      contactsToCreate.push({
        ...contact,
        userId: testUser._id,
        contactListId: contactLists[3]._id,
        isActive: true
      });
    });

    await SmsContact.insertMany(contactsToCreate);
    console.log(`Created ${contactsToCreate.length} sample contacts`);

    // Update contact list counts with real counts
    for (const contactList of contactLists) {
      const realCount = await SmsContact.countDocuments({
        contactListId: contactList._id,
        isActive: true
      });
      await SmsContactList.findByIdAndUpdate(contactList._id, {
        contactCount: realCount
      });
    }
    console.log('Updated contact list counts');

    // Create SMS Templates
    const templates = await SmsTemplate.insertMany([
      {
        userId: testUser._id,
        name: 'Welcome Message',
        message: 'Welcome to our service! We are excited to have you on board.',
        variables: []
      },
      {
        userId: testUser._id,
        name: 'Promotion Alert',
        message: 'Special offer: Get 20% off your next purchase! Use code SAVE20',
        variables: []
      },
      {
        userId: testUser._id,
        name: 'Event Reminder',
        message: 'Reminder: Your appointment is scheduled for tomorrow at 2 PM.',
        variables: []
      },
      {
        userId: testUser._id,
        name: 'Order Confirmation',
        message: 'Your order #{{orderNumber}} has been confirmed. Total: ${{amount}}',
        variables: ['orderNumber', 'amount']
      },
      {
        userId: testUser._id,
        name: 'Password Reset',
        message: 'Your password reset code is: {{code}}. Valid for 10 minutes.',
        variables: ['code']
      }
    ]);
    console.log('Created SMS templates');

    // Create Sample Campaigns
    const campaigns = await SmsCampaign.insertMany([
      {
        userId: testUser._id,
        name: 'Welcome Campaign',
        description: 'New customer welcome messages',
        status: 'completed',
        contactListId: contactLists[0]._id,
        templateId: templates[0]._id,
        message: 'Welcome to our service! We are excited to have you on board.',
        senderId: 'MyCompany',
        providerId: providerResult[0]._id,
        contactCount: 150,
        sentCount: 145,
        failedCount: 5,
        deliveredCount: 140,
        estimatedCost: 7.50,
        actualCost: 7.25,
        progress: 100,
        startedAt: new Date('2024-01-15T10:00:00Z'),
        completedAt: new Date('2024-01-15T11:30:00Z')
      },
      {
        userId: testUser._id,
        name: 'Black Friday Promotion',
        description: 'Black Friday promotion campaign',
        status: 'sending',
        contactListId: contactLists[2]._id,
        templateId: templates[1]._id,
        message: 'Special offer: Get 20% off your next purchase! Use code SAVE20',
        senderId: 'MyCompany',
        providerId: providerResult[0]._id,
        contactCount: 300,
        sentCount: 180,
        failedCount: 2,
        deliveredCount: 175,
        estimatedCost: 15.00,
        actualCost: 9.10,
        progress: 60,
        startedAt: new Date('2024-01-16T14:30:00Z')
      },
      {
        userId: testUser._id,
        name: 'Webinar Reminder',
        description: 'Upcoming webinar reminder',
        status: 'scheduled',
        contactListId: contactLists[3]._id,
        templateId: templates[2]._id,
        message: 'Reminder: Your webinar is scheduled for tomorrow at 2 PM.',
        senderId: 'MyCompany',
        providerId: providerResult[1]._id,
        scheduledAt: new Date('2024-02-01T09:00:00Z'),
        contactCount: 75,
        sentCount: 0,
        failedCount: 0,
        deliveredCount: 0,
        estimatedCost: 3.75,
        actualCost: 0,
        progress: 0
      },
      {
        userId: testUser._id,
        name: 'Customer Survey',
        description: 'Monthly customer satisfaction survey',
        status: 'draft',
        contactListId: contactLists[1]._id,
        message: 'Help us improve! Please take our 2-minute survey: https://survey.example.com',
        senderId: 'Survey',
        providerId: providerResult[2]._id,
        contactCount: 25,
        sentCount: 0,
        failedCount: 0,
        deliveredCount: 0,
        estimatedCost: 1.25,
        actualCost: 0,
        progress: 0
      },
      {
        userId: testUser._id,
        name: 'Holiday Greetings',
        description: 'New Year holiday greetings to all customers',
        status: 'completed',
        contactListId: contactLists[0]._id,
        message: 'Happy New Year! Thank you for being a valued customer. Best wishes for 2024!',
        senderId: 'MyCompany',
        providerId: providerResult[0]._id,
        contactCount: 150,
        sentCount: 148,
        failedCount: 2,
        deliveredCount: 145,
        estimatedCost: 7.50,
        actualCost: 7.40,
        progress: 100,
        startedAt: new Date('2024-01-01T00:00:00Z'),
        completedAt: new Date('2024-01-01T01:00:00Z')
      },
      {
        userId: testUser._id,
        name: 'Product Launch',
        description: 'Announcement for new product launch',
        status: 'paused',
        contactListId: contactLists[2]._id,
        message: 'Exciting news! Our new product is launching next week. Be the first to try it!',
        senderId: 'MyCompany',
        providerId: providerResult[1]._id,
        contactCount: 300,
        sentCount: 50,
        failedCount: 1,
        deliveredCount: 48,
        estimatedCost: 15.00,
        actualCost: 2.55,
        progress: 17,
        startedAt: new Date('2024-01-20T10:00:00Z')
      }
    ]);
    console.log('Created sample campaigns');

    // Create SMS Contacts
    const smsContacts = await SmsContact.insertMany([
      {
        userId: testUser._id,
        contactListId: contactLists[0]._id,
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+14155552671',
        email: 'john.doe@example.com',
        address: '123 Main St',
        city: 'San Francisco',
        zipCode: '94103',
        dateOfBirth: new Date('1990-05-15'),
        customField1: 'Marketing',
        customField2: 'Active',
        customField3: 'VIP',
        customField4: 'Newsletter',
        customField5: 'Event',
        isActive: true
      },
      {
        userId: testUser._id,
        contactListId: contactLists[1]._id,
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '+447911123456',
        email: 'jane.smith@example.co.uk',
        address: '456 Elm St',
        city: 'London',
        zipCode: 'EC1A 1AA',
        dateOfBirth: new Date('1985-07-20'),
        customField1: 'VIP',
        customField2: 'Newsletter',
        customField3: 'Active',
        customField4: 'Marketing',
        customField5: 'Event',
        isActive: true
      },
      {
        userId: testUser._id,
        contactListId: contactLists[2]._id,
        firstName: 'Maria',
        lastName: 'Garcia',
        phoneNumber: '+525555555555',
        email: 'maria.garcia@example.com',
        address: '789 Oak St',
        city: 'Mexico City',
        zipCode: '01000',
        dateOfBirth: new Date('1995-03-10'),
        customField1: 'Newsletter',
        customField2: 'Active',
        customField3: 'Marketing',
        customField4: 'VIP',
        customField5: 'Event',
        isActive: true
      },
      {
        userId: testUser._id,
        contactListId: contactLists[3]._id,
        firstName: 'Carlos',
        lastName: 'Rodriguez',
        phoneNumber: '+5491112345678',
        email: 'carlos.rodriguez@example.com',
        address: '321 Pine St',
        city: 'Buenos Aires',
        zipCode: '1000',
        dateOfBirth: new Date('1980-11-25'),
        customField1: 'Event',
        customField2: 'Active',
        customField3: 'Marketing',
        customField4: 'VIP',
        customField5: 'Newsletter',
        isActive: true
      }
    ]);
    console.log('Created SMS contacts');

    console.log('\n✅ SMS Campaign data seeded successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - User: ${testUser.email}`);
    console.log(`   - Providers: ${providerResult.length}`);
    console.log(`   - Provider Assignments: ${providerAssignments.length}`);
    console.log(`   - Contact Lists: ${contactLists.length}`);
    console.log(`   - Templates: ${templates.length}`);
    console.log(`   - Campaigns: ${campaigns.length}`);
    console.log(`   - Contacts: ${smsContacts.length}`);
    console.log('\n🎯 You can now test the SMS campaign functionality with real data!');

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed script
connectDB().then(() => {
  seedData();
}); 