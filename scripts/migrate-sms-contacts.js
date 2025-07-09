const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'ovo_dev';

async function migrateContacts() {
  if (!uri) {
    console.error('MONGODB_URI not found in environment variables');
    return;
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);

    // Drop existing SMS collections to start fresh
    const collections = ['smscampaigns', 'smscontacts', 'smscontactlists', 'smstemplates', 'smsproviders'];
    for (const collectionName of collections) {
      try {
        await db.collection(collectionName).drop();
        console.log(`Dropped collection: ${collectionName}`);
      } catch (error) {
        console.log(`Collection ${collectionName} doesn't exist, skipping...`);
      }
    }

    // Create sample user (we'll use a test user ID)
    const testUserId = '507f1f77bcf86cd799439011'; // Sample ObjectId

    // Create SMS Gateways
    const smsProviders = [
      {
        name: 'Twilio',
        type: 'twilio',
        isActive: true,
        supportedCountries: ['US', 'CA', 'GB', 'FR', 'DE'],
        rateLimit: {
          messagesPerSecond: 10,
          messagesPerMinute: 100,
          messagesPerHour: 1000
        }
      },
      {
        name: 'AWS SNS',
        type: 'aws-sns',
        isActive: true,
        supportedCountries: ['US', 'CA', 'GB', 'FR', 'DE', 'AU'],
        rateLimit: {
          messagesPerSecond: 20,
          messagesPerMinute: 200,
          messagesPerHour: 2000
        }
      },
      {
        name: 'MessageBird',
        type: 'messagebird',
        isActive: true,
        supportedCountries: ['NL', 'BE', 'FR', 'DE', 'GB'],
        rateLimit: {
          messagesPerSecond: 15,
          messagesPerMinute: 150,
          messagesPerHour: 1500
        }
      }
    ];

    const providerResult = await db.collection('smsproviders').insertMany(smsProviders);
    console.log(`Created ${providerResult.insertedCount} SMS gateways`);

    // Create SMS Templates with the new variable format
    const templates = [
      {
        name: 'Welcome Message',
        content: 'Hello {firstName}, welcome to our service! Your phone number {phoneNumber} has been registered.',
        variables: ['firstName', 'phoneNumber'],
        category: 'welcome',
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Appointment Reminder',
        content: 'Hi {firstName} {lastName}, this is a reminder about your appointment tomorrow at {appointmentTime}. Address: {address}, {city} {zipCode}.',
        variables: ['firstName', 'lastName', 'appointmentTime', 'address', 'city', 'zipCode'],
        category: 'reminder',
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Birthday Greeting',
        content: 'Happy Birthday {firstName}! 🎉 We hope you have a wonderful day. Best regards from {city}.',
        variables: ['firstName', 'city'],
        category: 'greeting',
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const templateResult = await db.collection('smstemplates').insertMany(templates);
    console.log(`Created ${templateResult.insertedCount} SMS templates`);

    // Create Contact Lists
    const contactLists = [
      {
        userId: testUserId,
        name: 'VIP Customers',
        description: 'Our most valuable customers',
        contactCount: 0,
        tags: ['vip', 'customers'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: testUserId,
        name: 'Newsletter Subscribers',
        description: 'Users who subscribed to our newsletter',
        contactCount: 0,
        tags: ['newsletter', 'subscribers'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: testUserId,
        name: 'Birthday Club',
        description: 'Customers who want birthday greetings',
        contactCount: 0,
        tags: ['birthday', 'special'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: testUserId,
        name: 'Appointment Reminders',
        description: 'Clients who need appointment reminders',
        contactCount: 0,
        tags: ['appointments', 'reminders'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const listResult = await db.collection('smscontactlists').insertMany(contactLists);
    console.log(`Created ${listResult.insertedCount} contact lists`);

    // Get the created list IDs
    const listIds = Object.values(listResult.insertedIds);

    // Create sample contacts with all the new fields
    const contacts = [
      // VIP Customers
      {
        userId: testUserId,
        contactListId: listIds[0],
        phoneNumber: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        city: 'New York',
        zipCode: '10001',
        dateOfBirth: new Date('1985-06-15'),
        isActive: true,
        customFields: {
          customerType: 'premium',
          memberSince: '2020'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: testUserId,
        contactListId: listIds[0],
        phoneNumber: '+1234567891',
        firstName: 'Jane',
        lastName: 'Smith',
        address: '456 Oak Ave',
        city: 'Los Angeles',
        zipCode: '90210',
        dateOfBirth: new Date('1990-03-22'),
        isActive: true,
        customFields: {
          customerType: 'gold',
          memberSince: '2019'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Newsletter Subscribers
      {
        userId: testUserId,
        contactListId: listIds[1],
        phoneNumber: '+1234567892',
        firstName: 'Mike',
        lastName: 'Johnson',
        address: '789 Pine St',
        city: 'Chicago',
        zipCode: '60601',
        isActive: true,
        customFields: {
          subscription: 'weekly',
          interests: ['technology', 'business']
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: testUserId,
        contactListId: listIds[1],
        phoneNumber: '+1234567893',
        firstName: 'Sarah',
        lastName: 'Wilson',
        city: 'Houston',
        zipCode: '77001',
        isActive: true,
        customFields: {
          subscription: 'monthly',
          interests: ['health', 'lifestyle']
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Birthday Club
      {
        userId: testUserId,
        contactListId: listIds[2],
        phoneNumber: '+1234567894',
        firstName: 'David',
        lastName: 'Brown',
        city: 'Miami',
        zipCode: '33101',
        dateOfBirth: new Date('1988-12-05'),
        isActive: true,
        customFields: {
          favoriteColor: 'blue',
          preferredTime: 'morning'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: testUserId,
        contactListId: listIds[2],
        phoneNumber: '+1234567895',
        firstName: 'Lisa',
        lastName: 'Davis',
        address: '321 Elm St',
        city: 'Seattle',
        zipCode: '98101',
        dateOfBirth: new Date('1992-08-18'),
        isActive: true,
        customFields: {
          favoriteColor: 'green',
          preferredTime: 'evening'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Appointment Reminders
      {
        userId: testUserId,
        contactListId: listIds[3],
        phoneNumber: '+1234567896',
        firstName: 'Robert',
        lastName: 'Miller',
        address: '654 Maple Dr',
        city: 'Denver',
        zipCode: '80201',
        isActive: true,
        customFields: {
          appointmentType: 'consultation',
          preferredDay: 'tuesday'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: testUserId,
        contactListId: listIds[3],
        phoneNumber: '+1234567897',
        firstName: 'Emma',
        lastName: 'Taylor',
        address: '987 Cedar Ln',
        city: 'Phoenix',
        zipCode: '85001',
        dateOfBirth: new Date('1995-01-30'),
        isActive: true,
        customFields: {
          appointmentType: 'follow-up',
          preferredDay: 'friday'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const contactResult = await db.collection('smscontacts').insertMany(contacts);
    console.log(`Created ${contactResult.insertedCount} contacts`);

    // Update contact counts in lists
    for (let i = 0; i < listIds.length; i++) {
      const count = contacts.filter(contact => contact.contactListId === listIds[i]).length;
      await db.collection('smscontactlists').updateOne(
        { _id: listIds[i] },
        { $set: { contactCount: count } }
      );
    }
    console.log('Updated contact counts in lists');

    // Create sample campaigns
    const campaigns = [
      {
        userId: testUserId,
        name: 'Welcome Campaign',
        description: 'Welcome new VIP customers',
        contactListId: listIds[0],
        templateId: templateResult.insertedIds[0],
        providerId: providerResult.insertedIds[0],
        message: 'Hello {firstName}, welcome to our VIP program! Your phone number {phoneNumber} has been registered.',
        senderId: 'MyCompany',
        status: 'completed',
        scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        sentAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
        totalContacts: 2,
        sentCount: 2,
        failedCount: 0,
        estimatedCost: 0.20,
        actualCost: 0.20,
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 22 * 60 * 60 * 1000)
      },
      {
        userId: testUserId,
        name: 'Newsletter Promotion',
        description: 'Monthly newsletter promotion',
        contactListId: listIds[1],
        message: 'Hi {firstName}, check out our latest newsletter with exciting updates!',
        senderId: 'Newsletter',
        status: 'scheduled',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        totalContacts: 2,
        estimatedCost: 0.20,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const campaignResult = await db.collection('smscampaigns').insertMany(campaigns);
    console.log(`Created ${campaignResult.insertedCount} campaigns`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\nCreated:');
    console.log(`- ${providerResult.insertedCount} SMS gateways`);
    console.log(`- ${templateResult.insertedCount} SMS templates`);
    console.log(`- ${listResult.insertedCount} contact lists`);
    console.log(`- ${contactResult.insertedCount} contacts`);
    console.log(`- ${campaignResult.insertedCount} campaigns`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.close();
  }
}

migrateContacts(); 