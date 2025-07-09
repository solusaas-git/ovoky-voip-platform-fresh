# Email Templates

This directory contains all centralized email templates for the Sippy Dashboard application. All templates are organized by category and use a consistent structure for easy maintenance.

## 📁 Directory Structure

```
src/lib/emailTemplates/
├── index.ts                    # Central exports for all templates
├── emailVerification.ts        # Email verification (OTP) templates
├── accountActivation.ts        # Account activation templates
├── balanceNotifications.ts     # Balance alert templates
├── kpiAlerts.ts                # KPI monitoring alert templates
└── README.md                   # This documentation
```

## 🎯 Template Categories

### Authentication Templates
- **Email Verification**: OTP-based email verification for user registration
- **Location**: `emailVerification.ts`

### Account Management Templates
- **Account Activation**: Welcome email when Sippy account is activated
- **Location**: `accountActivation.ts`

### Notification Templates
- **Balance Notifications**: Low/zero/negative balance alerts
- **Location**: `balanceNotifications.ts`

### Alert Templates
- **KPI Alerts**: High cost, low ASR, extreme usage alerts
- **Location**: `kpiAlerts.ts`

## 🚀 Usage

### Import Templates

```typescript
// Import specific templates
import { 
  generateEmailVerificationTemplate,
  generateAccountActivationTemplate,
  generateBalanceNotificationTemplate 
} from '@/lib/emailTemplates';

// Import all templates
import * as EmailTemplates from '@/lib/emailTemplates';
```

### Generate Email Content

All templates return a consistent structure:

```typescript
interface EmailTemplate {
  subject: string;
  html: string;    // Rich HTML with inlined CSS
  text: string;    // Plain text version
}
```

#### Email Verification Example

```typescript
const emailContent = generateEmailVerificationTemplate({
  name: 'John Doe',
  otpCode: '123456'
});

// Returns: { subject, html, text }
```

#### Account Activation Example

```typescript
const emailContent = generateAccountActivationTemplate({
  name: 'John Doe',
  sippyAccountId: 12345,
  branding: {
    companyName: 'Sippy Communications',
    companySlogan: 'Your trusted VoIP partner',
    primaryColor: '#667eea',
    fontFamily: 'Arial, sans-serif'
  }
});
```

#### Balance Notification Example

```typescript
const emailContent = generateBalanceNotificationTemplate({
  account: {
    name: 'John Doe',
    email: 'john@example.com',
    sippyAccountId: 12345,
    balance: 5.50,
    currency: 'EUR'
  },
  threshold: 10.00,
  notificationType: 'low_balance', // 'low_balance' | 'zero_balance' | 'negative_balance'
  branding: {
    companyName: 'Sippy Communications',
    primaryColor: '#667eea',
    fontFamily: 'Arial, sans-serif'
  }
});
```

## 🎨 Template Features

### Professional Design
- Modern, responsive HTML layouts
- Mobile-optimized with CSS media queries
- Professional color schemes and typography

### CSS Inlining
- Uses `juice` library for email client compatibility
- Preserves media queries for responsive design
- Inline styles for maximum compatibility

### Branding Integration
- Dynamic company colors and styling
- Customizable company name and slogan
- Consistent brand experience across all emails

### Accessibility
- Plain text versions for all templates
- Proper semantic HTML structure
- High contrast and readable fonts

### Internationalization Ready
- Template structure supports easy translation
- Consistent formatting for different locales
- Currency and date formatting support

## 🔧 Maintenance

### Adding New Templates

1. Create a new template file in this directory
2. Follow the existing pattern with TypeScript interfaces
3. Export the template function and interface
4. Add exports to `index.ts`
5. Update this README

### Modifying Existing Templates

1. Edit the template file directly
2. Test with the existing services that use the template
3. Ensure backward compatibility with the interface
4. Update documentation if needed

### Template Structure

All templates should follow this pattern:

```typescript
import juice from 'juice';

export interface TemplateData {
  // Define required data structure
}

export function generateTemplateFunction(data: TemplateData): { subject: string; html: string; text: string } {
  const { /* destructure data */ } = data;
  
  const subject = 'Email Subject';
  
  const rawHtml = `
    <!-- HTML template with ${data} interpolation -->
  `;
  
  // Inline CSS with juice
  const html = juice(rawHtml, {
    removeStyleTags: false,
    applyStyleTags: true,
    preserveMediaQueries: true,
    webResources: {
      relativeTo: process.cwd()
    }
  });
  
  // Generate plain text version
  const text = `
    Plain text version of the email
  `;
  
  return { subject, html, text };
}
```

## 📧 Email Services Integration

The following services use these centralized templates:

- **EmailVerificationService**: Uses `generateEmailVerificationTemplate`
- **AccountActivationService**: Uses `generateAccountActivationTemplate`
- **NotificationService**: Uses `generateBalanceNotificationTemplate`
- **KPI Alert Service**: Uses KPI alert templates

## 🧪 Testing

Test templates using the test script:

```bash
node test-email-templates.js
```

This script validates that all templates generate properly and return the expected structure.

## 🔄 Migration Notes

This centralized structure replaces the previous scattered template approach:

- ✅ **Before**: Templates embedded in service files
- ✅ **After**: Centralized templates in dedicated directory
- ✅ **Benefits**: Better maintainability, consistency, reusability
- ✅ **Backward Compatibility**: All existing services updated to use new structure 