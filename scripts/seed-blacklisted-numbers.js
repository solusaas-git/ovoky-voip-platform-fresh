const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Define the schema inline (same as the model)
const smsBlacklistedNumberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(phoneNumber) {
        return /^\+?[1-9]\d{6,19}$/.test(phoneNumber.replace(/[\s\-\(\)]/g, ''));
      },
      message: 'Phone number must be in valid international format',
    },
    index: true,
  },
  reason: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  isGlobal: {
    type: Boolean,
    default: false,
    index: true,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  tags: {
    type: [String],
    default: [],
  },
}, {
  timestamps: true,
  collection: 'sms_blacklisted_numbers',
});

// Add compound indexes
smsBlacklistedNumberSchema.index({ userId: 1, phoneNumber: 1 }, { unique: true });
smsBlacklistedNumberSchema.index({ phoneNumber: 1, isGlobal: 1 });

// Pre-save hook to normalize phone number
smsBlacklistedNumberSchema.pre('save', function(next) {
  if (this.isModified('phoneNumber')) {
    this.phoneNumber = this.phoneNumber.replace(/[\s\-\(\)]/g, '');
  }
  next();
});

const SmsBlacklistedNumber = mongoose.model('SmsBlacklistedNumber', smsBlacklistedNumberSchema);

async function seedBlacklistedNumbers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find a test user (you can replace this with a specific user ID)
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const testUser = await User.findOne({}).limit(1);
    
    if (!testUser) {
      console.log('No users found. Please create a user first.');
      return;
    }

    console.log('Using test user:', testUser._id);

    // Clear existing blacklisted numbers for this user
    await SmsBlacklistedNumber.deleteMany({ userId: testUser._id, isGlobal: false });
    console.log('Cleared existing blacklisted numbers for user');

    // Sample blacklisted numbers
    const blacklistedNumbers = [
      {
        userId: testUser._id,
        phoneNumber: '+1555000001',
        reason: 'Spam complaints received',
        isGlobal: false,
        notes: 'Multiple spam complaints from this number',
        tags: ['spam', 'complaints']
      },
      {
        userId: testUser._id,
        phoneNumber: '+1555000002',
        reason: 'Requested to be removed from all marketing',
        isGlobal: false,
        notes: 'Customer specifically requested no marketing messages',
        tags: ['opt-out', 'marketing']
      },
      {
        userId: testUser._id,
        phoneNumber: '+1555000003',
        reason: 'Invalid/disconnected number',
        isGlobal: false,
        notes: 'Number appears to be disconnected, causing delivery failures',
        tags: ['invalid', 'disconnected']
      },
      {
        userId: testUser._id,
        phoneNumber: '+1555000004',
        reason: 'Legal request for removal',
        isGlobal: false,
        notes: 'Legal department requested this number be blacklisted',
        tags: ['legal', 'blocked']
      },
      {
        userId: testUser._id,
        phoneNumber: '+1555000005',
        reason: '',
        isGlobal: false,
        notes: 'No specific reason provided',
        tags: []
      }
    ];

    // Insert blacklisted numbers
    const insertedNumbers = await SmsBlacklistedNumber.insertMany(blacklistedNumbers);
    console.log(`✅ Successfully inserted ${insertedNumbers.length} blacklisted numbers:`);
    
    insertedNumbers.forEach((number, index) => {
      console.log(`${index + 1}. ${number.phoneNumber} - ${number.reason || 'No reason provided'}`);
    });

    // Also create a few global blacklisted numbers (admin-level)
    const globalBlacklistedNumbers = [
      {
        userId: testUser._id, // Still need a userId even for global
        phoneNumber: '+1555999001',
        reason: 'Global spam number',
        isGlobal: true,
        addedBy: testUser._id,
        notes: 'This number is globally blacklisted due to widespread spam reports',
        tags: ['global', 'spam', 'admin']
      },
      {
        userId: testUser._id,
        phoneNumber: '+1555999002',
        reason: 'Regulatory compliance',
        isGlobal: true,
        addedBy: testUser._id,
        notes: 'Blacklisted for regulatory compliance reasons',
        tags: ['global', 'regulatory', 'compliance']
      }
    ];

    const insertedGlobalNumbers = await SmsBlacklistedNumber.insertMany(globalBlacklistedNumbers);
    console.log(`✅ Successfully inserted ${insertedGlobalNumbers.length} global blacklisted numbers:`);
    
    insertedGlobalNumbers.forEach((number, index) => {
      console.log(`${index + 1}. ${number.phoneNumber} - ${number.reason} (Global)`);
    });

    console.log('\n🎉 Blacklisted numbers seeding completed successfully!');
    console.log('\nYou can now:');
    console.log('1. View blacklisted numbers in SMS Settings');
    console.log('2. Try sending SMS to blacklisted numbers (should be blocked)');
    console.log('3. Add/remove blacklisted numbers through the UI');
    console.log('4. Test campaign sending with blacklisted numbers in contact lists');

  } catch (error) {
    console.error('❌ Error seeding blacklisted numbers:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function
seedBlacklistedNumbers(); 