# SMS Billing System Integration Guide

This guide explains how to integrate the new SMS billing system into your existing application and set it up for current users.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Migration Steps](#migration-steps)
3. [Integration Points](#integration-points)
4. [User Experience](#user-experience)
5. [Admin Management](#admin-management)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

## 🎯 Overview

The SMS billing system provides:
- **Automated billing** based on SMS usage
- **Flexible billing frequencies** (daily, weekly, monthly, threshold-based)
- **User-specific settings** with global defaults
- **Real-time usage tracking** and notifications
- **Admin management interface** for billing oversight
- **Integration with Sippy** for payment processing

## 🚀 Migration Steps

### Step 1: Run the Migration Script

First, run the migration script to set up default settings for existing users:

```bash
cd ovo
node scripts/migrate-sms-billing.js
```

This script will:
- ✅ Create global default billing settings
- ✅ Set up custom settings for high-volume users (>5000 SMS/month)
- ✅ Generate initial billing records for current month usage
- ✅ Process all active users automatically

### Step 2: Verify Migration Results

Check the migration output for:
- Number of users processed
- Custom settings created
- Initial billing records generated
- Any errors or warnings

### Step 3: Configure Environment Variables

Add these variables to your `.env.local`:

```env
# SMS Billing Configuration
SMS_BILLING_DEFAULT_FREQUENCY=daily
SMS_BILLING_DEFAULT_CURRENCY=USD
SMS_BILLING_AUTO_PROCESS=true
SMS_BILLING_NOTIFICATION_ENABLED=true

# Cron Configuration (for Vercel)
CRON_SECRET=your_secure_cron_secret_here
VERCEL_INTERNAL_API_KEY=your_internal_api_key_here
```

## 🔗 Integration Points

### 1. SMS Sending Integration

To integrate billing with your existing SMS sending logic, add these hooks:

```typescript
// In your SMS sending service/API
import { SMSBillingService } from '@/lib/services/smsBillingService';

export async function sendSMS(userId: string, message: string, phoneNumber: string) {
  // Calculate message cost (implement based on your pricing logic)
  const cost = calculateSMSCost(phoneNumber, message.length);
  
  // Check billing before sending (for threshold-based billing)
  const billingCheck = await SMSBillingService.checkBillingBeforeSend({
    userId,
    messageCount: 1,
    totalCost: cost,
    country: getCountryFromNumber(phoneNumber),
    prefix: getPrefix(phoneNumber)
  });

  // Block if user has pending billings and manual approval is required
  if (billingCheck.shouldBlock) {
    throw new Error(`SMS blocked: ${billingCheck.reason}`);
  }

  // Send the SMS
  const result = await yourSMSProvider.send(message, phoneNumber);

  // Process billing after successful send (for threshold-based billing)
  if (result.success) {
    await SMSBillingService.processBillingAfterSend({
      userId,
      messageCount: 1,
      totalCost: cost,
      country: getCountryFromNumber(phoneNumber),
      prefix: getPrefix(phoneNumber)
    });
  }

  return result;
}
```

### 2. User Dashboard Integration

Add the billing widget to user dashboards:

```typescript
// In your user dashboard component
import { UserBillingWidget } from '@/components/user/UserBillingWidget';

export function UserDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Your existing widgets */}
      <UserBillingWidget />
      {/* Other widgets */}
    </div>
  );
}
```

### 3. Admin Interface Integration

The billing management is already integrated into the SMS admin interface at `/admin/sms?tab=billing`.

## 👤 User Experience

### For End Users

Users will see:

1. **Billing Widget** on their dashboard showing:
   - Current usage vs. limits
   - Progress bars with color coding
   - Next billing date
   - Pending billings count

2. **Notifications** when:
   - Approaching billing thresholds
   - Billing is processed
   - Payment fails

3. **Billing History** (can be added as a separate page):
   - Past billing records
   - Payment status
   - Usage breakdowns

### Billing Behavior

- **Daily Billing**: Processes at 2:00 AM UTC daily
- **Weekly Billing**: Processes on Mondays at 3:00 AM UTC
- **Monthly Billing**: Processes on 1st of month at 4:00 AM UTC
- **Threshold Billing**: Processes immediately when limits are reached

## 👨‍💼 Admin Management

### Billing Management Tab

Admins can:
- ✅ View all billing records with filtering
- ✅ Process pending billings manually
- ✅ Trigger bulk billing jobs
- ✅ View billing statistics
- ✅ Monitor failed payments

### Settings Management

Admins can configure:
- ✅ Global default settings
- ✅ User-specific overrides
- ✅ Billing frequencies and thresholds
- ✅ Auto-processing options
- ✅ Notification settings

### Manual Operations

```bash
# Trigger manual billing processing
curl -X POST "https://your-domain.com/api/cron/process-sms-billing?type=daily" \
  -H "Authorization: Bearer $CRON_SECRET"

# Process specific user billing
curl -X POST "https://your-domain.com/api/admin/sms/billing" \
  -H "Content-Type: application/json" \
  -d '{"billingId": "billing_id_here"}'
```

## 📊 Monitoring & Maintenance

### Key Metrics to Monitor

1. **Billing Success Rate**
   - Track failed vs. successful billing processing
   - Monitor Sippy API response times

2. **User Billing Patterns**
   - Average billing amounts
   - Frequency distribution
   - High-volume users

3. **System Performance**
   - Cron job execution times
   - API response times
   - Database query performance

### Regular Maintenance Tasks

1. **Weekly Reviews**
   - Check failed billings
   - Review high-usage accounts
   - Monitor billing thresholds

2. **Monthly Analysis**
   - Revenue reconciliation
   - User billing pattern analysis
   - System performance review

### Database Cleanup

```javascript
// Clean up old billing records (optional)
// Keep last 12 months of data
const cutoffDate = new Date();
cutoffDate.setMonth(cutoffDate.getMonth() - 12);

await SmsBilling.deleteMany({
  createdAt: { $lt: cutoffDate },
  status: { $in: ['paid', 'cancelled'] }
});
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Billing Not Processing
- ✅ Check cron job configuration in `vercel.json`
- ✅ Verify environment variables
- ✅ Check Sippy API credentials
- ✅ Review user settings (auto-processing enabled?)

#### 2. Users Not Seeing Billing Widget
- ✅ Verify API endpoint `/api/user/billing-summary` is working
- ✅ Check user has billing settings (should inherit from global)
- ✅ Ensure component is properly imported

#### 3. Failed Payments
- ✅ Check user's Sippy account balance
- ✅ Verify Sippy account ID is set
- ✅ Review billing amount (not exceeding limits?)
- ✅ Check Sippy API error messages

#### 4. Performance Issues
- ✅ Add database indexes on frequently queried fields
- ✅ Implement caching for billing summaries
- ✅ Optimize aggregation queries

### Debug Commands

```bash
# Check billing settings
curl "https://your-domain.com/api/admin/sms/billing-settings?includeGlobal=true"

# Get user billing summary
curl "https://your-domain.com/api/user/billing-summary" \
  -H "Cookie: your-auth-cookie"

# View billing statistics
curl "https://your-domain.com/api/admin/sms/billing-stats"
```

### Logs to Monitor

```bash
# Check for billing processing logs
grep "Processing SMS billing" /var/log/app.log

# Monitor failed payments
grep "Failed to process SMS billing" /var/log/app.log

# Check cron execution
grep "SMS Billing Process Summary" /var/log/app.log
```

## 📈 Scaling Considerations

### For High-Volume Deployments

1. **Database Optimization**
   - Add indexes on `userId`, `status`, `billingPeriodStart`
   - Consider partitioning by date
   - Implement read replicas for reporting

2. **Caching Strategy**
   - Cache user billing summaries (5-minute TTL)
   - Cache billing settings (1-hour TTL)
   - Use Redis for session-based caching

3. **Queue Management**
   - Implement job queues for billing processing
   - Add retry logic for failed payments
   - Batch process multiple users

4. **Monitoring & Alerting**
   - Set up alerts for failed billing jobs
   - Monitor API response times
   - Track billing success rates

## 🎯 Next Steps

1. **Run the migration script** to set up existing users
2. **Test the billing flow** with a few test users
3. **Configure monitoring** and alerts
4. **Train admin users** on the new interface
5. **Communicate changes** to end users
6. **Monitor closely** for the first few billing cycles

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review application logs
3. Test with the debug commands
4. Check database consistency

The system is designed to be resilient and won't block SMS sending even if billing encounters errors, ensuring your core SMS functionality remains unaffected. 