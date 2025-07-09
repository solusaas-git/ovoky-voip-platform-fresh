# SMS Campaign Settings Enforcement & Real-Time Updates

## Overview
This document outlines the enhanced SMS campaign system that strictly enforces campaign settings and provides real-time progress updates.

## Campaign Settings Enforcement

### 1. **Strict Provider Selection**
- **Issue Fixed**: Campaigns now use ONLY the selected provider, no round-robin selection
- **Implementation**: `SmsQueueService.queueContactBatch()` validates provider assignment
- **Validation**: Ensures provider is assigned to user and supports campaign country

### 2. **Country Prefix Validation**
- **Issue Fixed**: Messages are now validated against campaign's selected country
- **Implementation**: `validateCountryPrefix()` method checks phone number prefixes
- **Behavior**: Invalid prefixes are immediately failed with clear error messages
- **Error Message**: "Country not supported by campaign. Campaign restricted to {country} (prefix: {prefix})"

### 3. **Sender ID Enforcement**
- **Issue Fixed**: All messages use the campaign's designated sender ID
- **Implementation**: Sender ID is strictly enforced in message creation
- **No Fallbacks**: No automatic sender ID substitution

### 4. **Template Message Consistency**
- **Issue Fixed**: All messages use the exact campaign template message
- **Implementation**: Message content is locked to campaign template
- **No Modifications**: Template content cannot be altered during sending

### 5. **Contact List Restriction**
- **Issue Fixed**: Only contacts from the selected contact list are processed
- **Implementation**: Contacts are filtered by `contactListId`
- **Validation**: Contact list existence is verified before processing

## Real-Time Progress Updates

### 1. **Progress Tracking**
- **Real-Time Updates**: Progress updates every time a message is processed
- **Granular Tracking**: Tracks sent, failed, delivered, and blocked messages
- **Immediate Feedback**: Failed validations are immediately reflected in statistics

### 2. **API Endpoints**

#### Progress Polling
```
GET /api/sms/campaigns/{id}/progress
```
Returns current campaign progress and statistics.

#### Server-Sent Events (SSE)
```
GET /api/sms/campaigns/{id}/progress
Accept: text/event-stream
```
Provides real-time streaming updates every 2 seconds.

### 3. **Frontend Integration**
- **Automatic Polling**: Active campaigns are polled every 3 seconds
- **Visual Updates**: Progress bars update in real-time
- **Status Changes**: Campaign status changes are immediately reflected

## Delivery Report Handling

### 1. **Webhook Endpoint**
```
POST /api/sms/webhook/delivery
```
Handles delivery reports from multiple providers:
- Twilio
- AWS SNS
- MessageBird
- Custom providers

### 2. **Provider Support**
- **Multi-Provider**: Supports different webhook formats
- **Status Mapping**: Maps provider statuses to internal statuses
- **Error Handling**: Captures provider error codes and messages

### 3. **Real-Time Statistics**
- **Immediate Updates**: Delivery confirmations update campaign statistics instantly
- **Progress Recalculation**: Progress percentages are recalculated on delivery updates

## Campaign Validation Rules

### 1. **Pre-Processing Validation**
```typescript
// Provider validation
if (!provider.supportedCountries.includes(campaign.country)) {
  throw new Error(`Provider does not support country: ${campaign.country}`);
}

// Rate deck validation
const matchedRate = await SmsRate.findOne({
  rateDeckId: rateDeckAssignment.rateDeckId,
  country: campaign.country // Only campaign country allowed
});
```

### 2. **Contact Validation**
```typescript
// Country prefix validation
const isValidPrefix = this.validateCountryPrefix(
  contact.phoneNumber, 
  campaign.country, 
  matchedRate.prefix
);

if (!isValidPrefix) {
  // Immediately fail message with clear error
  status: 'failed',
  errorMessage: `Country not supported by campaign. Campaign restricted to ${campaign.country}`
}
```

### 3. **Blacklist Validation**
- **User-Specific**: Checks user's blacklisted numbers
- **Immediate Blocking**: Blacklisted numbers are blocked before queueing
- **Clear Messaging**: "Phone number is blacklisted" error message

## Error Handling & Reporting

