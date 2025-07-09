# Cron Jobs Documentation

This application uses Vercel Cron Jobs to automate various maintenance, billing, and notification tasks. **All internal cron jobs have been migrated to Vercel Cron Jobs for better reliability and scalability.**

## Migration Notice

🔄 **MIGRATED FROM INTERNAL SCHEDULER**: Previously, this application used an internal `SchedulerService` with `node-cron` for scheduling tasks. All these have been migrated to Vercel Cron Jobs:

- ✅ **Balance Checks** - Migrated from internal scheduler
- ✅ **KPI Alerts** - Migrated from internal scheduler  
- ✅ **Customer Notifications** - Migrated from internal scheduler
- ✅ **Scheduled Billing** - New functionality
- ✅ **Backorder Approvals** - New functionality
- ✅ **Cleanup Tasks** - New functionality

## Configuration

### vercel.json

The cron jobs are configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-balance-checks",
      "schedule": "0 */6 * * *"
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

### Schedule Explanations

- `0 */6 * * *` - Every 6 hours
- `0 6 * * *` - Daily at 6:00 AM UTC
- `*/5 * * * *` - Every 5 minutes
- `0 2 * * *` - Daily at 2:00 AM UTC
- `0 1 * * *` - Daily at 1:00 AM UTC  
- `0 3 * * *` - Daily at 3:00 AM UTC

## Cron Jobs

### 1. Process Balance Checks (`/api/cron/process-balance-checks`)

**Purpose**: Check user balances and send low balance notifications.

**Schedule**: `0 */6 * * *` (Every 6 hours)

**What it does**:
- Checks scheduler settings to ensure balance checks are enabled
- Updates last check timestamp in database
- Calls `NotificationService.checkAndNotifyLowBalances()`
- Sends notifications to users with low balances
- Logs detailed execution results

**Migrated from**: Internal SchedulerService balance check task

---

### 2. Process KPI Alerts (`/api/cron/process-kpi-alerts`)

**Purpose**: Analyze KPI data and send alerts when thresholds are exceeded.

**Schedule**: `0 6 * * *` (Daily at 6:00 AM UTC)

**What it does**:
- Fetches CDR data for all admin users from Sippy API
- Calculates KPIs: cost of day, ASR, total minutes, call counts
- Resets daily alert counters
- Checks KPI thresholds using `kpiAlertService`
- Sends alerts when thresholds are exceeded
- Handles multiple users and error resilience

**Migrated from**: Internal SchedulerService KPI alert task

---

### 3. Process Customer Notifications (`/api/cron/process-customer-notifications`)

**Purpose**: Execute scheduled customer notifications.

**Schedule**: `*/5 * * * *` (Every 5 minutes)

**What it does**:
- Checks scheduler settings to ensure notifications are enabled
- Calls `CustomerNotificationService.executeScheduledNotifications()`
- Processes due notifications based on their schedule
- Handles email delivery and tracking
- Updates notification status and delivery records

**Migrated from**: Internal SchedulerService customer notification task

---

### 4. Process Scheduled Billing (`/api/cron/process-scheduled-billing`)

**Purpose**: Automatically process pending billing records that are due for payment.

**Schedule**: `0 2 * * *` (Daily at 2:00 AM UTC)

**What it does**:
- Finds all pending billing records with `billingDate <= today`
- Processes payment for each record using Sippy API
- Updates billing status to 'paid' or 'failed'
- Records transaction IDs for successful payments
- Suspends phone numbers if payment fails due to insufficient funds
- Updates phone number's `lastBilledDate`

**New functionality**: Complements immediate payment processing for ongoing billing

---

### 5. Process Backorder Approvals (`/api/cron/process-backorder-approvals`)

**Purpose**: Automatically process payments for backorder requests that have been approved by admin.

**Schedule**: `0 1 * * *` (Daily at 1:00 AM UTC)

**What it does**:
- Finds approved backorder requests where `paymentProcessed != true`
- Calculates total payment (setup fee + monthly fee)
- Processes payment using Sippy API
- Updates backorder request with payment status
- Records transaction IDs and processing dates

**New functionality**: Automates backorder payment processing after admin approval

---

### 6. Cleanup Expired Sessions (`/api/cron/cleanup-expired-sessions`)

**Purpose**: General maintenance and cleanup tasks.

**Schedule**: `0 3 * * *` (Daily at 3:00 AM UTC)

