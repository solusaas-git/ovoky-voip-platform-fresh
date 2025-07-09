#!/usr/bin/env node

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

// Define the schema inline (same as the model)
const smsSenderIdSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  senderId: {
    type: String,
    required: true,
    trim: true,
    maxlength: 15,
    validate: {
      validator: function(senderId) {
        // Alphanumeric (3-11 chars) or numeric (max 15 digits)
        return /^[A-Za-z0-9+]{1,15}$/.test(senderId);
      },
      message: 'Sender ID must be alphanumeric (3-11 chars) or numeric (max 15 digits)',
    },
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending',
    index: true,
  },
  type: {
    type: String,
    enum: ['alphanumeric', 'numeric'],
    required: true,
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  lastUsedAt: {
    type: Date,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  suspensionReason: {
    type: String,
    trim: true,
    maxlength: 500,
  },
}, {
  timestamps: true,
  collection: 'sms_sender_ids',
});

// Add compound indexes
smsSenderIdSchema.index({ userId: 1, senderId: 1 }, { unique: true });
smsSenderIdSchema.index({ userId: 1, status: 1 });
smsSenderIdSchema.index({ userId: 1, isDefault: 1 });

// Pre-save hook to determine type
smsSenderIdSchema.pre('save', function(next) {
  if (this.isModified('senderId')) {
    // Determine type based on senderId content
    if (/^\+?\d+$/.test(this.senderId)) {
      this.type = 'numeric';
    } else {
      this.type = 'alphanumeric';
    }
  }
  next();
});

const SmsSenderId = mongoose.model('SmsSenderId', smsSenderIdSchema);

async function seedSenderIds() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find a test user (you can replace this with a specific user ID)
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const testUser = await User.findOne({}).limit(1);
    
    if (!testUser) {
      console.log('No users found. Please create a user first.');
      return;
    }

    console.log('Using test user:', testUser._id);

    // Clear existing sender IDs for this user
    console.log('🧹 Clearing existing sender IDs...');
    await SmsSenderId.deleteMany({ userId: testUser._id });

    // Sample sender IDs data
    const sampleSenderIds = [
      {
        userId: testUser._id,
        senderId: 'MYCOMPANY',
        description: 'Main company sender ID for business communications',
        status: 'approved',
        type: 'alphanumeric',
        usageCount: 45,
        lastUsedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        isDefault: true,
      },
      {
        userId: testUser._id,
        senderId: 'SUPPORT',
        description: 'Customer support notifications and updates',
        status: 'approved',
        type: 'alphanumeric',
        usageCount: 23,
        lastUsedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        isDefault: false,
      },
      {
        userId: testUser._id,
        senderId: 'MARKETING',
        description: 'Marketing campaigns and promotional messages',
        status: 'pending',
        type: 'alphanumeric',
        usageCount: 0,
        isDefault: false,
      },
      {
        userId: testUser._id,
        senderId: 'ALERTS',
        description: 'System alerts and urgent notifications',
        status: 'rejected',
        type: 'alphanumeric',
        rejectionReason: 'Generic sender ID not allowed. Please use a more specific identifier.',
        usageCount: 0,
        isDefault: false,
      },
      {
        userId: testUser._id,
        senderId: '+212649798920',
        description: 'Moroccan phone number for international SMS',
        status: 'approved',
        type: 'numeric',
        usageCount: 12,
        lastUsedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        isDefault: false,
      },
      {
        userId: testUser._id,
        senderId: '33123456789',
        description: 'French phone number without + prefix',
        status: 'pending',
        type: 'numeric',
        usageCount: 0,
        isDefault: false,
      }
    ];

    // Insert sample sender IDs
    console.log('📤 Inserting sample sender IDs...');
    const insertedSenderIds = await SmsSenderId.insertMany(sampleSenderIds);
    
    console.log('✅ Successfully seeded sender IDs:');
    insertedSenderIds.forEach((senderId, index) => {
      console.log(`   ${index + 1}. ${senderId.senderId} (${senderId.status}) - ${senderId.type}`);
    });

    console.log(`\n📊 Summary:`);
    console.log(`   • Total sender IDs: ${insertedSenderIds.length}`);
    console.log(`   • Approved: ${insertedSenderIds.filter(s => s.status === 'approved').length}`);
    console.log(`   • Pending: ${insertedSenderIds.filter(s => s.status === 'pending').length}`);
    console.log(`   • Rejected: ${insertedSenderIds.filter(s => s.status === 'rejected').length}`);
    console.log(`   • Default: ${insertedSenderIds.find(s => s.isDefault)?.senderId || 'None'}`);

  } catch (error) {
    console.error('❌ Error seeding sender IDs:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seeding function
seedSenderIds(); 