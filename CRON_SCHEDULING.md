# Dynamic Cron Job Scheduling System

This document describes the dynamic cron job scheduling system that allows administrators to configure cron job schedules through the web interface.

## Overview

The system provides a complete solution for managing Vercel Cron Jobs dynamically:

- **Database-Driven Configuration**: Cron schedules are stored in MongoDB
- **Web Interface**: Admins can edit schedules through the settings page
- **Automatic Validation**: Cron expressions are validated before saving
- **Execution Tracking**: Complete execution history and statistics
- **Deployment Integration**: Schedules are applied during deployment

## Architecture

### Components

1. **CronJobSchedule Model** (`/src/models/CronJobSchedule.ts`)
   - Stores cron job configurations in MongoDB
   - Validates cron expressions
   - Tracks custom vs default schedules

2. **CronScheduleService** (`/src/lib/services/cronScheduleService.ts`)
   - Manages CRUD operations for schedules
   - Validates cron expressions
   - Generates Vercel configuration
   - Provides human-readable descriptions

3. **Admin API** (`/src/app/api/admin/cron-schedules/route.ts`)
   - REST API for schedule management
   - Supports update, reset, validate, and initialize actions
   - Protected by admin authentication

4. **UI Component** (`/src/components/settings/SchedulerSettings.tsx`)
   - Comprehensive interface for schedule management
   - Real-time validation and feedback
   - Quick-select common schedules

5. **Update Script** (`/scripts/update-vercel-crons.js`)
   - Syncs database schedules to `vercel.json`
   - Run during deployment process

## Features

### Schedule Management

- **Edit Schedules**: Modify cron expressions through the UI
- **Enable/Disable**: Control individual job execution
- **Reset to Default**: Restore original schedules
- **Custom Descriptions**: Add meaningful descriptions to jobs

### Validation

- **Real-time Validation**: Immediate feedback on cron expression validity
- **Field Validation**: Individual validation of minute, hour, day, month, weekday
- **Human-readable Descriptions**: Automatic conversion to readable format

### Common Schedules

Pre-defined quick-select options:
- Every 5/15/30 minutes
- Every 1/2/6/12 hours  
- Daily at various times
- Weekly and monthly options

### Security

- **Admin Only**: Only admin users can modify schedules
- **Input Validation**: Comprehensive cron expression validation
- **Audit Trail**: Track who made changes and when

## Usage

### Web Interface

1. Navigate to `/settings?tab=scheduler`
2. Click "Edit" on any cron job
3. Modify the schedule, description, or enabled status
4. Use quick-select buttons for common schedules
5. Save changes (requires redeploy to take effect)

### API Endpoints

#### Get All Schedules
```http
GET /api/admin/cron-schedules
```

#### Update Schedule
```http
POST /api/admin/cron-schedules
Content-Type: application/json

{
  "action": "update",
  "jobName": "Balance Checks",
  "schedule": "0 */4 * * *",
  "description": "Updated description",
  "enabled": true
}
```

#### Validate Schedule
```http
POST /api/admin/cron-schedules
Content-Type: application/json

{
  "action": "validate",
  "schedule": "0 */6 * * *"
}
```

#### Reset to Default
```http
POST /api/admin/cron-schedules
Content-Type: application/json

{
  "action": "reset",
  "jobName": "Balance Checks"
}
```

### Cron Expression Format

Cron expressions use 5 fields: `minute hour day month weekday`

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of the month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of the week (0 - 7) (Sunday=0 or 7)
│ │ │ │ │
* * * * *
```

### Examples

| Expression | Description |
|------------|-------------|
| `*/5 * * * *` | Every 5 minutes |
| `0 */6 * * *` | Every 6 hours |
| `0 2 * * *` | Daily at 2:00 AM |
| `0 0 * * 1` | Weekly on Monday |
| `0 0 1 * *` | Monthly on 1st |

## Default Jobs

The system comes with 6 pre-configured cron jobs:

1. **Balance Checks** - `0 */6 * * *` (Every 6 hours)
2. **KPI Alerts** - `0 6 * * *` (Daily at 6 AM)
3. **Customer Notifications** - `*/5 * * * *` (Every 5 minutes)
4. **Scheduled Billing** - `0 2 * * *` (Daily at 2 AM)
5. **Backorder Approvals** - `0 1 * * *` (Daily at 1 AM)
6. **Cleanup Tasks** - `0 3 * * *` (Daily at 3 AM)

## Deployment Process

### Manual Deployment

1. Make schedule changes through the UI
2. Run the update script: `node scripts/update-vercel-crons.js`
3. Deploy to Vercel: `vercel --prod`

### Automated Deployment

Add to your CI/CD pipeline:

```bash
# Install dependencies
npm install

