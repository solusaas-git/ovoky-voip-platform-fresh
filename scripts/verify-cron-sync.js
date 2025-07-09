#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config();

async function verifyDbAndVercelSync() {
  console.log('🔍 Verifying Cron Job Synchronization...\n');

  try {
    // Connect to database using Mongoose
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB via Mongoose\n');
    
    // 1. Get database cron schedules
    console.log('1️⃣ Fetching database cron schedules...');
    const dbSchedules = await mongoose.connection.db.collection('cron_job_schedules').find({ enabled: true }).toArray();
    console.log(`   Found ${dbSchedules.length} enabled schedules in database\n`);

    // 2. Read vercel.json
    console.log('2️⃣ Reading vercel.json configuration...');
    const vercelJsonPath = path.join(process.cwd(), 'vercel.json');
    const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
    const vercelCrons = vercelConfig.crons || [];
    console.log(`   Found ${vercelCrons.length} cron jobs in vercel.json\n`);

    // 3. Create mapping objects for comparison
    const dbMap = new Map();
    const vercelMap = new Map();

    // Map database schedules
    dbSchedules.forEach(schedule => {
      const path = schedule.jobPath; // Use the actual jobPath from database
      dbMap.set(path, {
        schedule: schedule.schedule,
        enabled: schedule.enabled,
        name: schedule.jobName
      });
    });

    // Map Vercel schedules
    vercelCrons.forEach(cron => {
      vercelMap.set(cron.path, {
        schedule: cron.schedule
      });
    });

    // 4. Compare schedules
    console.log('3️⃣ Comparing database vs Vercel configuration...\n');
    
    let isInSync = true;
    const issues = [];

    // Check each database schedule
    for (const [path, dbData] of dbMap) {
      const vercelData = vercelMap.get(path);
      
      if (!vercelData) {
        isInSync = false;
        issues.push(`❌ Missing in Vercel: ${path} (${dbData.name})`);
        console.log(`❌ ${dbData.name}: Missing in vercel.json`);
        console.log(`   Database: ${path} - ${dbData.schedule}`);
        console.log(`   Vercel: Not found\n`);
      } else if (dbData.schedule !== vercelData.schedule) {
        isInSync = false;
        issues.push(`⚠️  Schedule mismatch: ${path} (${dbData.name})`);
        console.log(`⚠️  ${dbData.name}: Schedule mismatch`);
        console.log(`   Database: ${dbData.schedule}`);
        console.log(`   Vercel: ${vercelData.schedule}\n`);
      } else {
        console.log(`✅ ${dbData.name}: Synchronized`);
        console.log(`   Path: ${path}`);
        console.log(`   Schedule: ${dbData.schedule}\n`);
      }
    }

    // Check for extra Vercel schedules
    for (const [path, vercelData] of vercelMap) {
      if (!dbMap.has(path)) {
        isInSync = false;
        issues.push(`⚠️  Extra in Vercel: ${path}`);
        console.log(`⚠️  Extra in vercel.json: ${path} - ${vercelData.schedule}\n`);
      }
    }

    // 5. Summary
    console.log('4️⃣ Synchronization Summary:');
    console.log('='.repeat(50));
    
    if (isInSync) {
      console.log('✅ PERFECT SYNC: Database and Vercel configurations match!');
      console.log(`📊 ${dbSchedules.length} cron jobs properly synchronized`);
      console.log('\n🚀 Vercel will execute cron jobs based on database schedules');
    } else {
      console.log('❌ SYNC ISSUES DETECTED:');
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log('\n🔧 Run "node scripts/update-vercel-crons.js" to fix synchronization');
      console.log('📋 Then deploy: npx vercel --prod');
    }

    // 6. Next deployment info
    console.log('\n📅 Current Schedule Overview:');
    console.log('-'.repeat(50));
    dbSchedules.forEach(schedule => {
      const path = schedule.jobPath;
      const vercelData = vercelMap.get(path);
      const status = vercelData && vercelData.schedule === schedule.schedule ? '✅' : '❌';
      console.log(`${status} ${schedule.jobName}: ${schedule.schedule}`);
    });

    console.log('\n💡 NOTE: After any database schedule changes:');
    console.log('   1. Run: node scripts/update-vercel-crons.js');
    console.log('   2. Deploy: npx vercel --prod');
    console.log('   3. Verify in Vercel dashboard');

  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

verifyDbAndVercelSync().catch(console.error); 