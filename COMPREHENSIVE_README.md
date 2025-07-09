# Sippy Communications Management Platform - Comprehensive Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Core Modules](#core-modules)
4. [Database Models](#database-models)
5. [API Structure](#api-structure)
6. [Frontend Components](#frontend-components)
7. [Authentication & Security](#authentication--security)
8. [Branding & Theming System](#branding--theming-system)
9. [Payment Processing](#payment-processing)
10. [Notification System](#notification-system)
11. [Dashboard & Analytics](#dashboard--analytics)
12. [CDR Management](#cdr-management)
13. [Rate Management](#rate-management)
14. [Phone Number Management](#phone-number-management)
15. [User Management](#user-management)
16. [Tickets Management System](#tickets-management-system)
17. [Admin Features](#admin-features)
18. [Configuration & Settings](#configuration--settings)
19. [Development & Deployment](#development--deployment)

## Project Overview

**Sippy Communications Management Platform** is a modern, full-stack web application built for managing Sippy softswitch operations. It provides a comprehensive dashboard for call management, billing, user administration, and system monitoring.

### Key Features
- **Real-time Call Monitoring**: Live active calls with disconnect capabilities
- **CDR Analytics**: Comprehensive call detail record analysis with KPI widgets
- **Payment Processing**: Multi-gateway payment system with Stripe, PayPal, Square, Razorpay
- **Rate Management**: Dynamic rate deck management for calls and SMS
- **User Management**: Multi-role user system with admin capabilities
- **Advanced Tickets Management**: Comprehensive ticket system with service-specific forms, canned responses, admin tools, and complete deletion capabilities
- **Branding System**: Complete white-label customization
- **Notification System**: Automated email notifications and alerts
- **Dashboard Widgets**: Customizable, drag-and-drop dashboard interface
- **Dark/Light Mode**: Full theme support with custom branding

### Version Information
- **Current Version**: 0.1.0
- **Framework**: Next.js 15 with React 19
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Styling**: Tailwind CSS with shadcn/ui components

## Architecture & Technology Stack

### Frontend Stack
```json
{
  "framework": "Next.js 15",
  "react": "19.0.0",
  "typescript": "5.x",
  "styling": "Tailwind CSS 4.x",
  "ui_components": "shadcn/ui + Radix UI",
  "state_management": "React Context + SWR",
  "animations": "Framer Motion",
  "icons": "Lucide React",
  "forms": "React Hook Form + Zod",
  "notifications": "Sonner",
  "drag_drop": "@dnd-kit",
  "charts": "Custom implementations",
  "themes": "next-themes"
}
```

### Backend Stack
```json
{
  "runtime": "Node.js 20+",
  "api": "Next.js API Routes",
  "database": "MongoDB",
  "odm": "Mongoose",
  "authentication": "JWT + HTTP-only cookies",
  "password_hashing": "bcryptjs",
  "email": "Nodemailer",
  "payments": "Stripe SDK",
  "xml_parsing": "fast-xml-parser + xml2js",
  "scheduling": "node-cron",
  "validation": "Zod"
}
```

### External Integrations
- **Sippy Softswitch**: XML-RPC API integration for call management
- **Payment Gateways**: Stripe, PayPal, Square, Razorpay
- **Email Services**: SMTP with custom templates
- **File Storage**: Local storage with planned cloud integration

## Core Modules

### 1. Authentication Module (`/src/lib/AuthContext.tsx`)
- JWT-based authentication with HTTP-only cookies
- Role-based access control (Admin, Client)
- Email verification system
- Password reset functionality
- Session management with automatic refresh

### 2. Branding Module (`/src/lib/BrandingContext.tsx`)
- Dynamic theming system
- Company branding customization
- Logo and favicon management
- Color scheme management (light/dark modes)
- Custom CSS injection
- Email template branding

### 3. Payment Module (`/src/components/payments/`)
- Multi-gateway payment processing
- Stripe integration with webhooks
- Payment history and invoicing
- Balance top-up functionality
- Fee calculation and processing
- Payment failure handling

### 4. CDR Module (`/src/contexts/CdrContext.tsx`)
- Call Detail Record management
- Real-time data fetching
- KPI calculations (ASR, ACD, Cost of Day)
- Optimized data parsing for dashboard widgets
- Background data loading with progress tracking
- Account-specific performance optimization

### 5. Dashboard Module (`/src/components/dashboard/`)
- Customizable widget system
- Drag-and-drop interface
- Real-time KPI monitoring
- Responsive grid layout
- Widget settings and preferences
- Export functionality

### 6. Rate Management Module (`/src/components/rates/`)
- Dynamic rate deck management
- Number and SMS rate handling
- User assignment system
- CSV import/export
- Rate comparison tools
- Country-based rate grouping

### 7. Phone Number Management Module (`/src/lib/emailTemplates/phoneNumberNotifications.ts`)
- **Comprehensive Phone Number Notification System**:
  - **Backorder Request Management**: Approval/rejection notifications with bulk request support
    - Individual number status tracking (approved/rejected/pending)
    - Mixed result handling for bulk requests
    - Phone number details with pricing information
    - Request timeline and admin review notes
  - **Cancellation Request Processing**: Complete cancellation workflow notifications
    - Request approval/rejection with detailed reasoning
    - Administrative notes and review information
    - Account impact notifications
  - **Number Purchase Confirmations**: Single and bulk purchase notifications
    - Comprehensive purchase details with billing information
    - Complete number list display for bulk purchases
    - Pricing breakdown with setup fees and monthly rates
    - Purchase history and next billing cycle information
  - **Administrative Number Assignment**: Admin-initiated number assignments
    - Assignment notifications with administrative context
    - Billing start date and cycle information
    - Administrative notes and assignment reasoning
- **Enhanced Email Template System**:
  - **Professional Email Design**: Modern, responsive email templates with full email client compatibility
  - **Juice CSS Inlining**: Proper CSS inlining for maximum email client support
  - **Dynamic Branding Integration**: Complete branding system integration with custom colors and fonts
  - **Phone Number Prominence**: Enhanced phone number display with emoji icons and color coding
  - **Mobile Optimization**: Responsive design with mobile-friendly layouts and touch targets
  - **Status Color Coding**: Visual status indicators (green for approval, red for rejection, blue for assignment)
- **Bulk Operations Support**:
  - **Bulk Backorder Requests**: Multiple number requests with individual status tracking
  - **Bulk Purchase Management**: Complete purchase lists with detailed number information
  - **Mixed Result Handling**: Support for partial approvals and complex scenarios
  - **Scrollable Content Areas**: Email-compatible layouts for large number lists
  - **Individual Number Status**: Per-number status display with pricing for approved items
- **Advanced Content Features**:
  - **Rich Phone Number Details**: Country, type, capabilities, pricing, and setup fees
  - **Administrative Context**: Admin names, review dates, and internal notes
  - **Billing Integration**: Next billing dates, monthly rates, and total costs
  - **Template Variables**: Dynamic content insertion with fallback values
  - **Text Version Support**: Comprehensive plain text versions for all templates

### 8. User Management Module (`/src/components/users/`)
- User creation and management
- Role assignment
- Account verification
- **Enhanced Onboarding System with Full Dark Mode Support**
  - Multi-step onboarding form with responsive theming
  - Company information collection with address validation
  - Contact preference management
  - Service selection with country-specific targeting
  - Traffic volume and scale assessment
  - Progress tracking with visual indicators
  - Form validation and error handling
  - Seamless dark/light mode transitions
- User activity monitoring
- Bulk operations

### 9. Support Ticket Module (`/src/components/tickets/` and `/src/components/settings/SupportSettings.tsx`)
- **Comprehensive Ticket Management**:
  - Multi-service ticket creation (Outbound Calls, Inbound Calls, SMS, Number Services, Technical Support)
  - Service-specific form fields and validation
  - Country selection for location-based services
  - Outbound call examples with date/time tracking
  - Assigned numbers reference display
  - File attachment support with drag-and-drop
  - Real-time ticket status tracking with visual indicators
  - Customer satisfaction rating system with interactive feedback
- **Admin Support Tools**:
  - Predefined Issues management with service categorization
  - Canned Responses templates for efficient support
  - Priority-based issue classification (low, medium, high, urgent)
  - Keywords and search functionality
  - Usage tracking and analytics
  - Category-based organization
- **Enhanced User Experience**:
  - Integrated into main Settings page as dedicated tab
  - Modern UI with backdrop blur effects and responsive design
  - Search and filter capabilities
  - Full CRUD operations with proper error handling

### 10. Tickets Management System (`/src/components/tickets/`, `/src/components/admin/`)
- **Advanced Ticket Interface**:
  - **Customer Ticket Detail View**: Modern interface with animated loaders, service information cards, and conversation management
  - **Admin Ticket Detail View**: Comprehensive admin tools with assignment, status updates, priority management, and internal notes
  - **Canned Response Picker**: AI-like response picker with slide-up animations, position persistence, and real-time search
  - **Modern Loader Designs**: Professional loading states with gradient spinners and progress indicators
  - **Responsive Design**: Mobile-first approach with seamless dark/light mode transitions
- **Enhanced Functionality**:
  - **Service Information Display**: Detailed service data presentation with call examples and assigned numbers
  - **File Attachment Management**: Comprehensive file upload with preview and management capabilities
  - **Real-time Updates**: Live status changes and conversation updates
  - **Interactive Rating System**: Customer satisfaction with star ratings and comment collection
  - **Conversation Threading**: Organized message display with system messages and internal notes
- **Admin Management Tools**:
  - **Assignment System**: Ticket assignment to admin users with internal notes
  - **Status Management**: Complete status lifecycle with automated notifications
  - **Priority Control**: Priority-based escalation with visual indicators
  - **Internal Notes**: Admin-only communication system
  - **Bulk Operations**: Mass ticket operations and management

### 10. Notification Module (`/src/services/NotificationService.ts`)
- Automated email notifications
- Low balance alerts
- Payment confirmations
- System status notifications
- Template-based email system
- Notification logging and tracking
- **🆕 Phone Number Lifecycle Notifications**: Complete phone number management communication
  - **Backorder Processing**: Approval/rejection notifications with bulk support
  - **Purchase Confirmations**: Single and bulk purchase notifications with detailed breakdowns
  - **Cancellation Processing**: Request approval/rejection with administrative context
  - **Administrative Assignments**: Number assignments with billing and context information
  - **Resend Functionality**: Complete resend support with [RESEND] banners and enhanced templates
- **🆕 Enhanced Email Template Engine**: Professional email templates with advanced features
  - **Responsive Design**: Mobile-optimized layouts with email client compatibility
  - **Juice CSS Integration**: Proper CSS inlining for maximum deliverability
  - **Phone Number Prominence**: Enhanced phone number display with visual emphasis
  - **Status-based Styling**: Color-coded templates based on notification type and status
  - **Bulk Content Management**: Scrollable lists and organized display for multiple items

## Database Models

### User Model (`/src/models/User.ts`)
```typescript
interface IUser {
  email: string;
  name: string;
  password: string; // bcrypt hashed
  role: 'client' | 'admin';
  sippyAccountId?: number;
  isEmailVerified: boolean;
  emailVerifiedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  creationMethod: 'signup' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}
```

### Payment Model (`/src/models/Payment.ts`)
```typescript
interface IPayment {
  paymentIntentId: string;
  webhookEventId: string;
  sippyPaymentId?: number;
  userId: string;
  userEmail: string;
  sippyAccountId: number;
  topupAmount: number;
  processingFee: number;
  fixedFee: number;
  totalChargedAmount: number;
  currency: string;
  provider: 'stripe' | 'paypal' | 'square' | 'razorpay';
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  // ... additional fields
}
```

### BrandingSettings Model (`/src/models/BrandingSettings.ts`)
```typescript
interface IBrandingSettings {
  companyName: string;
  companySlogan?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  // Dark mode colors
  darkPrimaryColor?: string;
  darkSecondaryColor?: string;
  // ... additional branding fields
}
```

### Ticket Model (`/src/models/Ticket.ts`)
```typescript
interface ITicket {
  ticketNumber: string; // Auto-generated unique identifier
  userId: string;
  userEmail: string;
  user?: {
    _id: string;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    phone?: string;
  };
  service: 'outbound_calls' | 'inbound_calls' | 'sms' | 'number_services' | 'technical_support';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_admin' | 'waiting_user' | 'resolved' | 'closed';
  country?: string;
  outboundCallData?: {
    examples: Array<{
      number: string;
      callDate: Date;
      description?: string;
    }>;
  };
  assignedNumbers?: Array<{
    number: string;
    description: string;
    type?: string;
  }>;
  attachments?: Array<{
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url?: string;
  }>;
  replies: Array<{
    content: string;
    author?: {
      _id: string;
      email: string;
      name?: string;
      firstName?: string;
      lastName?: string;
    };
    authorType: 'customer' | 'admin';
    isInternal: boolean;
    attachments?: Array<TicketAttachment>;
    createdAt: Date;
  }>;
  assignedTo?: string | {
    _id: string;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };
  estimatedResolutionTime?: Date;
  resolvedAt?: Date;
  customerSatisfactionRating?: number;
  customerSatisfactionComment?: string;
  internalNotes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### PredefinedIssue Model (`/src/models/PredefinedIssue.ts`)
```typescript
interface IPredefinedIssue {
  service: TicketService;
  title: string;
  description: string;
  suggestedSolution?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  keywords: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### CannedResponse Model (`/src/models/CannedResponse.ts`)
```typescript
interface ICannedResponse {
  title: string;
  content: string;
  category: string;
  services: TicketService[];
  keywords: string[];
  isActive: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Additional Models
- **NotificationLog**: Email notification tracking
- **PaymentGateway**: Payment gateway configurations
- **UserNotificationSettings**: User-specific notification preferences
- **DashboardPreferences**: User dashboard customizations
- **KpiSettings**: KPI threshold configurations
- **UserOnboarding**: Onboarding progress tracking
- **EmailVerification**: Email verification tokens
- **SmtpSettings**: SMTP configuration
- **SchedulerSettings**: Automated task scheduling

## API Structure

### Authentication APIs (`/src/app/api/auth/`)
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - Session termination
- `GET /api/auth/me` - Current user info
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset confirmation
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/send-verification` - Resend verification email

### Sippy Integration APIs (`/src/app/api/sippy/`)
- `GET /api/sippy/account/[id]` - Account information
- `GET /api/sippy/account/[id]/balance` - Account balance
- `GET /api/sippy/account/[id]/cdrs` - Call detail records
- `GET /api/sippy/account/[id]/calls` - Active calls
- `POST /api/sippy/account/[id]/calls/disconnect` - Disconnect calls
- `GET /api/sippy/account/[id]/rates` - Account rates
- `GET /api/sippy/account/[id]/payments` - Payment history

### Payment APIs (`/src/app/api/payments/`)
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/webhook` - Payment webhook handler
- `GET /api/payments/history` - Payment history
- `POST /api/payments/test-payment` - Test payment processing
- `POST /api/payments/record-failure` - Record payment failure

### Admin APIs (`/src/app/api/admin/`)
- User management endpoints
- System configuration endpoints
- Notification management endpoints
- Rate deck management endpoints
- **🆕 Phone Number Notification APIs**:
  - `POST /api/admin/notification-logs/test-send` - Test phone number notifications
    - Support for all phone number notification types (backorder, cancellation, purchase, assignment)
    - Bulk operation testing with sample international phone numbers
    - Individual status testing for mixed result scenarios
    - Comprehensive template testing with realistic data
  - `POST /api/admin/notification-logs/resend/route` - Resend notification functionality
    - Enhanced resend support for all notification types including phone number notifications
    - [RESEND] banner insertion with robust HTML template handling
    - Fallback data generation for phone number notifications
    - Template compatibility across all email formats (table-based and div-based)

### Settings APIs (`/src/app/api/settings/`)
- `GET/PUT /api/settings/branding` - Branding configuration
- `GET/PUT /api/settings/smtp` - SMTP configuration
- `GET/PUT /api/settings/scheduler` - Scheduler settings
- `GET/PUT /api/settings/payment-gateways` - Payment gateway config

### Support Ticket APIs (`/src/app/api/tickets/` and `/src/app/api/admin/`)
- **Customer Ticket APIs**:
  - `GET/POST /api/tickets` - User ticket management with filtering and pagination
  - `GET /api/tickets/[id]` - Individual ticket retrieval with full conversation
  - `PUT /api/tickets/[id]` - Ticket updates (replies, status changes, ratings)
  - `POST /api/tickets/[id]/attachments` - File upload handling
  - `GET /api/users/assigned-numbers` - User's assigned numbers from rate deck
- **Admin Ticket APIs**:
  - `GET /api/admin/tickets` - Admin ticket overview with advanced filtering
  - `GET /api/admin/tickets/[id]` - Admin ticket detail view with internal notes
  - `PUT /api/admin/tickets/[id]` - Comprehensive ticket updates with enhanced ObjectId/email handling
    - **Assignment Management**: Ticket assignment to admin users with dual ObjectId/email lookup
    - **Status Updates**: Status changes with internal logging and automated notifications
    - **Priority Management**: Priority escalation with visual indicators and notifications
    - **Bulk Operations**: Mass ticket updates with internal note support
    - **Enhanced Error Handling**: Robust ObjectId validation and email fallback mechanisms
  - `DELETE /api/admin/tickets/[id]` - **🆕 Complete ticket deletion with comprehensive cleanup**
    - **Admin-only Access**: Strict role-based access control with admin verification
    - **Audit Trail**: Complete deletion logging with admin details and ticket metadata
    - **Attachment Tracking**: File cleanup preparation with attachment inventory
    - **Cascade Cleanup**: Full removal of ticket data, replies, and associated records
    - **Security Logging**: Detailed audit logs for compliance and forensic tracking
- **Support Management APIs**:
  - `GET/POST /api/admin/support/predefined-issues` - Predefined issues management
  - `GET/PUT/DELETE /api/admin/support/predefined-issues/[id]` - Individual issue operations
  - `GET/POST /api/admin/support/canned-responses` - Canned responses management
  - `GET/PUT/DELETE /api/admin/support/canned-responses/[id]` - Individual response operations

## Frontend Components

### UI Components (`/src/components/ui/`)
- **Base Components**: Button, Input, Card, Table, Dialog, etc.
- **Form Components**: Form, Label, Checkbox, Select, etc.
- **Navigation**: NavigationMenu, Dropdown, Tabs
- **Feedback**: Alert, Toast (Sonner), Progress
- **Layout**: Separator, Avatar, Badge
- **Custom**: BrandLogo, ThemeToggle, CountrySelector, PhoneInput

### Dashboard Components (`/src/components/dashboard/`)
- **DashboardCard**: Reusable widget container with settings
- **DashboardSettings**: Widget management and preferences
- **DateSelector**: Date range picker with progress tracking
- **KPI Widgets**: AsrWidget, AcdWidget, CostOfDayWidget, TotalMinutesWidget
- **ActiveCallsTable**: Real-time call monitoring
- **DisconnectAllButton**: Bulk call disconnection

### Feature Components
- **CDR Components** (`/src/components/cdrs/`): CdrTable, DateRangePicker
- **Call Components** (`/src/components/calls/`): ActiveCalls, CdrReports
- **Payment Components** (`/src/components/payments/`): AccountPayments, BalanceTopup
- **Rate Components** (`/src/components/rates/`): AccountRates, SmsRates, NumberRates
- **Ticket Components** (`/src/components/tickets/`): 
  - **CreateTicketForm**: Advanced service-specific ticket creation with conditional fields
  - **TicketDetail**: Modern ticket view with conversation management and satisfaction ratings
  - **TicketsList**: User ticket management with status tracking and filtering
  - **TicketStats**: Real-time statistics cards showing ticket counts by status
- **Support Components** (`/src/components/settings/`):
  - **SupportSettings**: Integrated admin support management interface
  - Predefined Issues CRUD with service categorization and priority levels
  - Canned Responses management with template variables and usage tracking
  - Search, filter, and keyword functionality for efficient management
- **User Components** (`/src/components/users/`): User management interfaces
- **Admin Components** (`/src/components/admin/`): Admin-specific interfaces
- **Settings Components** (`/src/components/settings/`): Configuration interfaces
- **Onboarding Components** (`/src/components/onboarding/`): 
  - **UserOnboardingForm**: Multi-step onboarding with full dark mode support
    - Company information step with address validation
    - Contact preferences with dynamic method addition
    - Service selection with country targeting
    - Volume and scale assessment
    - Progress indicators and step navigation
    - Form validation and error handling
    - Seamless theme transitions
  - **AdminOnboardingForm**: Administrative onboarding management
  - **AccountVerificationModal**: Enhanced verification modal with dark mode styling

### Layout Components (`/src/components/layout/`)
- **MainLayout**: Primary application layout with sidebar navigation
- **PageLayout**: Page-specific layout wrapper
- **Providers**: Theme, Auth, and Branding providers

## Authentication & Security

### Authentication Flow
1. **Login**: Email/password validation with Sippy credentials
2. **JWT Generation**: Secure token creation with user data
3. **Cookie Storage**: HTTP-only cookie for session management
4. **Middleware Protection**: Route-level authentication checks
5. **Role-based Access**: Admin/Client role enforcement

### Security Features
- **Password Hashing**: bcryptjs with salt rounds
- **JWT Tokens**: Secure token generation and validation
- **HTTP-only Cookies**: XSS protection
- **CSRF Protection**: Built-in Next.js protection
- **Input Validation**: Zod schema validation
- **Rate Limiting**: API endpoint protection
- **Secure Headers**: Security headers configuration

### Email Verification
- **Verification Tokens**: Crypto-generated secure tokens
- **Expiration Handling**: Time-based token expiration
- **Resend Functionality**: Token regeneration capability
- **Template System**: Branded verification emails

## Branding & Theming System

### Dynamic Branding Features
- **Company Information**: Name, slogan, contact details
- **Visual Assets**: Logo, favicon, custom images
- **Color Schemes**: Primary, secondary, accent colors
- **Dark Mode Support**: Separate color schemes for dark mode
- **Typography**: Custom font families and sizing
- **Visual Effects**: Animations, glass morphism, gradients
- **Custom CSS**: Advanced styling capabilities
- **Comprehensive Theme Integration**: 
  - Complete dark mode compatibility across all components
  - Enhanced onboarding process with seamless theme transitions
  - Authentication forms with responsive styling
  - Dashboard widgets with theme-aware design
  - Modal components with proper dark mode styling

### Implementation
- **CSS Variables**: Dynamic color injection
- **Theme Context**: React context for theme management
- **Component Integration**: Automatic theme application
- **Email Templates**: Branded email styling
- **Favicon Updates**: Dynamic favicon changes
- **Responsive Dark Mode**: Tailwind CSS dark mode classes with consistent styling patterns

### Dark Mode Enhancement Strategy
- **Consistent Color Patterns**: Standardized `bg-white dark:bg-gray-900` for containers
- **Border Styling**: Unified `border-gray-200 dark:border-gray-700` approach
- **Text Contrast**: Proper `text-gray-900 dark:text-gray-100` for readability
- **Form Controls**: Enhanced `bg-white dark:bg-gray-800` for inputs and selects
- **Hover States**: Theme-aware hover effects with proper contrast
- **Visual Feedback**: Consistent selection and active states across themes

### Usage Pattern
```typescript
const { company, colors, features } = useBranding();

// Use in components
<div style={{ backgroundColor: colors.primary }}>
  {company.name}
</div>
```

## Payment Processing

### Supported Gateways
- **Stripe**: Primary payment processor with webhooks
- **PayPal**: Alternative payment option
- **Square**: Point-of-sale integration
- **Razorpay**: International payment support

### Payment Flow
1. **Intent Creation**: Secure payment intent generation
2. **Client Processing**: Frontend payment form handling
3. **Webhook Processing**: Server-side payment confirmation
4. **Balance Update**: Sippy account balance synchronization
5. **Notification**: Email confirmation and logging

### Fee Structure
- **Processing Fees**: Percentage-based gateway fees
- **Fixed Fees**: Per-transaction fixed costs
- **Transparent Pricing**: Clear fee breakdown for users
- **Multi-currency**: Support for various currencies

### Payment Features
- **Saved Payment Methods**: Secure card storage
- **Payment History**: Comprehensive transaction logs
- **Invoice Generation**: PDF invoice creation
- **Refund Processing**: Automated refund handling
- **Failure Recovery**: Payment retry mechanisms

## Notification System

### Email Notifications
- **Low Balance Alerts**: Automated balance monitoring
- **Payment Confirmations**: Transaction notifications
- **Account Updates**: Status change notifications
- **System Alerts**: Maintenance and issue notifications
- **Welcome Emails**: User onboarding communications
- **🆕 Ticket Notifications**: Comprehensive ticket lifecycle notifications
  - **Ticket Created**: Automatic notifications to admins when new tickets are created
  - **Ticket Updated**: Status, priority, and assignment change notifications
  - **Ticket Resolved**: Resolution notifications with solution details
  - **Ticket Assigned**: Assignment notifications to both admin and customer
  - **Ticket Replied**: New reply notifications for conversation management
  - **Customer Satisfaction**: Rating submission notifications to admin team
  - **Internal Notes**: Admin-only internal communication notifications
- **🆕 Phone Number Lifecycle Notifications**: Complete phone number management communication
  - **Backorder Processing**: Approval/rejection notifications with bulk support
  - **Purchase Confirmations**: Single and bulk purchase notifications with detailed breakdowns
  - **Cancellation Processing**: Request approval/rejection with administrative context
  - **Administrative Assignments**: Number assignments with billing and context information
  - **Resend Functionality**: Complete resend support with [RESEND] banners and enhanced templates

### Notification Features
- **Template System**: Branded email templates with dynamic content
- **Scheduling**: Cron-based automated sending
- **Logging**: Comprehensive notification tracking with delivery status
- **User Preferences**: Customizable notification settings per user
- **SMTP Configuration**: Flexible email server setup with multiple account support
- **🆕 Service-Specific Templates**: Tailored email templates for different ticket services
- **🆕 Priority-Based Routing**: Different notification urgency based on ticket priority
- **🆕 Escalation Notifications**: Automatic escalation alerts for unresponded tickets
- **🆕 Attachment Support**: Email notifications with file attachment information

### Template System
- **Dynamic Content**: Variable-based content insertion with ticket-specific data
- **Branding Integration**: Automatic brand styling and company information
- **Multi-language**: Internationalization support for global operations
- **Responsive Design**: Mobile-friendly email layouts with modern styling
- **🆕 Ticket Template Variables**: Rich template variables for ticket notifications
  - `{{ticket_number}}`, `{{customer_name}}`, `{{service_type}}`
  - `{{priority}}`, `{{status}}`, `{{assigned_admin}}`
  - `{{resolution_time}}`, `{{satisfaction_rating}}`
  - `{{ticket_url}}`, `{{reply_content}}`, `{{attachment_count}}`
- **🆕 HTML Email Support**: Rich HTML email templates with embedded styling
- **🆕 Plain Text Fallback**: Automatic plain text generation for HTML emails

### Notification Types & Triggers

#### Customer Notifications
- **Ticket Creation Confirmation**: Immediate confirmation with ticket number and estimated resolution time
- **Status Updates**: Real-time notifications when ticket status changes
- **Admin Replies**: Instant notifications when admin responds to ticket
- **Resolution Notifications**: Detailed resolution information with solution provided
- **Assignment Changes**: Notifications when ticket is assigned to different admin
- **Reopen Confirmations**: Confirmation when customer reopens resolved tickets

#### Admin Notifications
- **New Ticket Alerts**: Immediate alerts for new customer tickets with service type and priority
- **Assignment Notifications**: Notifications when tickets are assigned to specific admins
- **Escalation Alerts**: Automatic alerts for tickets requiring urgent attention
- **Customer Replies**: Notifications when customers respond to tickets
- **Satisfaction Ratings**: Customer feedback notifications with rating details
- **Internal Note Updates**: Team collaboration notifications for internal communications

#### System Notifications
- **Bulk Operation Summaries**: Notifications for bulk ticket operations and status changes
- **Performance Metrics**: Weekly/monthly ticket resolution statistics for admins
- **SLA Breach Alerts**: Automatic alerts when tickets exceed resolution time limits
- **Attachment Security**: Notifications for suspicious file uploads or security issues

## Dashboard & Analytics

### Widget System
- **Drag & Drop**: Customizable widget positioning
- **Resizable Widgets**: Flexible sizing options
- **Widget Settings**: Individual widget configuration
- **Grid Layout**: Responsive grid system
- **Widget Categories**: Organized widget grouping

### KPI Widgets
- **ASR (Answer Seizure Ratio)**: Call success rate monitoring
- **ACD (Average Call Duration)**: Call duration analytics
- **Cost of Day**: Daily spending tracking
- **Total Minutes**: Call volume monitoring
- **Balance Widget**: Real-time balance display

### Dashboard Features
- **Real-time Updates**: Live data refreshing
- **Export Functionality**: Data export capabilities
- **Date Filtering**: Time-based data filtering
- **Performance Optimization**: Efficient data loading
- **Mobile Responsive**: Cross-device compatibility

## CDR Management

### CDR Processing
- **XML-RPC Integration**: Sippy API data retrieval
- **Optimized Parsing**: Efficient XML processing
- **Background Loading**: Progressive data loading
- **Batch Processing**: Large dataset handling
- **Error Handling**: Robust error management

### CDR Features
- **Real-time Monitoring**: Live call tracking
- **Historical Analysis**: Historical data review
- **Export Capabilities**: CSV/Excel export
- **Advanced Filtering**: Multi-criteria filtering
- **Performance Metrics**: KPI calculations

### Data Optimization
- **Account-specific Tuning**: Performance optimization per account
- **Caching Strategies**: Intelligent data caching
- **Progressive Loading**: Incremental data loading
- **Memory Management**: Efficient memory usage

## Rate Management

### Rate Deck System
- **Number Rates**: Voice call rate management
- **SMS Rates**: Text message rate management
- **User Assignment**: Rate deck assignment to users
- **Bulk Operations**: Mass rate updates
- **Import/Export**: CSV-based rate management

### Rate Features
- **Country Grouping**: Geographic rate organization
- **Rate Comparison**: Side-by-side rate analysis
- **Historical Tracking**: Rate change history
- **Validation**: Rate data validation
- **Search & Filter**: Advanced rate discovery

### Management Interface
- **Visual Rate Cards**: Intuitive rate display
- **Bulk Edit**: Mass rate modifications
- **Assignment Tracking**: User-rate relationships
- **Audit Trail**: Change tracking and logging

## Phone Number Management

### Overview
The Phone Number Management system provides comprehensive lifecycle management for phone numbers including provisioning, backorder processing, cancellations, and administrative assignments. The system features advanced email notification templates with modern, responsive design and full support for bulk operations.

### 🆕 Phone Number Notification System

#### Notification Types
1. **Backorder Request Notifications**
   - **Approval Notifications**: Confirmation when backorder requests are approved
   - **Rejection Notifications**: Detailed rejection reasons and next steps
   - **Bulk Backorder Support**: Multiple number requests with individual status tracking
   - **Mixed Results**: Partial approvals with clear status indicators for each number
   - **Administrative Context**: Admin reviewer information and processing notes

2. **Cancellation Request Notifications**
   - **Approval Confirmations**: Account removal confirmation with billing impact
   - **Rejection Notifications**: Cancellation denial with detailed reasoning
   - **Administrative Notes**: Internal admin notes and decision context
   - **Billing Impact**: Clear communication about billing changes

3. **Purchase Confirmation Notifications**
   - **Single Purchase**: Individual number purchase confirmations
   - **Bulk Purchase**: Multiple number purchase with complete list display
   - **Pricing Breakdown**: Detailed cost analysis including setup fees and monthly rates
   - **Billing Information**: Next billing date and cycle information
   - **Purchase History**: Transaction ID and purchase timeline

4. **Administrative Assignment Notifications**
   - **Assignment Confirmations**: Admin-initiated number assignments
   - **Billing Start**: Clear billing commencement information
   - **Administrative Context**: Assignment reasoning and admin information
   - **Account Integration**: Seamless account integration details

#### 🆕 Enhanced Email Template Features

##### Professional Design System
- **Modern Layouts**: Clean, professional email templates with responsive design
- **Email Client Compatibility**: Comprehensive testing across major email clients
- **MSO Optimization**: Microsoft Outlook-specific optimizations and styling
- **Mobile-first Design**: Touch-friendly interfaces with adaptive layouts
- **Progressive Enhancement**: Graceful degradation for older email clients

##### Advanced Styling Features
- **Juice CSS Integration**: Proper CSS inlining for maximum email deliverability
  - **RemoveStyleTags**: False to preserve media queries and responsive design
  - **ApplyStyleTags**: True for comprehensive CSS application
  - **PreserveMediaQueries**: True for responsive design preservation
- **Dynamic Color System**: Status-based color coding for visual clarity
  - **Green (#10b981)**: Approval and success notifications
  - **Red (#ef4444)**: Rejection and failure notifications
  - **Blue (#3b82f6)**: Assignment and informational notifications
- **Typography Integration**: Brand-consistent font families and sizing
- **Visual Hierarchy**: Clear information hierarchy with proper contrast ratios

##### Phone Number Prominence
- **Enhanced Display**: Large, prominent phone number presentation
- **Emoji Integration**: 📞 emoji for visual recognition and engagement
- **Color Coding**: Phone numbers styled to match template theme colors
- **Banner Integration**: Phone numbers featured in status banners
- **List Formatting**: Organized display for multiple phone numbers

#### 🆕 Bulk Operations Support

##### Bulk Backorder Management
- **Multiple Number Requests**: Support for requesting multiple phone numbers simultaneously
- **Individual Status Tracking**: Each number shows its own approval/rejection status
- **Mixed Result Scenarios**: Handle partial approvals with clear status indicators
- **Status Icons**: Visual indicators (✅ Approved, ❌ Rejected, ⏳ Pending)
- **Pricing Display**: Show pricing only for approved numbers
- **Scrollable Lists**: Email-compatible scrollable containers for large number lists

##### Bulk Purchase Features
- **Complete Purchase Lists**: Display all purchased numbers with details
- **International Number Support**: Multi-country number purchases with proper formatting
- **Detailed Information**: Country, type, capabilities, and pricing for each number
- **Total Cost Calculation**: Comprehensive cost breakdown for bulk purchases
- **Purchase Confirmation**: Clear confirmation with purchase ID and timeline

##### Email-Compatible Layouts
- **Table-based Structure**: Email client compatible layouts using tables
- **Responsive Containers**: Adaptive containers that work in email clients
- **Scroll Management**: Proper scroll behavior for large content areas
- **Border Handling**: Email-compatible border and spacing management
- **Content Organization**: Clear content organization with proper sectioning

#### Template Architecture

##### TypeScript Interfaces
```typescript
// Base interface for common phone number data
interface BasePhoneNumberData {
  phoneNumber: {
    number: string;
    country: string;
    numberType: string;
    monthlyRate: number;
    setupFee?: number;
    currency: string;
    capabilities: string[];
  };
  user: {
    name: string;
    email: string;
    company?: string;
  };
  branding: {
    companyName: string;
    companySlogan?: string;
    primaryColor: string;
    fontFamily: string;
  };
}

// Enhanced backorder interface with bulk support
interface BackorderNotificationData extends BasePhoneNumberData {
  request: {
    requestNumber: string;
    status: 'approved' | 'rejected';
    reviewNotes?: string;
    submittedAt: string;
    reviewedAt: string;
    reviewedBy: string;
  };
  requestType?: 'single' | 'bulk';
  numbersCount?: number;
  requestedNumbers?: Array<{
    number: string;
    country: string;
    numberType: string;
    monthlyRate: number;
    setupFee?: number;
    capabilities: string[];
    status?: 'approved' | 'rejected' | 'partial';
  }>;
}

// Enhanced purchase interface with bulk support
interface NumberPurchaseNotificationData extends BasePhoneNumberData {
  purchase: {
    purchaseId: string;
    purchaseDate: string;
    totalAmount: number;
    billingStartDate: string;
    nextBillingDate: string;
  };
  purchaseType: 'direct' | 'bulk';
  numbersCount?: number;
  purchasedNumbers?: Array<{
  number: string;
    country: string;
    numberType: string;
    monthlyRate: number;
  setupFee?: number;
    capabilities: string[];
  }>;
}
```

##### Template Generation Functions
- **generateBackorderNotificationTemplate()**: Handles both single and bulk backorder notifications
- **generateCancellationNotificationTemplate()**: Manages cancellation request notifications
- **generateNumberPurchaseNotificationTemplate()**: Processes purchase confirmations
- **generateNumberAssignmentNotificationTemplate()**: Handles administrative assignments

#### Content Management Features

##### Dynamic Content Generation
- **Conditional Sections**: Template sections that adapt based on notification type and data
- **Template Variables**: Dynamic content insertion with robust fallback handling
- **Multi-format Support**: Both HTML and plain text versions for all templates
- **Content Validation**: Proper data validation and sanitization
- **Error Handling**: Graceful error handling with fallback content

##### Internationalization Support
- **Currency Formatting**: Proper currency display using Intl.NumberFormat
- **Date Formatting**: Localized date formatting with timezone support
- **Multi-language Ready**: Template structure ready for internationalization
- **Cultural Adaptation**: Number formatting and display conventions

##### Text Version Support
- **Comprehensive Plain Text**: Complete plain text versions of all templates
- **Structured Content**: Organized plain text with clear sections and formatting
- **Phone Number Prominence**: Enhanced phone number display in text format
- **List Formatting**: Proper list formatting for bulk content in text emails
- **Fallback Content**: Robust fallback for users who cannot view HTML emails

### Integration Points

#### SMTP Service Integration
- **Category-based Routing**: Phone number notifications use SUPPORT SMTP category
- **Multi-account Support**: Intelligent routing across multiple SMTP accounts
- **Delivery Tracking**: Comprehensive delivery status tracking and logging
- **Error Handling**: Robust error handling with retry mechanisms
- **Performance Optimization**: Efficient email delivery with queue management

#### Notification Logging System
- **Comprehensive Logging**: All phone number notifications logged with detailed metadata
- **Search and Filter**: Advanced search capabilities for notification history
- **Status Tracking**: Delivery status and user interaction tracking
- **Analytics Integration**: Performance metrics and engagement analytics
- **Audit Trail**: Complete audit trail for compliance and debugging

#### Test Notification System
- **Comprehensive Testing**: Full test coverage for all phone number notification types
- **Realistic Test Data**: International sample data with proper formatting
- **Bulk Test Scenarios**: Test bulk operations with mixed results
- **Admin Testing**: Administrative testing tools for validation
- **Template Preview**: Preview capabilities for template development

### Performance Optimizations

#### Email Rendering Performance
- **Efficient Template Generation**: Optimized template rendering with minimal overhead
- **CSS Optimization**: Streamlined CSS with proper minification
- **Content Caching**: Intelligent caching for template components
- **Lazy Loading**: Progressive content loading for large number lists
- **Memory Management**: Efficient memory usage for bulk operations

#### Delivery Optimization
- **Content Optimization**: Optimized email content for fast delivery
- **Image Optimization**: Efficient image handling and optimization
- **Attachment Management**: Intelligent attachment handling and optimization
- **Queue Management**: Efficient email queue processing
- **Rate Limiting**: Proper rate limiting to prevent service issues

### Security Features

#### Content Security
- **HTML Sanitization**: Proper HTML content sanitization and validation
- **XSS Protection**: Cross-site scripting protection for dynamic content
- **Content Validation**: Comprehensive input validation and sanitization
- **Template Security**: Secure template variable handling and injection prevention
- **Data Protection**: Proper data handling and privacy protection

#### Email Security
- **SPF/DKIM Integration**: Proper email authentication setup
- **Secure Transmission**: Encrypted email transmission
- **Content Filtering**: Spam and malicious content filtering
- **Privacy Protection**: User privacy protection and data handling
- **Compliance**: Regulatory compliance for email communications

### Future Enhancements

#### Advanced Features
- **🔮 Real-time Notifications**: WebSocket integration for instant notifications
- **🔮 Advanced Analytics**: Email engagement analytics and optimization
- **🔮 A/B Testing**: Template A/B testing for optimization
- **🔮 Personalization Engine**: Advanced personalization based on user behavior
- **🔮 Multi-channel Integration**: SMS and push notification integration

#### Template Enhancements
- **🔮 Interactive Elements**: Interactive email elements for better engagement
- **🔮 Dynamic Content**: Real-time content updates and personalization
- **🔮 Advanced Layouts**: More sophisticated layout options and customization
- **🔮 Video Integration**: Video content integration for richer communications
- **🔮 AI-powered Content**: AI-generated content suggestions and optimization

## Admin Features

### User Management
- **User Creation**: Admin-driven user creation
- **Role Assignment**: Role-based access control
- **Account Verification**: User verification workflows
- **Bulk Operations**: Mass user operations
- **Activity Monitoring**: User activity tracking

### System Administration
- **Settings Management**: System configuration
- **Notification Logs**: Email notification tracking
- **Payment Gateway Config**: Payment system setup
- **SMTP Configuration**: Email server setup
- **Scheduler Management**: Automated task control

### Support Ticket Administration
- **Predefined Issues Management**: Create and manage service-specific issue templates
  - Service categorization (Outbound Calls, Inbound Calls, SMS, Number Services, Technical Support)
  - Priority levels (low, medium, high, urgent) with visual indicators
  - Suggested solutions and keywords for searchability
  - Active/inactive status management
- **Canned Responses System**: Template-based response management
  - Category organization for efficient response grouping
  - Service applicability settings for targeted responses
  - Template variables support ({{customer_name}}, {{ticket_number}}, etc.)
  - Usage tracking and analytics
  - **🆕 WysiwygEditor Integration**: Seamless canned response integration with rich text editor
    - Real-time "/" trigger detection for canned response picker
    - Smart text insertion with cursor positioning and HTML handling
    - Enhanced event handling for rich text content compatibility
    - Position persistence across browser sessions with localStorage
    - Fallback plain text insertion for enhanced reliability
- **🆕 Advanced Ticket Management**: Comprehensive admin ticket control
  - **Complete Ticket Deletion**: Admin-only ticket deletion with comprehensive cleanup
    - **Security Controls**: Strict role-based access with admin verification
    - **Audit Trail**: Complete deletion logging with admin details and ticket metadata  
    - **Attachment Cleanup**: File system cleanup preparation with attachment inventory
    - **Cascade Operations**: Full removal of ticket data, replies, and associated records
    - **Forensic Logging**: Detailed security logs for compliance and debugging
  - **Enhanced Assignment System**: Robust ticket assignment with dual lookup mechanisms
    - **ObjectId/Email Compatibility**: Seamless handling of both ObjectId and email-based assignments
    - **Fallback Mechanisms**: Intelligent fallback when ObjectId validation fails
    - **Error Recovery**: Robust error handling for mixed data scenarios
    - **Bulk Operations**: Mass assignment operations with comprehensive validation
  - **Advanced Error Handling**: Enhanced error recovery and data validation
    - **Mixed Data Types**: Support for legacy email-based assignments alongside new ObjectId system
    - **Graceful Degradation**: Seamless fallback mechanisms for compatibility
    - **Validation Chains**: Multi-level validation with intelligent error recovery
    - **Database Consistency**: Automatic data normalization and cleanup processes
- **🆕 UI/UX Improvements**: Enhanced administrative interface features
  - **Priority Column Optimization**: Streamlined ticket list view with reduced visual clutter
  - **Enhanced Table Layout**: Improved spacing and responsiveness with optimized column widths
  - **Visual Consistency**: Maintained functionality while improving information density
  - **Performance Optimization**: Reduced rendering overhead with optimized component structure
- **Support Settings Integration**: Unified settings interface
  - Integrated into main Settings page as dedicated "Support" tab
  - Search and filter capabilities across both predefined issues and canned responses
  - Modern UI with responsive design and dark mode support

### Monitoring & Analytics
- **User Attention Cards**: Users requiring attention
- **Low Balance Monitoring**: Balance alert management
- **System Health**: Application health monitoring
- **Performance Metrics**: System performance tracking

## Configuration & Settings

### Application Settings
- **Branding Configuration**: Visual customization
- **SMTP Settings**: Email server configuration
- **Payment Gateway Setup**: Payment processor configuration
- **Scheduler Settings**: Automated task configuration
- **KPI Thresholds**: Alert threshold configuration
- **Support Settings**: Ticket system configuration
  - Predefined Issues templates for common problems
  - Canned Responses for efficient customer communication
  - Service-specific categorization and filtering
  - Priority-based issue classification

### User Settings
- **Notification Preferences**: User-specific notification settings
- **Dashboard Preferences**: Widget and layout preferences
- **Account Settings**: User profile management
- **Security Settings**: Password and security configuration

### Environment Configuration
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/sippy

# Authentication
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# Sippy API
SIPPY_API_USERNAME=your-sippy-username
SIPPY_API_PASSWORD=your-sippy-password
SIPPY_API_HOST=https://your-sippy-host.com

# Payment Gateways
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Application
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

## Development & Deployment

### Development Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Project Structure
```
ovo/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── api/            # API routes
│   │   ├── dashboard/      # Dashboard pages
│   │   ├── admin/          # Admin pages
│   │   └── ...             # Other pages
│   ├── components/         # React components
│   │   ├── ui/            # Base UI components
│   │   ├── dashboard/     # Dashboard components
│   │   ├── payments/      # Payment components
│   │   └── ...            # Feature components
│   ├── lib/               # Utility libraries
│   ├── models/            # Database models
│   ├── hooks/             # Custom React hooks
│   ├── services/          # Business logic services
│   ├── contexts/          # React contexts
│   └── types/             # TypeScript type definitions
├── public/                # Static assets
├── scripts/               # Utility scripts
└── ...                    # Configuration files
```

### Deployment Considerations
- **Environment Variables**: Secure configuration management
- **Database Setup**: MongoDB deployment and configuration
- **SSL Certificates**: HTTPS configuration for production
- **Payment Webhooks**: Webhook endpoint configuration
- **Email Configuration**: SMTP server setup
- **Performance Monitoring**: Application monitoring setup
- **Backup Strategy**: Database backup procedures
- **Scaling**: Horizontal scaling considerations

### Testing Strategy
- **Unit Tests**: Component and utility testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full application flow testing
- **Payment Testing**: Payment gateway testing
- **Performance Testing**: Load and stress testing
- **Theme Testing**: Light/dark mode compatibility testing across all components
- **Onboarding Flow Testing**: Multi-step form validation and user experience testing
- **Accessibility Testing**: WCAG compliance and contrast ratio validation

### Monitoring & Logging
- **Application Logs**: Comprehensive logging system
- **Error Tracking**: Error monitoring and alerting
- **Performance Metrics**: Application performance monitoring
- **User Analytics**: User behavior tracking
- **System Health**: Infrastructure monitoring
- **Theme Usage Analytics**: Dark/light mode preference tracking
- **Onboarding Completion Metrics**: User onboarding success rate monitoring

---

## Next Version Development Considerations

### Recently Completed Enhancements ✅
1. **Comprehensive Dark Mode Support**: Complete theming system with consistent dark/light mode across all components
2. **Enhanced Onboarding System**: Multi-step user onboarding with progressive validation and theme integration
3. **Authentication Flow Improvements**: Seamless auto-login, protected OTP modals, and enhanced user experience
4. **Responsive Design**: Mobile-first approach with adaptive layouts across all interfaces
5. **Form Validation Enhancement**: Comprehensive validation with user-friendly error messaging
6. **Modal Protection**: Enhanced modal security with shake animations and proper dismissal handling
7. **🆕 Multiple SMTP Accounts System**: Advanced email management with categorized SMTP routing
8. **🆕 Advanced Tickets Management System**: Comprehensive ticket management with modern UI and admin tools
   - **Customer Interface Enhancements**: Modern ticket detail view with service information cards, conversation management, and satisfaction ratings
   - **Admin Management Tools**: Comprehensive admin interface with assignment, status updates, priority management, and internal notes
   - **Canned Response Picker**: AI-like response picker with slide-up animations, position persistence, and real-time search
   - **Modern Loader Designs**: Professional loading states with gradient spinners and progress indicators for both customer and admin views
   - **Enhanced User Experience**: Responsive design with seamless dark/light mode transitions and backdrop blur effects
   - **Service-Specific Forms**: Tailored ticket creation forms with conditional fields
   - **File Management**: Advanced file upload with drag-and-drop, preview, and management capabilities
   - **Animation System**: Smooth transitions with Framer Motion and interactive feedback elements
9. **🆕 Phone Number Management System**: Comprehensive phone number lifecycle management with advanced notifications
   - **Enhanced Email Templates**: Professional, responsive email templates with juice CSS inlining and email client compatibility
   - **Bulk Operations Support**: Complete support for bulk backorder requests and bulk purchases with individual status tracking
   - **Phone Number Prominence**: Enhanced phone number display with emoji icons, color coding, and visual emphasis
   - **Notification Types**: Backorder approval/rejection, cancellation processing, purchase confirmations, and administrative assignments
   - **Resend Functionality**: Advanced resend capabilities with [RESEND] banners and template compatibility
   - **Mixed Result Handling**: Support for partial approvals and complex scenarios in bulk operations
   - **International Support**: Multi-country phone number formatting and pricing display
   - **Template Testing**: Comprehensive test system with realistic international sample data

### Tickets Management System Features

#### Customer Experience Enhancements
- **Modern Ticket Interface**: Professional UI with backdrop blur effects and gradient elements
- **Service Information Cards**: Detailed service data presentation with call examples and assigned numbers
- **Interactive Rating System**: Customer satisfaction with star ratings, comment collection, and re-rating capability
- **Conversation Management**: Organized message display with system messages, attachments, and time indicators
- **File Attachment System**: Comprehensive file upload with drag-and-drop, preview, and download management
- **Real-time Status Updates**: Live status changes with visual indicators and progress tracking

#### Admin Management Tools
- **Comprehensive Admin Interface**: Advanced ticket management with assignment, status, and priority controls
- **Assignment System**: Ticket assignment to admin users with internal notes and role management
- **Status Lifecycle Management**: Complete status control from creation to resolution with automated notifications
- **Priority Escalation**: Four-level priority system (low, medium, high, urgent) with visual indicators
- **Internal Communication**: Admin-only notes system for team collaboration
- **Bulk Operations**: Mass ticket operations and management tools for efficiency

#### Canned Response Picker
- **AI-like Interface**: Modern response picker with intelligent search and filtering
- **Slide-up Animation**: Smooth animations using Framer Motion with spring physics
- **Position Persistence**: Remembers position and dimensions across browser sessions
- **Real-time Search**: Instant filtering with keyword matching and service targeting
- **Auto-insertion**: Smart text insertion with cursor positioning
- **Keyboard Navigation**: Full keyboard support for accessibility and efficiency

#### Modern Loader Designs
- **Multi-layered Spinners**: Professional loading states with gradient effects and animations
- **Theme-aware Styling**: Customer views use blue theme, admin views use purple theme
- **Progress Indicators**: Visual progress bars with smooth animations
- **Responsive Design**: Adaptive sizing and positioning for all screen sizes
- **Center Pulsing Elements**: Engaging loading animations with smooth transitions

#### Technical Implementation
- **Framer Motion Integration**: Advanced animations for smooth user interactions
- **Position Memory System**: localStorage-based position and dimension persistence
- **Service-specific Routing**: Intelligent routing based on ticket service types
- **File Upload Management**: Secure file handling with type validation and preview
- **Real-time Updates**: Live status changes and conversation updates
- **Theme Integration**: Complete dark/light mode compatibility with custom branding

### Planned Enhancements
1. **Real-time Features**: WebSocket integration for live updates
2. **Advanced Analytics**: Enhanced reporting and analytics
3. **Mobile App**: React Native mobile application
4. **API Versioning**: RESTful API with versioning
5. **Microservices**: Service-oriented architecture
6. **Cloud Integration**: AWS/Azure cloud services
7. **Advanced Security**: Enhanced security features
8. **Internationalization**: Multi-language support
9. **Advanced Notifications**: Push notifications and SMS
10. **AI Integration**: Machine learning for analytics

### Technical Debt
- **Code Optimization**: Performance improvements
- **Test Coverage**: Comprehensive testing suite
- **Documentation**: Enhanced code documentation
- **Security Audit**: Security vulnerability assessment
- **Accessibility**: WCAG compliance improvements

### Scalability Improvements
- **Database Optimization**: Query optimization and indexing
- **Caching Strategy**: Redis integration for caching
- **CDN Integration**: Content delivery network setup
- **Load Balancing**: Application load balancing
- **Monitoring**: Enhanced monitoring and alerting

## User Onboarding System

### Onboarding Flow
The platform features a comprehensive 4-step onboarding process designed to collect essential business information and preferences:

1. **Company Information Step**
   - Business name and address collection
   - Country selection with phone code integration
   - Address validation and formatting
   - Phone number with country code detection

2. **Contact Preferences Step**
   - Dynamic contact method addition (Phone, Email, WhatsApp, Other)
   - Custom contact method descriptions
   - Contact method validation and management
   - Preferred communication channel selection

3. **Services & Solutions Step**
   - Service selection from predefined options
   - Country targeting for location-specific services
   - Service-specific requirements collection
   - Custom service descriptions and needs assessment

4. **Volume & Scale Step**
   - Traffic volume or agent count selection
   - Measurement unit configuration (minutes, calls, SMS, agents)
   - Period specification (daily, weekly, monthly, yearly)
   - Additional requirements and notes collection

### Enhanced Features
- **Progressive Form Validation**: Step-by-step validation with clear error messaging
- **Visual Progress Tracking**: Progress indicators with completion percentage
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Dark Mode Compatibility**: Comprehensive theming support with seamless transitions
- **Data Persistence**: Form state management and validation
- **Skip Functionality**: Optional onboarding with later completion capability
- **Admin Management**: Administrative oversight and review capabilities

### Technical Implementation
- **Multi-step Form**: React Hook Form with Zod validation
- **State Management**: Centralized form state with React Context
- **Theme Integration**: Dynamic color injection with branding support
- **Country Selection**: Integrated country selector with flag and phone code display
- **Service Configuration**: Dynamic service options with country targeting
- **Volume Calculation**: Flexible measurement units and period selection

### User Experience Enhancements
- **Intuitive Navigation**: Clear step progression with back/forward controls
- **Visual Feedback**: Interactive elements with hover and selection states
- **Error Handling**: Comprehensive validation with user-friendly error messages
- **Accessibility**: Proper contrast ratios and keyboard navigation support
- **Performance**: Optimized form rendering and state management

This comprehensive documentation provides a complete overview of the Sippy Communications Management Platform, covering all aspects of the application architecture, features, and implementation details necessary for future development and maintenance. 