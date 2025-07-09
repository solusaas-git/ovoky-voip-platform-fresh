# OVOKY - VoIP Management Platform

A comprehensive VoIP management platform built with Next.js 15, featuring user management, phone number provisioning, billing, and real-time call monitoring.

## 🚀 Features

- **User Management** - Complete user lifecycle management
- **Phone Number Management** - Purchase, assign, and manage phone numbers
- **Billing & Payments** - Integrated Stripe payments and billing
- **Call Management** - Real-time call monitoring and CDR reports
- **Admin Dashboard** - Comprehensive admin interface
- **Notifications** - Real-time push notifications
- **Ticketing System** - Built-in support ticket management
- **Rate Management** - Flexible rate deck system
- **Trunk Management** - SIP trunk configuration

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: MongoDB
- **Authentication**: JWT-based auth
- **Payments**: Stripe
- **UI**: Tailwind CSS + shadcn/ui
- **VoIP Integration**: Sippy API
- **Deployment**: Vercel

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- MongoDB
- npm or yarn

### Local Development

```bash
# Clone the repository
git clone <your-repo-url>
cd ovo

# Install dependencies
npm run install:legacy

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 🌐 Deployment

### Vercel (Recommended)

```bash
# Quick deployment
./deploy-to-vercel.sh

# Or manually
npm i -g vercel
vercel login
vercel --prod
```

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed instructions.

### Plesk

See [PLESK_DEPLOYMENT.md](./PLESK_DEPLOYMENT.md) for Plesk deployment instructions.

## ⚙️ Configuration

### Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/sippy

# Authentication
JWT_SECRET=your-jwt-secret
NEXTAUTH_SECRET=your-nextauth-secret

# Sippy API
SIPPY_API_URL=https://your-sippy-api.com/xmlapi/xmlapi
SIPPY_API_USERNAME=your-username
SIPPY_API_PASSWORD=your-password

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 📚 Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Deployment
npm run build:vercel    # Build for Vercel
npm run install:legacy  # Install with legacy peer deps

# Utilities
npm run lint            # Run ESLint
npm run create-admin    # Create admin user
```

## 🏗️ Project Structure

```
ovo/
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # React components
│   ├── lib/                 # Utilities and configurations
│   ├── models/              # MongoDB models
│   ├── services/            # Business logic services
│   └── types/               # TypeScript type definitions
├── public/                  # Static assets
├── docs/                    # Documentation
└── scripts/                 # Utility scripts
```

## 🔧 Development

### Key Components

- **Dashboard**: Real-time metrics and KPIs
- **User Management**: CRUD operations for users
- **Phone Numbers**: Purchase and assignment workflow
- **Billing**: Stripe integration for payments
- **Tickets**: Support ticket system
- **Notifications**: Real-time push notifications

### API Routes

- `/api/auth/*` - Authentication endpoints
- `/api/users/*` - User management
- `/api/phone-numbers/*` - Phone number operations
- `/api/payments/*` - Payment processing
- `/api/sippy/*` - Sippy API integration

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📊 Monitoring

- **Vercel Analytics**: Built-in performance monitoring
- **Error Tracking**: Automatic error logging
- **Real-time Metrics**: Dashboard KPIs and alerts

## 🔐 Security

- JWT-based authentication
- Environment variable encryption
- CORS configuration
- Input validation with Zod
- SQL injection prevention

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

For support and questions:
- Email: support@ovoky.io
- Documentation: See `/docs` folder
- Issues: Create a GitHub issue

## 🚀 Deployment Status

- **Production**: https://ovoky.io
- **Staging**: https://staging.ovoky.io

---

Built with ❤️ by the OVOKY team
