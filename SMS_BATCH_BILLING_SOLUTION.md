# SMS Batch Billing Solution

This document outlines the implementation of batch SMS billing to avoid individual API calls to Sippy for each SMS sent.

## Overview

The current SMS system tracks costs individually for each message, but this approach would require many Sippy API calls for charging users. The new batch billing system accumulates SMS costs over a period (daily, weekly, or monthly) and charges users in bulk.

## Architecture

### 1. SMS Message Tracking (Existing)
- Individual SMS messages are still tracked in the `SmsMessage` model
- Each message has a `cost` field for accurate cost tracking
- Messages are processed through the existing `SmsQueueService`

### 2. Batch Billing Model (`SmsBilling`)
- **Purpose**: Aggregates SMS costs over a billing period
- **Key Features**:
  - Accumulates costs by user and time period
  - Breaks down costs by country/prefix
  - Integrates with Sippy API for actual charging
  - Tracks billing status and payment details

### 3. Automated Processing
- **Cron Job**: `/api/cron/process-sms-billing`
- **Admin Interface**: `/api/admin/sms/billing`

## Implementation Details

### SmsBilling Model

```typescript
interface ISmsBilling {
  userId: ObjectId;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  
  // Aggregated data
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  totalCost: number;
  currency: string;
  
  // Detailed breakdown
  messageBreakdown: Array<{
    country: string;
    prefix: string;
    messageCount: number;
    rate: number;
    totalCost: number;
  }>;
  
  // Payment integration
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  sippyTransactionId?: string;
  
  // Administrative
  processedBy?: string;
  notes?: string;
}
```

### Billing Process Flow

1. **Message Sending** (Existing)
   - SMS messages are sent via existing queue system
   - Individual costs are tracked per message
   - No immediate charging occurs

2. **Period Aggregation** (New)
   ```bash
   # Daily billing (recommended)
   POST /api/cron/process-sms-billing?type=daily
   
   # Weekly billing
   POST /api/cron/process-sms-billing?type=weekly
   
   # Monthly billing
   POST /api/cron/process-sms-billing?type=monthly
   ```

3. **Sippy Integration** (New)
   - Single `accountDebit` call per user per period
   - Detailed payment notes with breakdown
   - Automatic retry and failure handling

### Benefits

#### 1. Reduced API Calls
- **Before**: 1 Sippy API call per SMS (potentially thousands daily)
- **After**: 1 Sippy API call per user per billing period

#### 2. Better Cost Control
- Consolidated billing records
- Detailed cost breakdowns by destination
- Failed vs successful message tracking

#### 3. Flexible Billing Periods
- Daily: Most responsive, good for high-volume users
- Weekly: Balanced approach
- Monthly: Minimal API calls, good for invoice alignment

#### 4. Administrative Control
- Manual billing processing capability
- Detailed audit trail
- Failure investigation and retry

## Usage Examples

### Setting Up Daily Billing Cron Job

```bash
# Add to your cron scheduler (runs daily at 2 AM)
curl -X POST "https://your-domain.com/api/cron/process-sms-billing?type=daily" \
  -H "Authorization: Bearer YOUR_INTERNAL_API_KEY"
```

### Manual Billing Processing

```bash
# Process SMS billing for a specific date
curl -X POST "https://your-domain.com/api/cron/process-sms-billing?date=2024-01-15" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Admin Dashboard Integration

```bash
# Get SMS billing records
GET /api/admin/sms/billing?status=pending&limit=50

# Process specific billing manually
POST /api/admin/sms/billing
{
  "billingId": "billing_record_id"
}
```

## Configuration Options

### Environment Variables

```env
# Required for cron job authentication
INTERNAL_API_KEY=your_secure_internal_key

# Sippy API credentials (existing)
SIPPY_API_URL=your_sippy_url
SIPPY_USERNAME=your_username
SIPPY_PASSWORD=your_password
```

### Billing Frequency Recommendations

| User Type | Recommended Frequency | Reason |
|-----------|----------------------|---------|
| High Volume (>1000 SMS/day) | Daily | Better cash flow control |
| Medium Volume (100-1000 SMS/day) | Weekly | Balanced approach |
| Low Volume (<100 SMS/day) | Monthly | Minimal overhead |

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Billing Success Rate**
   ```sql
   SELECT 
     status,
     COUNT(*) as count,
     SUM(totalCost) as total_amount
   FROM sms_billing 
   WHERE createdAt >= NOW() - INTERVAL 7 DAY
   GROUP BY status;
   ```

2. **Failed Billings**
   ```sql
   SELECT userId, failureReason, totalCost
   FROM sms_billing 
   WHERE status = 'failed'
   ORDER BY createdAt DESC;
   ```

3. **Processing Statistics**
   ```bash
   # Get processing stats
   GET /api/cron/process-sms-billing
   ```

### Alert Conditions

- Failed billing rate > 5%
- Pending billings older than 2 days
- Total daily SMS costs exceed threshold
- Sippy API errors during billing

## Migration Strategy

### Phase 1: Implement Batch Billing (Parallel)
1. Deploy new `SmsBilling` model and APIs
2. Set up cron job for batch processing
3. Run parallel to existing system for validation

### Phase 2: Validation Period
1. Compare batch billing totals with individual message costs
2. Verify Sippy integration works correctly
3. Test failure scenarios and recovery

### Phase 3: Full Migration
1. Switch to batch billing as primary method
2. Keep individual message cost tracking for audit
3. Monitor and optimize billing frequency

## Troubleshooting

### Common Issues

1. **Missing Sippy Account ID**
   - Users must have `sippyAccountId` field populated
   - Billing will be skipped for users without Sippy accounts

2. **Zero Cost Billings**
   - Automatically marked as 'paid' without Sippy call
   - Check if rate deck assignments are correct

3. **Sippy API Failures**
   - Billing records marked as 'failed' with error details
   - Can be retried manually via admin interface

4. **Duplicate Billings**
   - System checks for existing billing records by period
   - Safe to re-run cron job for same period

## API Reference

### Cron Endpoints

```bash
# Process SMS billing
POST /api/cron/process-sms-billing
Query Params:
  - type: daily|weekly|monthly (default: daily)
  - date: YYYY-MM-DD (specific date processing)

# Get billing status
GET /api/cron/process-sms-billing
```

### Admin Endpoints

```bash
# List SMS billing records
GET /api/admin/sms/billing
Query Params:
  - page: number (default: 1)
  - limit: number (default: 20)
  - status: pending|paid|failed|cancelled
  - userId: string
  - startDate: YYYY-MM-DD
  - endDate: YYYY-MM-DD

# Process billing manually
POST /api/admin/sms/billing
Body: { "billingId": "string" }
```

## Security Considerations

1. **API Key Protection**: Internal cron API key should be securely stored
2. **Admin Access**: Billing endpoints require admin role
3. **Audit Trail**: All billing operations are logged with user attribution
4. **Data Validation**: Input validation on all billing parameters
5. **Rate Limiting**: Consider rate limiting on admin endpoints

## Future Enhancements

1. **Real-time Billing Thresholds**: Trigger immediate billing when user reaches cost threshold
2. **Multi-currency Support**: Handle different currencies per user
3. **Billing Notifications**: Email/SMS alerts for billing events
4. **Custom Billing Cycles**: Per-user billing frequency configuration
5. **Prepaid Balance Integration**: Deduct from user balance instead of Sippy charge
6. **Billing Analytics**: Dashboard with cost trends and usage patterns 