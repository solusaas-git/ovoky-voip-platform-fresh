# Translation System Guide

## 📁 File Structure

The translation system now uses a **split file approach** for better organization and maintainability:

```
src/i18n/messages/
├── en/                     # English translations
│   ├── auth.json          # Authentication & login flows
│   ├── onboarding.json    # User onboarding process
│   └── common.json        # Shared UI elements
└── fr/                     # French translations
    ├── auth.json          # Authentification & connexion
    ├── onboarding.json    # Processus d'accueil
    └── common.json        # Éléments d'interface partagés
```

## 🎯 Current Translation Coverage

### ✅ **Completed (Production Ready)**

#### 🔐 **Authentication (`auth.json`)**
- **Login page**: Sign in form, validation, errors
- **Register page**: Account creation, terms acceptance
- **Password reset**: Forgot password flow, email verification
- **Email verification**: Account verification process
- **Two-factor auth**: 2FA codes, backup options
- **Logout**: Sign out confirmation
- **Comprehensive error handling**: 20+ error scenarios
- **Form validation**: Real-time validation messages

#### 👋 **Onboarding (`onboarding.json`)**
- **Welcome flow**: Multi-step setup process
- **Personal info**: Name, contact, timezone
- **Company details**: Business information, VAT, industry
- **Preferences**: Notification settings, communication preferences
- **Verification**: Review and confirmation step
- **Completion**: Welcome message, next steps
- **Progress tracking**: Step indicators, navigation
- **Validation**: Field-specific error messages
- **Tooltips**: Helpful hints and explanations

#### 🎨 **Common UI (`common.json`)**
- **Actions**: 40+ button/action labels (save, cancel, edit, etc.)
- **Status indicators**: Loading, success, error states
- **Data labels**: Form fields, table headers
- **Time expressions**: Relative time, dates
- **Response options**: Yes/no, always/never, etc.
- **Error messages**: Generic error handling
- **Placeholders**: Input field hints
- **Navigation**: Menu items, breadcrumbs

### 🔄 **Maintained (Backwards Compatible)**
- **Navigation**: All menu items translated
- **Dashboard**: Basic welcome message, layout
- **Settings**: Language configuration UI
- **Users**: User management interface
- **Payments**: Payment system basics

## 🛠️ Usage Examples

### In Components
```jsx
import { useTranslations } from '@/lib/i18n';

function LoginPage() {
  const { t } = useTranslations();
  
  return (
    <form>
      <h1>{t('auth.login.title')}</h1>
      <p>{t('auth.login.description')}</p>
      
      <input 
        placeholder={t('auth.login.emailPlaceholder')}
        type="email"
      />
      
      <button>{t('auth.login.submitButton')}</button>
      
      <p>{t('auth.login.noAccount')} 
         <a href="/register">{t('auth.login.createAccount')}</a>
      </p>
    </form>
  );
}
```

### Parameter Substitution
```jsx
// Welcome message with user name
{t('dashboard.welcome', { name: user.name })}

// Progress indicator  
{t('onboarding.progress.step', { current: 2, total: 5 })}

// Item count
{t('common.messages.confirmDeleteMultiple', { count: selectedItems.length })}
```

### Error Handling
```jsx
// Form validation
const validateEmail = (email) => {
  if (!email) return t('auth.validation.emailRequired');
  if (!isValidEmail(email)) return t('auth.validation.emailInvalid');
  return null;
};

// API error handling
catch (error) {
  if (error.code === 'INVALID_CREDENTIALS') {
    setError(t('auth.errors.invalidCredentials'));
  } else {
    setError(t('auth.errors.serverError'));
  }
}
```

## 📋 Translation Key Conventions

### Hierarchical Structure
```json
{
  "section": {
    "subsection": {
      "element": "Translation"
    }
  }
}
```

### Real Examples
```json
{
  "auth": {
    "login": {
      "title": "Sign In",
      "emailLabel": "Email Address",
      "submitButton": "Sign In"
    },
    "errors": {
      "invalidCredentials": "Invalid email or password",
      "networkError": "Network error. Please try again"
    }
  }
}
```

### Key Naming Rules
1. **Use descriptive names**: `emailLabel` not `el`
2. **Group related items**: All login elements under `auth.login`
3. **Consistent suffixes**:
   - `Label` for form labels
   - `Placeholder` for input hints
   - `Button` for button text
   - `Title` for page/section titles
   - `Description` for explanatory text
   - `Error` for error messages

## 🆕 Adding New Translations

### 1. Choose the Right File
- **`auth.json`**: Login, register, passwords, verification
- **`onboarding.json`**: User setup, account configuration
- **`common.json`**: Shared buttons, labels, generic messages
- **Create new file**: For major features (calls, tickets, etc.)