**What it does**:
- Removes user sessions older than 30 days
- Deletes failed billing records older than 90 days
- Removes orphaned billing records (where phone number no longer exists)
- Additional maintenance tasks as needed

**New functionality**: Automated database maintenance and optimization

## Security

### Environment Variable (Optional but Recommended)

Set `CRON_SECRET` in your environment variables:

```bash
# Generate a secure secret
openssl rand -hex 32

# Add to your environment
CRON_SECRET=your_generated_secret_here
```

If set, cron endpoints will verify the `Authorization: Bearer <CRON_SECRET>` header.

### Built-in Security

- Verifies requests come from Vercel (user-agent check)
- Only accepts POST requests from cron scheduler
- GET requests only available in development mode

## Internal Scheduler Migration

### What Changed

1. **Startup Process**: `src/lib/startup.ts` no longer initializes the internal SchedulerService
2. **Admin API**: `/api/admin/scheduler` now provides migration information and manual trigger capabilities
3. **Settings Respect**: All cron jobs respect the scheduler settings in the database
4. **Manual Triggers**: Balance checks and KPI checks can still be triggered manually via the admin API

### Manual Triggers Still Available

```bash
# Manual balance check
curl -X POST /api/admin/scheduler -d '{"action":"trigger_check"}'

# Manual KPI check  
curl -X POST /api/admin/scheduler -d '{"action":"trigger_kpi_check"}'
```

### Internal Scheduler Status

- **Disabled by Default**: Internal scheduler is commented out in startup
- **Available for Development**: Can be re-enabled by uncommenting code in `startup.ts`
- **Settings Preserved**: Database scheduler settings are still respected by cron jobs

## Monitoring

### Logs

All cron jobs provide detailed logging:
- Start/completion times
- Number of records processed
- Success/failure counts
- Error details for failed operations

### Response Format

```json
{
  "message": "Processed X records, Y failed",
  "processed": 10,
  "failed": 2,
  "errors": [
    {
      "billingId": "...",
      "phoneNumber": "+1234567890",
      "user": "user@example.com",
      "error": "Insufficient funds"
    }
  ],
  "duration": 1500
}
```

## Manual Testing (Development Only)

You can test cron jobs manually in development:

```bash
# Test balance checks
curl http://localhost:3000/api/cron/process-balance-checks

# Test KPI alerts  
curl http://localhost:3000/api/cron/process-kpi-alerts

# Test customer notifications
curl http://localhost:3000/api/cron/process-customer-notifications

# Test scheduled billing
curl http://localhost:3000/api/cron/process-scheduled-billing

# Test backorder approvals  
curl http://localhost:3000/api/cron/process-backorder-approvals

# Test cleanup
curl http://localhost:3000/api/cron/cleanup-expired-sessions
```

## Troubleshooting

### Common Issues

1. **Unauthorized errors**: Check CRON_SECRET configuration
2. **Payment failures**: Verify Sippy API credentials and user account balances
3. **No records processed**: Check database connectivity and record status
4. **Settings disabled**: Verify scheduler settings in database are enabled

### Database Requirements

Ensure these models have the required fields:
- `PhoneNumberBilling`: status, billingDate, phoneNumberId, userId
- `BackorderRequest`: status, paymentProcessed, setupFee, monthlyRate
- `User`: sippyAccountId for payment processing
- `PhoneNumber`: for billing record relationships
- `SchedulerSettings`: enabled flag for controlling cron job execution

## Vercel Deployment

When deploying to Vercel:

1. Ensure `vercel.json` is in your project root
2. Set environment variables in Vercel dashboard (including CRON_SECRET)
3. Cron jobs will automatically be scheduled after deployment
4. Monitor execution in Vercel Functions dashboard

## Benefits of Migration

✅ **Reliability**: Vercel handles cron job execution and retry logic
✅ **Scalability**: No need to keep server running for background tasks
✅ **Monitoring**: Built-in Vercel Functions dashboard monitoring
✅ **Cost Effective**: Only pay for execution time, not idle time
✅ **Global Distribution**: Runs on Vercel's edge network
✅ **Automatic Retries**: Vercel automatically retries failed executions

## Notes

- Cron jobs run in UTC timezone
- Maximum execution time: 10 seconds (Hobby plan) / 60 seconds (Pro plan)
- Failed executions are retried automatically by Vercel
- All database operations use proper error handling and transactions where applicable
- Internal scheduler can be re-enabled for development/testing if needed 