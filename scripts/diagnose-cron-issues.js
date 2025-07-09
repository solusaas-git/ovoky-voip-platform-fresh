#!/usr/bin/env node

/**
 * Cron Jobs Diagnostic Script
 * 
 * This script checks for common issues that prevent cron jobs from running:
 * - Database connectivity
 * - Cron job schedules in database
 * - Scheduler settings
 * - Recent execution history
 * - Environment variables
 * 
 * Usage: node scripts/diagnose-cron-issues.js
 */

const mongoose = require('mongoose');
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

// Define schemas for diagnostic checks
const cronJobScheduleSchema = new mongoose.Schema({
  jobName: String,
  jobPath: String,
  schedule: String,
  description: String,
  enabled: Boolean,
  isCustom: Boolean,
  lastModified: Date,
}, {
  collection: 'cron_job_schedules',
  timestamps: true,
});

const cronJobExecutionSchema = new mongoose.Schema({
  jobName: String,
  jobPath: String,
  executedAt: Date,
  status: String,
  duration: Number,
  processed: Number,
  failed: Number,
  triggeredBy: String,
  notes: String,
}, {
  collection: 'cron_job_executions',
  timestamps: true,
});

const schedulerSettingsSchema = new mongoose.Schema({
  enabled: Boolean,
  lastBalanceCheck: Date,
  balanceCheckInterval: Number,
}, {
  collection: 'scheduler_settings',
});

const CronJobSchedule = mongoose.models.CronJobSchedule || 
  mongoose.model('CronJobSchedule', cronJobScheduleSchema);

const CronJobExecution = mongoose.models.CronJobExecution || 
  mongoose.model('CronJobExecution', cronJobExecutionSchema);

const SchedulerSettings = mongoose.models.SchedulerSettings || 
  mongoose.model('SchedulerSettings', schedulerSettingsSchema);

async function runDiagnostics() {
  console.log('🔍 Starting Cron Jobs Diagnostic...\n');

  try {
    // 1. Check database connection
    console.log('1️⃣ Checking database connection...');
    await connectToDatabase();
    console.log('   ✅ Database connected successfully\n');

    // 2. Check environment variables
    console.log('2️⃣ Checking environment variables...');
    const requiredEnvVars = ['MONGODB_URI'];
    const optionalEnvVars = ['CRON_SECRET', 'NEXT_PUBLIC_APP_URL'];
    
    requiredEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        console.log(`   ✅ ${envVar}: Set`);
      } else {
        console.log(`   ❌ ${envVar}: Missing`);
      }
    });

    optionalEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        console.log(`   ✅ ${envVar}: Set`);
      } else {
        console.log(`   ⚠️ ${envVar}: Not set (recommended for production)`);
      }
    });
    console.log('');

    // 3. Check scheduler settings
    console.log('3️⃣ Checking scheduler settings...');
    const schedulerSettings = await SchedulerSettings.findOne();
    if (schedulerSettings) {
      console.log(`   📊 Scheduler enabled: ${schedulerSettings.enabled ? '✅ Yes' : '❌ No'}`);
      console.log(`   📅 Last balance check: ${schedulerSettings.lastBalanceCheck || 'Never'}`);
    } else {
      console.log('   ⚠️ No scheduler settings found in database');
    }
    console.log('');

    // 4. Check cron job schedules
    console.log('4️⃣ Checking cron job schedules in database...');
    const schedules = await CronJobSchedule.find().sort({ jobName: 1 });
    if (schedules.length === 0) {
      console.log('   ❌ No cron job schedules found in database');
      console.log('   💡 Run initialization script to create default schedules');
    } else {
      console.log(`   📋 Found ${schedules.length} cron job schedules:`);
      schedules.forEach(schedule => {
        const status = schedule.enabled ? '✅ Enabled' : '❌ Disabled';
        console.log(`   • ${schedule.jobName}: ${schedule.schedule} (${status})`);
      });
    }
    console.log('');

    // 5. Check recent executions
    console.log('5️⃣ Checking recent cron job executions...');
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const recentExecutions = await CronJobExecution
      .find({ executedAt: { $gte: twentyFourHoursAgo } })
      .sort({ executedAt: -1 })
      .limit(10);

    if (recentExecutions.length === 0) {
      console.log('   ❌ No executions in the last 24 hours');
      console.log('   💡 This indicates cron jobs are not running automatically');
    } else {
      console.log(`   📊 Found ${recentExecutions.length} executions in last 24 hours:`);
      recentExecutions.forEach(execution => {
        const statusIcon = execution.status === 'success' ? '✅' : 
                          execution.status === 'failed' ? '❌' : '⚠️';
        console.log(`   ${statusIcon} ${execution.jobName}: ${execution.status} (${execution.triggeredBy}) - ${execution.executedAt.toISOString()}`);
      });
    }
    console.log('');

    // 6. Check for recent failures
    console.log('6️⃣ Checking for recent failures...');
    const recentFailures = await CronJobExecution
      .find({ 
        status: 'failed',
        executedAt: { $gte: twentyFourHoursAgo }
      })
      .sort({ executedAt: -1 })
      .limit(5);

    if (recentFailures.length === 0) {
      console.log('   ✅ No failures in the last 24 hours');
    } else {
      console.log(`   ❌ Found ${recentFailures.length} failures in last 24 hours:`);
      recentFailures.forEach(failure => {
        console.log(`   • ${failure.jobName}: ${failure.notes || 'No details'} - ${failure.executedAt.toISOString()}`);
      });
    }
    console.log('');

    // 7. Summary and recommendations
    console.log('📋 DIAGNOSTIC SUMMARY:');
    
    const enabledSchedules = schedules.filter(s => s.enabled).length;
    const hasRecentExecutions = recentExecutions.length > 0;
    const schedulerEnabled = schedulerSettings?.enabled !== false;

    if (schedules.length === 0) {
      console.log('❌ PRIMARY ISSUE: No cron schedules in database');
      console.log('🔧 SOLUTION: Initialize default schedules via admin panel or API');
    } else if (!schedulerEnabled) {
      console.log('❌ PRIMARY ISSUE: Scheduler is disabled in settings');
      console.log('🔧 SOLUTION: Enable scheduler in admin settings');
    } else if (enabledSchedules === 0) {
      console.log('❌ PRIMARY ISSUE: All cron jobs are disabled');
      console.log('🔧 SOLUTION: Enable cron jobs via admin panel');
    } else if (!hasRecentExecutions) {
      console.log('❌ PRIMARY ISSUE: No recent executions (likely authentication or deployment issue)');
      console.log('🔧 SOLUTIONS:');
      console.log('   1. Set CRON_SECRET environment variable in Vercel');
      console.log('   2. Ensure latest deployment includes cron configuration');
      console.log('   3. Check Vercel Functions dashboard for errors');
    } else {
      console.log('✅ Cron jobs appear to be working correctly');
    }

    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Check Vercel deployment environment variables');
    console.log('2. Run: node scripts/update-vercel-crons.js');
    console.log('3. Deploy to Vercel: vercel --prod');
    console.log('4. Monitor Vercel Functions dashboard');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
}

// Run diagnostics
if (require.main === module) {
  runDiagnostics();
}

module.exports = runDiagnostics; 