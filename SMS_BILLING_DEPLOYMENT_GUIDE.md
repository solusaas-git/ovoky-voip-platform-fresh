# SMS Billing System - Deployment Guide

## Overview
This guide covers the deployment and setup of the SMS Billing System for Vercel, including automatic cron jobs, frontend interfaces, and API endpoints.

## Prerequisites
- MongoDB database
- Vercel account
- Sippy API credentials
- Node.js 18+ and npm 8+

## 1. Environment Variables

### Required Environment Variables
```bash
# Database
MONGODB_URI=mongodb://your-mongodb-connection-string

# NextAuth
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-domain.vercel.app

# Sippy API
SIPPY_API_URL=https://api.sippy.com
SIPPY_API_USERNAME=your-sippy-username
SIPPY_API_PASSWORD=your-sippy-password

# Internal API Key (for cron jobs)
INTERNAL_API_KEY=your-internal-api-key-for-cron-jobs

# SMS Billing Configuration
SMS_BILLING_DEFAULT_FREQUENCY=daily
SMS_BILLING_DEFAULT_CURRENCY=USD
SMS_BILLING_AUTO_PROCESS=true
SMS_BILLING_NOTIFY_ADMIN=true
SMS_BILLING_NOTIFY_USER=true

# Vercel Cron Secret (optional)
VERCEL_CRON_SECRET=your-vercel-cron-secret
```

### Setting Environment Variables in Vercel
1. Go to your Vercel dashboard
2. Select your project
3. Navigate to Settings > Environment Variables
4. Add all the required variables for Production, Preview, and Development

## 2. Vercel Cron Jobs

### Automatic Cron Configuration
The system is configured with the following cron jobs in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-sms-billing?type=daily",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/process-sms-billing?type=weekly", 
      "schedule": "0 3 * * 1"
    },
    {
      "path": "/api/cron/process-sms-billing?type=monthly",
      "schedule": "0 4 1 * *"
    }
  ]
}
```

### Cron Schedule Explanation
- **Daily**: Every day at 2:00 AM UTC
- **Weekly**: Every Monday at 3:00 AM UTC  
- **Monthly**: 1st day of each month at 4:00 AM UTC

### Manual Cron Execution
You can manually trigger billing processing using npm scripts:

```bash
# Daily billing
npm run sms:billing:daily

# Weekly billing
npm run sms:billing:weekly

# Monthly billing
npm run sms:billing:monthly

# Create billing records only (no payment processing)
npm run sms:billing:create
```

## 3. Deployment Steps

### 1. Clone and Setup
```bash
git clone your-repository
cd ovo
npm install --legacy-peer-deps
```

### 2. Environment Configuration
```bash
cp .env.example .env.local
# Edit .env.local with your actual values
```

### 3. Database Setup
Ensure your MongoDB database is accessible and the connection string is correct.

### 4. Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod

# Set environment variables
vercel env add MONGODB_URI
vercel env add NEXTAUTH_SECRET
vercel env add SIPPY_API_USERNAME
# ... add all other required variables
```

### 5. Verify Deployment
1. Check that the application loads at your Vercel URL
2. Verify admin access to `/admin/sms/billing`
3. Test the cron endpoints manually
4. Check Vercel function logs for any errors

## 4. API Endpoints

### Billing Management
- `GET /api/admin/sms/billing` - List billing records
- `POST /api/admin/sms/billing` - Process billing manually
- `GET /api/admin/sms/billing-stats` - Get billing statistics

### Billing Settings
- `GET /api/admin/sms/billing-settings` - Get billing settings
- `POST /api/admin/sms/billing-settings` - Create billing settings
- `PUT /api/admin/sms/billing-settings` - Update billing settings
- `DELETE /api/admin/sms/billing-settings` - Delete billing settings

### Cron Processing
- `POST /api/cron/process-sms-billing` - Process SMS billing (automated)

## 5. Frontend Pages

### Admin Interface
- `/admin/sms/billing` - Main billing dashboard
- `/admin/sms/billing/settings` - Billing configuration
- `/admin/sms` - SMS management (with billing tab)

### Components
- `SmsBillingWidget` - Dashboard widget for billing overview
- Billing records table with pagination and filtering
- Settings forms for global and user-specific configurations

## 6. Monitoring and Maintenance

### Vercel Function Logs
Monitor your Vercel function logs for:
- Cron job execution status
- Billing processing errors  
- API call failures
- Database connection issues

### Key Metrics to Monitor
- Billing success rate
- Processing time
- Failed billing attempts
- Sippy API response times

### Regular Maintenance Tasks
1. **Weekly**: Review failed billing records
2. **Monthly**: Audit billing settings and user configurations
3. **Quarterly**: Review cron job performance and optimize if needed

## 7. Troubleshooting

### Common Issues

#### Cron Jobs Not Running
1. Check Vercel function logs
2. Verify `INTERNAL_API_KEY` is set correctly
3. Ensure cron endpoints are accessible
4. Check Vercel cron configuration

#### Billing Processing Failures
1. Verify Sippy API credentials
2. Check user `sippyAccountId` values
3. Review billing record details
4. Test Sippy API connectivity

#### Database Connection Issues
1. Verify `MONGODB_URI` is correct
2. Check MongoDB cluster health
3. Ensure IP whitelist includes Vercel IPs
4. Test database connectivity

### Debug Commands
```bash
# Test cron endpoint locally
curl -X POST "http://localhost:3000/api/cron/process-sms-billing?type=daily" \
  -H "Authorization: Bearer your-internal-api-key"

# Check billing stats
curl "http://localhost:3000/api/admin/sms/billing-stats" \
  -H "Authorization: Bearer your-admin-session"
```

## 8. Security Considerations

### API Security
- All admin endpoints require authentication
- Cron endpoints use internal API key
- Rate limiting on public endpoints
- Input validation on all forms

### Data Protection
- Sensitive data encrypted in database
- PII handling follows best practices
- Audit logs for all billing operations
- Secure API key storage

## 9. Performance Optimization

### Database Optimization
- Index on `userId`, `status`, `createdAt` fields
- Pagination for large result sets
- Aggregation queries for statistics
- Connection pooling

### Caching Strategy
- Cache billing statistics for 5 minutes
- Cache user settings for 1 hour
- Use SWR for frontend data fetching
- Redis cache for high-traffic scenarios

## 10. Backup and Recovery

### Data Backup
- MongoDB automated backups
- Export billing records regularly
- Configuration backups
- Code repository backups

### Recovery Procedures
1. Database restoration from backup
2. Billing record reconciliation
3. Settings restoration
4. Service restart procedures

## Support and Maintenance

For issues or questions:
1. Check Vercel function logs
2. Review this deployment guide
3. Test with smaller data sets first
4. Monitor billing success rates

---

## Quick Start Checklist

- [ ] Set all required environment variables
- [ ] Deploy to Vercel
- [ ] Verify database connection
- [ ] Test admin interface access
- [ ] Confirm cron jobs are scheduled
- [ ] Process a test billing cycle
- [ ] Monitor for 24-48 hours
- [ ] Set up alerts for failures

---

*Last updated: [Current Date]*
*Version: 1.0* 