# Update Vercel configuration
node scripts/update-vercel-crons.js

# Deploy to Vercel
vercel --prod
```

### Environment Variables

Ensure these are set in your deployment environment:

```bash
MONGODB_URI=mongodb://...
CRON_SECRET=your-secret-key
```

## Database Schema

### CronJobSchedule Collection

```javascript
{
  _id: ObjectId,
  jobName: String,        // Unique job identifier
  jobPath: String,        // API path (e.g., "/api/cron/...")
  schedule: String,       // Cron expression
  description: String,    // Human description
  enabled: Boolean,       // Enable/disable flag
  isCustom: Boolean,      // True if modified from default
  icon: String,          // Icon identifier
  canTriggerManually: Boolean,  // Allow manual triggers
  triggerAction: String,  // Action for manual trigger
  createdBy: String,     // Admin who created/modified
  lastModified: Date,    // Last modification time
  createdAt: Date,       // Creation timestamp
  updatedAt: Date        // Update timestamp
}
```

## Monitoring

### Execution Tracking

The system automatically tracks:
- Last execution time
- Success/failure status
- Execution duration
- 30-day success rates
- Error details

### Admin Dashboard

View execution statistics:
- Real-time status badges
- Performance metrics
- Failure analysis
- Historical trends

## Troubleshooting

### Common Issues

1. **Invalid Cron Expression**
   - Use the validation API to check expressions
   - Refer to crontab.guru for help
   - Use quick-select buttons for common patterns

2. **Changes Not Taking Effect**
   - Verify the update script ran successfully
   - Check vercel.json was updated
   - Ensure deployment completed

3. **Jobs Not Running**
   - Check if the job is enabled in settings
   - Verify master control is enabled
   - Check Vercel Functions logs

### Debug Commands

```bash
# Test cron expression validation
curl -X POST /api/admin/cron-schedules \
  -H "Content-Type: application/json" \
  -d '{"action": "validate", "schedule": "0 */6 * * *"}'

# Check current schedules
curl /api/admin/cron-schedules

# View execution history
curl /api/admin/cron-executions
```

## Best Practices

### Schedule Design

1. **Avoid Overlaps**: Ensure jobs don't overlap during peak usage
2. **Spread Load**: Distribute heavy jobs across different times
3. **Consider Timezones**: All times are UTC in Vercel
4. **Test First**: Use manual triggers to test before scheduling

### Performance

1. **Monitor Duration**: Keep job execution under 30 seconds
2. **Handle Failures**: Implement proper error handling
3. **Log Appropriately**: Use structured logging for debugging
4. **Resource Limits**: Be aware of Vercel function limits

### Security

1. **Validate Input**: Always validate cron expressions
2. **Audit Changes**: Track who made modifications
3. **Protect Endpoints**: Ensure admin-only access
4. **Secret Management**: Use environment variables for secrets

## Migration Notes

### From Internal Scheduler

The system migrated from `node-cron` based internal scheduling to Vercel Cron Jobs:

- **Benefits**: Better reliability, no server overhead, Vercel management
- **Changes**: Schedules now stored in database instead of code
- **Compatibility**: Legacy settings preserved for manual triggers

### Upgrading

When upgrading existing deployments:

1. Initialize default schedules: Call `/api/admin/cron-schedules` with `action: "initialize"`
2. Update deployment process to include the update script
3. Verify all jobs are working as expected
4. Update any automation scripts to use new API endpoints 