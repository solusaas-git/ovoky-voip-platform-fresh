# SMS Provider Model Fix

## Issue
The SMS history page was experiencing a `MissingSchemaError: Schema hasn't been registered for model "SmsProvider"` error when trying to load SMS history data.

## Root Cause
The issue was caused by inconsistent model naming and imports:

1. **Model Registration**: The actual SMS provider model is defined in `SmsGateway.ts` but is registered in MongoDB with the name `'SmsProvider'`
2. **Collection Name**: The MongoDB collection is named `'smsproviders'` 
3. **Import Confusion**: The SMS history API was trying to import a non-existent `SmsProvider.ts` model file
4. **Model Export**: In `models/index.ts`, the `SmsGateway` model is exported as `SmsProvider`

## Solution Implemented

### 1. Fixed SMS History API (`ovo/src/app/api/sms/history/route.ts`)
- **Proper Import**: Changed from importing non-existent `SmsProvider` to importing the actual `SmsGateway` model
- **Direct Model Usage**: Used `SmsGateway.find()` directly instead of trying to populate relations
- **Enhanced Data Structure**: Added proper provider and campaign information fetching
- **Response Format**: Transformed the response to match the expected format by the frontend component

### 2. Removed Temporary Files
- Deleted the temporary `ovo/src/models/SmsProvider.ts` file that was created as a workaround

### 3. Consistent Model Usage
The proper pattern for using SMS providers throughout the application:

```typescript
// Correct import
import SmsGateway from '@/models/SmsGateway';

// The model is registered as 'SmsProvider' in MongoDB
const providers = await SmsGateway.find({ isActive: true });
```

## Key Technical Details

### Model Registration
```typescript
// In SmsGateway.ts
const SmsGateway = mongoose.models.SmsProvider || mongoose.model<ISmsGateway>('SmsProvider', smsGatewaySchema);
```

### Collection Configuration
```typescript
// Schema configuration
{
  timestamps: true,
  collection: 'smsproviders'  // MongoDB collection name
}
```

### Model Export Pattern
```typescript
// In models/index.ts
import SmsProvider from './SmsGateway';  // Import SmsGateway
export { SmsProvider };                  // Export as SmsProvider
```

## API Response Structure
The SMS history API now returns data in the correct format expected by the frontend:

```typescript
{
  messages: [
    {
      _id: string,
      to: string,
      from: string,
      message: string,           // Mapped from 'content' field
      status: string,
      cost: number,
      providerId: string,
      providerName: string,      // From provider.displayName || provider.name
      messageType: string,
      campaignId?: string,
      campaignName?: string,     // Populated from campaign data
      createdAt: string,
      updatedAt: string
    }
  ],
  total: number,
  page: number,
  limit: number,
  totalPages: number
}
```

## Files Modified
1. `ovo/src/app/api/sms/history/route.ts` - Fixed provider model import and data fetching
2. `ovo/src/models/SmsProvider.ts` - Removed (was temporary workaround)

## Testing
- ✅ SMS history page loads without schema registration errors
- ✅ Provider information displays correctly in SMS history
- ✅ Campaign names are properly populated for campaign messages
- ✅ Pagination and filtering work correctly
- ✅ No MongoDB model registration conflicts

## Future Considerations
- All SMS provider references should use `SmsGateway` model import
- The model is registered as `'SmsProvider'` in MongoDB for historical reasons
- Collection name remains `'smsproviders'` for consistency
- Frontend components expect `providerName` field, not nested provider objects 