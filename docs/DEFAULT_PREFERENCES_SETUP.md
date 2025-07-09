# Default Preferences Setup Documentation

## Overview

The OVO application now automatically sets up default dashboard and notification preferences for all new users. This ensures a consistent, optimized experience from the moment users first log in.

## Default Dashboard Configuration

### Widget Layout
Based on the optimal configuration provided, new users get:

- **Date Selector**: Full-width header (row 0, col 0)
- **Welcome Widget**: Medium size (row 1, col 0-5) 
- **Balance Widget**: Medium size (row 1, col 6-11) - Always visible
- **Metrics Indicators**: 4 small widgets in bottom row (row 6)
  - Indicator 1: Cost of Day (col 0-3)
  - Indicator 2: ASR Success Rate (col 3) - spans 12 cols
  - Indicator 3: ACD Avg Call Duration (col 6-9)
  - Indicator 4: Total Minutes (col 9-11)

### Settings
- **Layout**: Grid (12 columns)
- **Theme**: Auto (follows system preference)
- **Compact Mode**: Disabled
- **Auto Save**: Enabled
- **Show Categories**: Disabled
- **Category Order**: ['overview', 'admin', 'metrics']

### Role-Based Widgets
- **Regular Users**: Get core widgets (overview + metrics)
- **Admin Users**: Get all widgets including admin-specific widgets:
  - User Attention widget
  - Low Balance Users widget

## Automatic Initialization

### When Preferences Are Created
Default preferences are automatically initialized:

1. **User Registration** (`/api/auth/register`)
   - When new users sign up via the registration form
   - Preferences created immediately after user account creation

2. **Admin User Creation** (`/api/users`)
   - When admins create new users through the admin interface
   - Role-appropriate widgets are assigned

3. **User Activation** (`/api/users/[id]/activate`)
   - When admins activate pending user accounts
   - Ensures preferences exist before users first log in

### Fallback Mechanism
- Dashboard preferences API (`/api/dashboard/preferences`) includes upsert logic
- If preferences don't exist when first accessed, they're created automatically

## File Structure

```
ovo/
├── src/lib/
│   ├── defaultDashboardPreferences.ts  # Default configurations
│   └── userSetup.ts                   # Initialization utilities
├── src/app/api/
│   ├── admin/user-defaults/           # Admin management endpoints
│   ├── auth/register/                 # User registration with auto-init
│   ├── dashboard/preferences/         # Dashboard prefs with fallback
│   └── users/                        # Admin user creation with auto-init
└── docs/
    └── DEFAULT_PREFERENCES_SETUP.md  # This documentation
```

## API Reference

### Admin Management API

#### GET `/api/admin/user-defaults?userId=<id>`
Check preference status for a user.

**Response:**
```json
{
  "userId": "user123",
  "status": {
    "hasDashboardPreferences": true,
    "hasNotificationPreferences": true,
    "needsInitialization": false
  },
  "message": "User preferences are set up"
}
```

#### POST `/api/admin/user-defaults`
Initialize, reset, or bulk-manage user preferences.

**Actions:**

1. **Initialize Single User:**
```json
{
  "action": "initialize",
  "userId": "user123",
  "userRole": "user"
}
```

2. **Reset User Preferences:**
```json
{
  "action": "reset",
  "userId": "user123",
  "userRole": "admin",
  "resetOptions": {
    "resetDashboard": true,
    "resetNotifications": true
  }
}
```

3. **Bulk Initialize:**
```json
{
  "action": "bulk-initialize",
  "users": [
    { "userId": "user1", "role": "user" },
    { "userId": "user2", "role": "admin" }
  ]
}
```

### Utility Functions

#### `initializeUserDefaults(userId, userRole)`
Creates default dashboard and notification preferences for a user.

#### `resetUserPreferences(userId, userRole, options)`
Resets user preferences to defaults with selective options.

#### `checkUserPreferences(userId)`
Checks if a user has preferences set up.

#### `createDefaultDashboardPreferences(userId, userRole)`
Creates the default dashboard configuration object.

## Customization

### Modifying Default Configuration

To change the default layout, edit `src/lib/defaultDashboardPreferences.ts`:

```typescript
export const DEFAULT_DASHBOARD_WIDGETS: WidgetConfig[] = [
  {
    id: 'welcome',
    enabled: true,
    order: 0,
    size: 'medium',
    gridCols: 6,
    gridRows: 1,
    position: { row: 1, col: 0 },
    category: 'overview',
    // ... other properties
  },
  // ... more widgets
];
```

### Adding New Widgets

1. Add widget configuration to `DEFAULT_DASHBOARD_WIDGETS` or `ADMIN_WIDGETS`
2. Set appropriate `order`, `position`, and `category`
3. Update `getWidgetsForRole()` if role-specific logic is needed

### Role-Based Customization

The system supports different default configurations based on user roles:

```typescript
export function getWidgetsForRole(userRole: 'admin' | 'user'): WidgetConfig[] {
  let widgets = [...DEFAULT_DASHBOARD_WIDGETS];
  
  if (userRole === 'admin') {
    widgets = [...widgets, ...ADMIN_WIDGETS];
  }
  
  return widgets.sort((a, b) => a.order - b.order);
}
```

## Migration for Existing Users

### Bulk Initialize Existing Users

Use the bulk initialization API to set up preferences for existing users:

```bash
curl -X POST /api/admin/user-defaults \
  -H "Content-Type: application/json" \
  -d '{
    "action": "bulk-initialize",
    "users": [
      { "userId": "existing-user-1", "role": "user" },
      { "userId": "existing-user-2", "role": "admin" }
    ]
  }'
```

### Check Who Needs Migration

```bash
curl /api/admin/user-defaults?userId=existing-user-id
```

## Troubleshooting

### Common Issues

1. **Preferences Not Created**
   - Check user authentication in API calls
   - Verify MongoDB connection
   - Check console logs for initialization errors

2. **Wrong Widget Layout**
   - Verify user role is passed correctly
   - Check `getWidgetsForRole()` logic
   - Confirm widget position calculations

3. **Missing Admin Widgets**
   - Ensure user role is 'admin'
   - Check `ADMIN_WIDGETS` configuration
   - Verify role-based filtering logic

### Debugging

Enable debug logging by checking console output:
- ✅ Success messages show successful initialization
- ❌ Error messages indicate what failed
- User email and role are logged for traceability

## Best Practices

1. **Always Initialize on User Creation**
   - Don't rely solely on fallback mechanisms
   - Initialize preferences immediately after user creation

2. **Role-Aware Defaults**
   - Use appropriate widget sets based on user roles
   - Consider different default layouts for different user types

3. **Error Handling**
   - Never fail user creation due to preference initialization errors
   - Log errors for monitoring and debugging
   - Implement fallback mechanisms

4. **Performance**
   - Use upsert operations to avoid duplicate creation
   - Initialize preferences asynchronously when possible
   - Monitor MongoDB performance for bulk operations

## Security Considerations

- Admin endpoints require authentication and admin role verification
- User preferences are isolated by userId
- No sensitive data is stored in default configurations
- Preferences initialization respects role-based access controls 