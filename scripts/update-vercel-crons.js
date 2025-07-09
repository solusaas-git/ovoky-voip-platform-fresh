#!/usr/bin/env node

/**
 * Update Vercel Cron Configuration
 * 
 * This script reads cron job schedules from the database and updates
 * the vercel.json file with the current enabled schedules.
 * 
 * Usage: node scripts/update-vercel-crons.js
 */

const mongoose = require('mongoose');
const fs = require('fs/promises');
const path = require('path');

// Load environment variables
require('dotenv').config();

// MongoDB Connection
async function connectToDatabase() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
}

// Cron Job Schedule Schema (simplified for script usage)
const cronJobScheduleSchema = new mongoose.Schema({
  jobName: String,
  jobPath: String,
  schedule: String,
  description: String,
  enabled: Boolean,
  isCustom: Boolean,
}, {
  collection: 'cron_job_schedules',
});

const CronJobSchedule = mongoose.models.CronJobSchedule || 
  mongoose.model('CronJobSchedule', cronJobScheduleSchema);

async function updateVercelConfig() {
  try {
    console.log('🔄 Connecting to database...');
    await connectToDatabase();

    console.log('📋 Fetching cron schedules from database...');
    const schedules = await CronJobSchedule.find({ enabled: true }).lean();
    
    console.log(`✅ Found ${schedules.length} enabled cron jobs`);

    // Read existing vercel.json
    const vercelPath = path.join(process.cwd(), 'vercel.json');
    let existingConfig = {};

    try {
      const existingContent = await fs.readFile(vercelPath, 'utf-8');
      existingConfig = JSON.parse(existingContent);
      console.log('📄 Existing vercel.json loaded');
    } catch (error) {
      console.log('📄 No existing vercel.json found, creating new one');
    }

    // Generate new cron configuration
    const cronConfig = schedules.map(schedule => ({
      path: schedule.jobPath,
      schedule: schedule.schedule,
    }));

    // Merge configurations
    const newConfig = {
      ...existingConfig,
      crons: cronConfig,
    };

    // Write updated vercel.json
    await fs.writeFile(vercelPath, JSON.stringify(newConfig, null, 2));
    
    console.log('✅ vercel.json updated successfully');
    console.log('\n📊 Updated cron jobs:');
    cronConfig.forEach(cron => {
      console.log(`  • ${cron.path} - ${cron.schedule}`);
    });

    console.log('\n🚀 Next steps:');
    console.log('  1. Review the updated vercel.json file');
    console.log('  2. Deploy to Vercel: vercel --prod');
    console.log('  3. Verify cron jobs are scheduled in Vercel dashboard');

  } catch (error) {
    console.error('❌ Error updating Vercel configuration:', error);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
}

// Run the script
if (require.main === module) {
  updateVercelConfig();
}

module.exports = updateVercelConfig; 