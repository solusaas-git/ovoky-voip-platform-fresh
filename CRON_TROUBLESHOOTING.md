# Cron Jobs Troubleshooting Guide

## Issue Identified: Cron Jobs Not Triggering Automatically

After investigation, we found that the cron jobs were not triggering automatically due to a **configuration synchronization issue** between the database and Vercel deployment.

---

## 🔍 Root Cause Analysis

### What We Found:

1. **✅ Database Configuration**: All cron jobs are properly configured and enabled in the `cron_job_schedules` collection
2. **✅ Authentication**: `CRON_SECRET` environment variable is properly set
3. **✅ Scheduler Settings**: Scheduler is enabled in the database
4. **❌ Synchronization Issue**: The `vercel.json` file was not updated with the latest schedules from the database

### The Problem:

- The system stores cron schedules dynamically in MongoDB (`cron_job_schedules` collection)
- Vercel requires static configuration in `vercel.json` for cron jobs to run
- The synchronization script `scripts/update-vercel-crons.js` was empty
- Manual executions worked fine, but automatic Vercel cron jobs failed due to outdated static configuration

---

## 🔧 Solution Implemented

### 1. Created Missing Update Script

Created `scripts/update-vercel-crons.js` that:
- Connects to MongoDB
- Fetches enabled cron schedules from database
- Updates `vercel.json` with current schedules
- Preserves other Vercel configuration

### 2. Created Diagnostic Script

Created `scripts/diagnose-cron-issues.js` that checks:
- Database connectivity
- Environment variables
- Scheduler settings
- Cron job schedules
- Recent execution history
- Recent failures

### 3. Fixed Schedule Synchronization

**Before:**
```json
{
  "crons": [
    {
      "path": "/api/cron/process-backorder-approvals",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/cron/process-balance-checks",
      "schedule": "*/15 * * * *"
    }
    // ... static schedules that might be outdated
  ]
}
```

**After:**
```json
{
  "crons": [
    {
      "path": "/api/cron/process-balance-checks",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/process-kpi-alerts",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/process-customer-notifications",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/process-scheduled-billing",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/process-backorder-approvals",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/cron/cleanup-expired-sessions",
      "schedule": "0 3 * * *"
    }
  ]
}
```

---

## 📋 Current Cron Job Status

All 6 cron jobs are now properly configured:

| Job Name | Schedule | Frequency | Status |
|----------|----------|-----------|---------|
| **Customer Notifications** | `*/5 * * * *` | Every 5 minutes | ✅ Enabled |
| **Balance Checks** | `*/15 * * * *` | Every 15 minutes | ✅ Enabled |
| **Backorder Approvals** | `0 1 * * *` | Daily at 1:00 AM UTC | ✅ Enabled |
| **Scheduled Billing** | `0 2 * * *` | Daily at 2:00 AM UTC | ✅ Enabled |
| **Cleanup Tasks** | `0 3 * * *` | Daily at 3:00 AM UTC | ✅ Enabled |
| **KPI Alerts** | `0 6 * * *` | Daily at 6:00 AM UTC | ✅ Enabled |

---

## 🚀 Next Steps for Deployment

### 1. Deploy Updated Configuration

```bash
# Deploy to Vercel with updated cron configuration
vercel --prod
```

### 2. Verify Deployment

After deployment:
1. Check Vercel Functions dashboard
2. Verify cron jobs are scheduled
3. Monitor execution logs

### 3. Ongoing Maintenance

When modifying cron schedules via admin panel:

```bash
# 1. Update vercel.json with database schedules
node scripts/update-vercel-crons.js

# 2. Deploy changes
vercel --prod
```

---

## 🔧 Troubleshooting Commands

### Diagnose Issues
```bash
# Run comprehensive diagnostic
node scripts/diagnose-cron-issues.js
```

### Update Configuration
```bash
# Sync database schedules to vercel.json
node scripts/update-vercel-crons.js
```

### Manual Testing (Development)
```bash
# Test individual cron jobs locally
curl -X POST http://localhost:3000/api/cron/process-balance-checks
curl -X POST http://localhost:3000/api/cron/process-customer-notifications
```

---

## 🔒 Security Verification

The system uses proper authentication:

1. **Vercel Cron Jobs**: Authenticated via `CRON_SECRET` environment variable
2. **Manual Triggers**: Require admin authentication
3. **User Agent Check**: Verifies requests come from Vercel

```typescript
// Authentication check in each cron endpoint
async function verifyCronRequest(request: NextRequest) {
  // Check for Vercel cron job authentication
  const cronSecret = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;
  
  if (expectedSecret && cronSecret === `Bearer ${expectedSecret}`) {
    const userAgent = request.headers.get('user-agent');
    if (userAgent?.includes('vercel')) {
      return { authorized: true, isManual: false };
    }
  }
  
  // Check for authenticated admin user (manual trigger)
  try {
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.role === 'admin') {
      return { authorized: true, isManual: true };
    }
  } catch (error) {
    // Authentication failed
  }
  
  return { authorized: false, isManual: false };
}
```

---

## 📊 Monitoring

### Execution Tracking

All cron jobs automatically record:
- Execution time and duration
- Success/failure status
- Number of records processed
- Error details for failures
- Trigger type (manual vs automatic)

### Admin Dashboard

Monitor via admin panel:
- Real-time execution status
- Success rates
- Performance metrics
- Error logs

---

## ⚠️ Important Notes

1. **Environment Variables**: Ensure `CRON_SECRET` is set in Vercel deployment
2. **Deployment Required**: Changes to cron schedules require Vercel deployment
3. **Database Dependency**: All cron jobs depend on MongoDB connectivity
4. **Scheduler Settings**: Master enable/disable control via `scheduler_settings` collection
5. **Time Zone**: All schedules run in UTC time zone

---

## 🎯 Expected Behavior After Fix

1. **Customer Notifications**: Execute every 5 minutes automatically
2. **Balance Checks**: Execute every 15 minutes automatically  
3. **Daily Jobs**: Execute at scheduled UTC times automatically
4. **Execution Logs**: Appear in both Vercel dashboard and database
5. **Manual Triggers**: Continue to work via admin panel

The cron jobs should now trigger automatically according to their schedules once deployed to Vercel. 