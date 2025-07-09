#!/usr/bin/env node

/**
 * Fix Campaign Progress Script
 * 
 * This script fixes campaigns that have progress > 100% due to the previous bug
 * and ensures all campaign statistics are consistent.
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sipp';

async function fixCampaignProgress() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('📊 Connected to MongoDB');
    
    const db = client.db();
    const campaignsCollection = db.collection('smscampaigns');
    
    // Find campaigns with progress > 100%
    const problematicCampaigns = await campaignsCollection.find({
      progress: { $gt: 100 }
    }).toArray();
    
    console.log(`🔍 Found ${problematicCampaigns.length} campaigns with progress > 100%`);
    
    let fixedCount = 0;
    let completedCount = 0;
    
    for (const campaign of problematicCampaigns) {
      console.log(`\n🔧 Fixing campaign: ${campaign.name} (${campaign._id})`);
      console.log(`   Current progress: ${campaign.progress}%`);
      console.log(`   Contact count: ${campaign.contactCount}`);
      console.log(`   Sent: ${campaign.sentCount}, Failed: ${campaign.failedCount}`);
      
      // Calculate correct progress
      const totalProcessed = campaign.sentCount + campaign.failedCount + campaign.deliveredCount;
      const maxProgress = Math.min(totalProcessed, campaign.contactCount);
      const correctProgress = campaign.contactCount > 0 ? Math.round((maxProgress / campaign.contactCount) * 100) : 0;
      const boundedProgress = Math.min(correctProgress, 100);
      
      // Determine if campaign should be completed
      const shouldBeCompleted = totalProcessed >= campaign.contactCount;
      
      const updateData = {
        progress: boundedProgress
      };
      
      if (shouldBeCompleted && campaign.status !== 'completed') {
        updateData.status = 'completed';
        updateData.completedAt = new Date();
        updateData.progress = 100;
        completedCount++;
        console.log(`   ✅ Marking as completed with 100% progress`);
      } else {
        console.log(`   📊 Setting progress to ${boundedProgress}%`);
      }
      
      // Update campaign
      await campaignsCollection.updateOne(
        { _id: campaign._id },
        { $set: updateData }
      );
      
      fixedCount++;
    }
    
    console.log(`\n✅ Fixed ${fixedCount} campaigns`);
    console.log(`🎯 Marked ${completedCount} campaigns as completed`);
    
    // Verify the fix
    const remainingProblematic = await campaignsCollection.countDocuments({
      progress: { $gt: 100 }
    });
    
    if (remainingProblematic === 0) {
      console.log('🎉 All campaigns now have valid progress values!');
    } else {
      console.log(`⚠️ Warning: ${remainingProblematic} campaigns still have progress > 100%`);
    }
    
    // Show summary statistics
    const stats = await campaignsCollection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgProgress: { $avg: '$progress' }
        }
      }
    ]).toArray();
    
    console.log('\n📈 Campaign Status Summary:');
    stats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} campaigns (avg progress: ${Math.round(stat.avgProgress)}%)`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing campaign progress:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  fixCampaignProgress()
    .then(() => {
      console.log('✨ Campaign progress fix completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixCampaignProgress }; 