### 2. Add to Both Languages
```bash
# Edit English
src/i18n/messages/en/[file].json

# Edit French  
src/i18n/messages/fr/[file].json
```

### 3. Update the Loader
If adding a new file, update `src/lib/i18n.ts`:

```typescript
const loadMessages = async () => {
  const [
    // Add your new module here
    enNewFeature,
    frNewFeature
  ] = await Promise.all([
    import('../i18n/messages/en/newFeature.json'),
    import('../i18n/messages/fr/newFeature.json')
  ]);
  
  messages.en = {
    // Add to the merge
    newFeature: enNewFeature.default
  };
}
```

## 🎨 Translation Quality Guidelines

### English (Source Language)
- **Clear and concise**: Avoid jargon
- **Consistent tone**: Professional but friendly
- **Action-oriented**: Use active voice for buttons
- **User-focused**: "Your account" not "The account"

### French (Target Language)
- **Natural French**: Not word-for-word translation
- **Formal address**: Use "vous" form consistently
- **Gender neutral**: Use inclusive language where possible
- **Cultural adaptation**: Adapt concepts, not just words

### Examples of Good Translations

| English | French | Why Good |
|---------|--------|----------|
| "Welcome back!" | "Bon retour !" | Natural French expression |
| "Sign In" | "Se connecter" | Standard French UI term |
| "Your account" | "Votre compte" | Maintains formal tone |
| "Please try again" | "Veuillez réessayer" | Polite imperative |

## 🔧 Developer Tools

### Debug Mode
Add to any component:
```jsx
const { locale, isLoading } = useTranslations();
console.log('Current locale:', locale, 'Loading:', isLoading);
```

### Missing Translation Detection
The system automatically:
- Falls back to English if French translation missing
- Returns the key name if no translation exists
- Logs missing keys to console in development

### Testing Translations
```jsx
// Test parameter substitution
t('auth.login.welcomeBack', { name: 'Test User' });

// Test pluralization (if implemented)
t('common.messages.itemCount', { count: 5 });

// Test error handling
t('nonexistent.key'); // Returns 'nonexistent.key'
```

## 📈 Next Steps

### Phase 1: Core Features (Ready for Implementation)
- **Calls management**: Call history, active calls interface
- **Support tickets**: Ticket creation, management, responses
- **Phone numbers**: Number purchase, management, configuration

### Phase 2: Advanced Features
- **Billing system**: Invoices, payment history, subscriptions
- **Reporting**: Analytics, usage reports, dashboards
- **Admin tools**: System configuration, user management

### Phase 3: Enhancement
- **Email templates**: Transactional email translations
- **Help documentation**: In-app help content
- **Mobile responsive**: Touch-specific language

## 🚀 Implementation Checklist

When adding translations for a new feature:

- [ ] **Plan the key structure** (section.subsection.element)
- [ ] **Create English translations** (source of truth)
- [ ] **Add French translations** (professional quality)
- [ ] **Update the loader** (if new file created)
- [ ] **Test both languages** (UI should work in both)
- [ ] **Check parameter substitution** (dynamic content)
- [ ] **Verify error states** (error messages translated)
- [ ] **Review mobile layout** (text length differences)
- [ ] **Update this guide** (document new patterns)

## 🎯 Performance Notes

- **Lazy loading**: Translation files load asynchronously
- **Memory efficient**: Only active language files loaded
- **Fast switching**: Language changes are instant
- **Build optimization**: Next.js optimizes JSON imports
- **Cache friendly**: Browser caches translation files

## 🔍 Troubleshooting

### Common Issues

1. **Translation not showing**
   - Check file exists: `src/i18n/messages/[lang]/[file].json`
   - Verify import in `loadMessages()`
   - Check key path: `section.subsection.key`

2. **Parameter not substituting**
   - Verify parameter name matches: `{name}` → `{ name: 'value' }`
   - Check for typos in parameter keys

3. **Build errors**
   - Validate JSON syntax with a linter
   - Ensure all imported files exist
   - Check for circular dependencies

4. **Language not persisting**
   - Verify API endpoints are working
   - Check localStorage permissions
   - Test database connection

This comprehensive translation system provides a solid foundation for expanding your multi-language support as the application grows! 

## 🚀 Next Phase: Calls & Tickets

Now that the auth and onboarding flows are complete, the next logical step is to translate the **calls management** and **support tickets** features, as these are core VoIP functionalities.

### Ready for Implementation:
1. **Calls interface** - Active calls, call history, call controls
2. **Support tickets** - Ticket creation, responses, status management  
3. **Phone numbers** - Purchase, configuration, assignment
4. **User verification modal** - Account verification processes

The split file system makes it easy to add these new translation modules while maintaining clean organization and fast loading times. 