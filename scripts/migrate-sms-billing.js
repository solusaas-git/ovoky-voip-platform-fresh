const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'ovoky';

async function migrateSMSBilling() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');
    const settingsCollection = db.collection('sms_billing_settings');

    // Step 1: Create global default settings if they don't exist
    console.log('🔧 Creating global SMS billing settings...');
    
    const globalSettings = await settingsCollection.findOne({ userId: null, isActive: true });
    
    if (!globalSettings) {
      const globalSettingsDoc = {
        userId: null,
        billingFrequency: 'daily',
        maxAmount: 100,
        maxMessages: 1000,
        billingDayOfWeek: 1, // Monday
        billingDayOfMonth: 1, // 1st of month
        autoProcessing: true,
        notificationEnabled: true,
        notificationThreshold: 50,
        isActive: true,
        createdBy: new ObjectId('000000000000000000000000'), // System user
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await settingsCollection.insertOne(globalSettingsDoc);
      console.log('✅ Global SMS billing settings created');
    } else {
      console.log('ℹ️  Global SMS billing settings already exist');
    }

    // Step 2: Get all active users
    console.log('👥 Fetching active users...');
    const users = await usersCollection.find({ 
      isActive: { $ne: false },
      role: { $ne: 'admin' } // Skip admin users
    }).toArray();
    
    console.log(`📊 Found ${users.length} active users`);

    // Step 3: Create user-specific settings for users who need custom settings
    // For now, we'll just ensure they can inherit from global settings
    // You can customize this based on your business logic
    
    let customSettingsCreated = 0;
    
    for (const user of users) {
      // Check if user already has settings
      const existingSettings = await settingsCollection.findOne({
        userId: user._id,
        isActive: true
      });
      
      if (!existingSettings) {
        // You can add custom logic here to create user-specific settings
        // For example, VIP users might get higher thresholds
        
        // Example: Create custom settings for users with high SMS usage
        const smsUsage = await db.collection('sms_messages').countDocuments({
          userId: user._id,
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        });
        
        if (smsUsage > 5000) { // High-volume users
          const userSettings = {
            userId: user._id,
            billingFrequency: 'weekly', // Weekly billing for high-volume users
            maxAmount: 500, // Higher threshold
            maxMessages: 5000,
            billingDayOfWeek: 1,
            billingDayOfMonth: 1,
            autoProcessing: true,
            notificationEnabled: true,
            notificationThreshold: 200,
            isActive: true,
            createdBy: new ObjectId('000000000000000000000000'),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          await settingsCollection.insertOne(userSettings);
          customSettingsCreated++;
          console.log(`✅ Created custom settings for high-volume user: ${user.email}`);
        }
      }
    }
    
    console.log(`✅ Created ${customSettingsCreated} custom user settings`);

    // Step 4: Create initial billing records for users with existing SMS usage
    console.log('📋 Creating initial billing records...');
    
    const billingCollection = db.collection('sms_billings');
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    let billingRecordsCreated = 0;
    
    for (const user of users) {
      // Check if user has SMS usage this month
      const monthlyUsage = await db.collection('sms_messages').aggregate([
        {
          $match: {
            userId: user._id,
            createdAt: { $gte: startOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            successfulMessages: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
            },
            failedMessages: {
              $sum: { $cond: [{ $ne: ['$status', 'delivered'] }, 1, 0] }
            },
            totalCost: { $sum: '$cost' },
            messageBreakdown: {
              $push: {
                country: '$country',
                prefix: '$prefix',
                cost: '$cost'
              }
            }
          }
        }
      ]).toArray();
      
      if (monthlyUsage.length > 0 && monthlyUsage[0].totalMessages > 0) {
        const usage = monthlyUsage[0];
        
        // Check if billing record already exists
        const existingBilling = await billingCollection.findOne({
          userId: user._id,
          billingPeriodStart: startOfMonth
        });
        
        if (!existingBilling && usage.totalCost > 0) {
          const billingRecord = {
            userId: user._id,
            billingPeriodStart: startOfMonth,
            billingPeriodEnd: currentDate,
            totalMessages: usage.totalMessages,
            successfulMessages: usage.successfulMessages,
            failedMessages: usage.failedMessages,
            totalCost: usage.totalCost,
            currency: 'USD',
            messageBreakdown: usage.messageBreakdown,
            status: 'pending',
            billingDate: currentDate,
            createdAt: currentDate,
            updatedAt: currentDate,
          };
          
          await billingCollection.insertOne(billingRecord);
          billingRecordsCreated++;
          console.log(`✅ Created billing record for ${user.email}: $${usage.totalCost.toFixed(2)}`);
        }
      }
    }
    
    console.log(`✅ Created ${billingRecordsCreated} initial billing records`);

    // Step 5: Summary
    console.log('\n📊 Migration Summary:');
    console.log(`- Global settings: ${globalSettings ? 'Already existed' : 'Created'}`);
    console.log(`- Custom user settings: ${customSettingsCreated} created`);
    console.log(`- Initial billing records: ${billingRecordsCreated} created`);
    console.log(`- Total users processed: ${users.length}`);
    
    console.log('\n✅ SMS Billing migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run migration
migrateSMSBilling().catch(console.error); 