### 1. **Validation Failures**
- **Immediate Logging**: All validation failures are logged with context
- **Statistics Update**: Failed validations immediately update campaign counters
- **Clear Errors**: Descriptive error messages for troubleshooting

### 2. **Provider Failures**
- **Retry Logic**: Failed messages are retried up to 3 times
- **Exponential Backoff**: Retry delays increase with each attempt
- **Final Failure**: Messages exceeding retry limit are marked as failed

### 3. **Progress Consistency**
- **Real-Time Calculation**: Progress = (sentCount + failedCount) / contactCount * 100
- **Immediate Updates**: Progress updates after each message processing
- **Completion Detection**: Campaigns auto-complete when 100% processed

## Configuration Examples

### 1. **Campaign Creation with Strict Settings**
```json
{
  "name": "Black Friday Campaign",
  "contactListId": "60f1b2c3d4e5f6789abc1234",
  "templateId": "60f1b2c3d4e5f6789abc5678",
  "senderId": "BLACKFRI",
  "providerId": "60f1b2c3d4e5f6789abc9012",
  "country": "US"
}
```

### 2. **Webhook Configuration**
```json
{
  "webhookUrl": "https://your-domain.com/api/sms/webhook/delivery",
  "enableDeliveryReports": true,
  "signatureVerification": true
}
```

### 3. **Real-Time Progress Response**
```json
{
  "campaignId": "60f1b2c3d4e5f6789abc1234",
  "name": "Black Friday Campaign",
  "status": "sending",
  "progress": {
    "percentage": 45,
    "contactCount": 1000,
    "sentCount": 420,
    "failedCount": 30,
    "deliveredCount": 380,
    "remainingCount": 550
  },
  "costs": {
    "actualCost": 21.50
  },
  "timestamps": {
    "startedAt": "2024-01-15T10:00:00Z",
    "completedAt": null
  },
  "lastUpdated": "2024-01-15T10:15:30Z"
}
```

## Benefits

### 1. **Campaign Integrity**
- **Predictable Behavior**: Campaigns behave exactly as configured
- **No Surprises**: No unexpected provider switching or country changes
- **Compliance**: Ensures regulatory compliance for specific countries

### 2. **Real-Time Visibility**
- **Live Monitoring**: See campaign progress in real-time
- **Immediate Feedback**: Know instantly when issues occur
- **Better UX**: Responsive interface with live updates

### 3. **Accurate Reporting**
- **Precise Statistics**: All counters are immediately accurate
- **Delivery Tracking**: Real delivery confirmations from providers
- **Error Visibility**: Clear error messages for troubleshooting

### 4. **Operational Efficiency**
- **Faster Debugging**: Immediate error feedback
- **Better Planning**: Accurate progress estimates
- **Reduced Support**: Self-service error resolution

## Migration Notes

### 1. **Existing Campaigns**
- **Backward Compatible**: Existing campaigns continue to work
- **Enhanced Validation**: New validation rules apply to new campaigns
- **Gradual Migration**: Existing campaigns can be updated to use new features

### 2. **Provider Configuration**
- **Webhook Setup**: Configure delivery report webhooks for real providers
- **Country Support**: Ensure provider `supportedCountries` are configured
- **Rate Limits**: Verify provider rate limits are properly set

### 3. **Frontend Updates**
- **Automatic**: Real-time updates work automatically
- **Fallback**: Graceful degradation if real-time updates fail
- **Performance**: Efficient polling only for active campaigns

## Monitoring & Troubleshooting

### 1. **Logs to Monitor**
```
📤 Queued X valid messages, Y invalid/blocked for campaign {name}
❌ Invalid prefix for campaign country {country}: {phoneNumber}
📱 Message {id} delivery status updated: {oldStatus} → {newStatus}
📡 Real-time update for campaign {id}: {data}
```

### 2. **Common Issues**
- **Invalid Prefixes**: Check campaign country vs contact phone numbers
- **Provider Errors**: Verify provider configuration and supported countries
- **Webhook Failures**: Check webhook endpoint and signature verification

### 3. **Performance Metrics**
- **Processing Speed**: Messages processed per second
- **Validation Success Rate**: Percentage of contacts passing validation
- **Delivery Rate**: Percentage of sent messages delivered
- **Real-Time Update Latency**: Time between processing and UI update 