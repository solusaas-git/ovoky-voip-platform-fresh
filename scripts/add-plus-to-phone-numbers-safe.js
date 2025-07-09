#!/usr/bin/env node

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

// MongoDB connection - Update this with your actual connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sipp';

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log(`🔗 Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    console.error('💡 Make sure your MONGODB_URI is correct in your .env file or set it as environment variable');
    process.exit(1);
  }
}

// Phone Number schema (simplified for this script)
const phoneNumberSchema = new mongoose.Schema({
  number: String,
  country: String,
  countryCode: String,
  status: String,
  assignedTo: mongoose.Schema.Types.ObjectId,
  // ... other fields
}, {
  collection: 'phone_numbers',
  timestamps: true
});

const PhoneNumber = mongoose.model('PhoneNumber', phoneNumberSchema);

// Create backup before making changes
async function createBackup() {
  try {
    console.log('💾 Creating backup of phone numbers...');
    
    const phoneNumbers = await PhoneNumber.find({}).lean();
    const backupData = {
      timestamp: new Date().toISOString(),
      totalCount: phoneNumbers.length,
      data: phoneNumbers
    };
    
    const backupDir = path.join(__dirname, 'backups');
    await fs.mkdir(backupDir, { recursive: true });
    
    const backupFileName = `phone_numbers_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const backupPath = path.join(backupDir, backupFileName);
    
    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
    console.log(`✅ Backup created: ${backupPath}`);
    console.log(`📊 Backed up ${phoneNumbers.length} phone numbers`);
    
    return backupPath;
  } catch (error) {
    console.error('❌ Failed to create backup:', error);
    throw error;
  }
}

// Dry run - show what would be changed without making changes
async function dryRun() {
  try {
    console.log('🔍 DRY RUN - Analyzing phone numbers...\n');
    
    const totalCount = await PhoneNumber.countDocuments();
    console.log(`📊 Total phone numbers in database: ${totalCount}`);
    
    // Find phone numbers that don't start with +
    const numbersWithoutPlus = await PhoneNumber.find({
      number: { $not: /^\+/ }
    }).select('number country status assignedTo').limit(20);
    
    const countWithoutPlus = await PhoneNumber.countDocuments({
      number: { $not: /^\+/ }
    });
    
    const countWithPlus = await PhoneNumber.countDocuments({
      number: /^\+/
    });
    
    console.log(`📈 Numbers without + sign: ${countWithoutPlus}`);
    console.log(`📈 Numbers already with + sign: ${countWithPlus}`);
    
    if (countWithoutPlus === 0) {
      console.log('✅ All phone numbers already have the + sign. No updates needed!');
      return { needsUpdate: false, count: 0 };
    }
    
    console.log(`\n🔍 Sample numbers that would be updated (showing up to 20):`);
    numbersWithoutPlus.forEach((phone, index) => {
      const assignedStatus = phone.assignedTo ? '(Assigned)' : '(Available)';
      console.log(`   ${index + 1}. ${phone.number} → +${phone.number} (${phone.country}) ${assignedStatus}`);
    });
    
    if (countWithoutPlus > 20) {
      console.log(`   ... and ${countWithoutPlus - 20} more numbers`);
    }
    
    return { needsUpdate: true, count: countWithoutPlus };
    
  } catch (error) {
    console.error('❌ Error during dry run:', error);
    throw error;
  }
}

// Perform the actual update
async function updatePhoneNumbers() {
  try {
    console.log('🚀 Starting actual update process...\n');
    
    // Get count before update
    const countWithoutPlus = await PhoneNumber.countDocuments({
      number: { $not: /^\+/ }
    });
    
    if (countWithoutPlus === 0) {
      console.log('✅ No phone numbers need updating!');
      return { success: true, updated: 0 };
    }
    
    console.log(`🔄 Updating ${countWithoutPlus} phone numbers...`);
    
    // Use MongoDB's updateMany with aggregation pipeline for better performance
    const result = await PhoneNumber.updateMany(
      { number: { $not: /^\+/ } },
      [
        {
          $set: {
            number: { $concat: ["+", "$number"] }
          }
        }
      ]
    );
    
    console.log('\n✅ Update Results:');
    console.log(`   Matched: ${result.matchedCount}`);
    console.log(`   Modified: ${result.modifiedCount}`);
    console.log(`   Acknowledged: ${result.acknowledged}`);
    
    return { success: true, updated: result.modifiedCount };
    
  } catch (error) {
    console.error('❌ Error during update:', error);
    throw error;
  }
}

// Verify the results
async function verifyResults() {
  try {
    console.log('\n🔍 Verifying results...');
    
    const totalCount = await PhoneNumber.countDocuments();
    const countWithPlus = await PhoneNumber.countDocuments({
      number: /^\+/
    });
    const countWithoutPlus = await PhoneNumber.countDocuments({
      number: { $not: /^\+/ }
    });
    
    console.log(`📊 Final Statistics:`);
    console.log(`   Total numbers: ${totalCount}`);
    console.log(`   Numbers with + sign: ${countWithPlus}`);
    console.log(`   Numbers without + sign: ${countWithoutPlus}`);
    
    if (countWithoutPlus === 0) {
      console.log('\n🎉 SUCCESS: All phone numbers now have the + sign!');
    } else {
      console.log(`\n⚠️ WARNING: ${countWithoutPlus} numbers still don't have the + sign.`);
      
      // Show problematic numbers
      const problematic = await PhoneNumber.find({
        number: { $not: /^\+/ }
      }).select('number country status').limit(5);
      
      console.log('🔍 Problematic numbers:');
      problematic.forEach((phone, index) => {
        console.log(`   ${index + 1}. "${phone.number}" (${phone.country})`);
      });
    }
    
    // Show sample of updated numbers
    console.log('\n📋 Sample of numbers with + sign:');
    const sampleUpdated = await PhoneNumber.find({
      number: /^\+/
    }).select('number country status').limit(5);
    
    sampleUpdated.forEach((phone, index) => {
      console.log(`   ${index + 1}. ${phone.number} (${phone.country}) - ${phone.status}`);
    });
    
    return countWithoutPlus === 0;
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  }
}

async function main() {
  let backupPath = null;
  
  try {
    console.log('🔧 Phone Number + Sign Update Script');
    console.log('=====================================\n');
    
    await connectToDatabase();
    
    // Step 1: Dry run
    const dryRunResult = await dryRun();
    
    if (!dryRunResult.needsUpdate) {
      console.log('\n✅ No updates needed. Script completed!');
      return;
    }
    
    console.log(`\n⚠️ Ready to update ${dryRunResult.count} phone numbers.`);
    console.log('📝 This will add a + sign to the beginning of each number that doesn\'t have one.');
    
    // Step 2: Create backup
    backupPath = await createBackup();
    
    // Step 3: Perform update
    const updateResult = await updatePhoneNumbers();
    
    if (!updateResult.success) {
      throw new Error('Update failed');
    }
    
    // Step 4: Verify results
    const verificationPassed = await verifyResults();
    
    if (verificationPassed) {
      console.log('\n🎉 Script completed successfully!');
      console.log(`📊 Updated ${updateResult.updated} phone numbers`);
      console.log(`💾 Backup available at: ${backupPath}`);
    } else {
      console.log('\n⚠️ Script completed with warnings. Check the verification results above.');
    }
    
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    
    if (backupPath) {
      console.log(`💾 Backup is available at: ${backupPath}`);
      console.log('💡 You can use this backup to restore the original data if needed.');
    }
    
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { 
  addPlusToPhoneNumbers: updatePhoneNumbers,
  createBackup,
  dryRun,
  verifyResults
}; 