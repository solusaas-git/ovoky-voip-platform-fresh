# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for your application.

## Prerequisites

1. A Google Cloud Console account
2. Your application domain (for production) or localhost (for development)

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" and then "New Project"
3. Enter a project name (e.g., "OVOKY Auth")
4. Click "Create"

## Step 2: Enable Google+ API

1. In your Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on it and click "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" (unless you have a Google Workspace account)
3. Fill in the required information:
   - **App name**: Your app name (e.g., "OVOKY")
   - **User support email**: Your support email
   - **Developer contact email**: Your email
4. Click "Save and Continue"
5. On the "Scopes" screen, click "Save and Continue"
6. On the "Test users" screen, add test email addresses if needed
7. Click "Save and Continue"

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Set the name (e.g., "OVOKY Web Client")
5. Add authorized redirect URIs:
   - For development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://ovoky.io/api/auth/callback/google`
   
   **CRITICAL:** Make sure BOTH URIs are added for the OAuth to work in both environments!
6. Click "Create"
7. Copy the **Client ID** and **Client Secret**

## Step 5: Update Environment Variables

Add the following to your `.env` file:

```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000  # For development
# NEXTAUTH_URL=https://yourdomain.com  # For production
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

### Generating NEXTAUTH_SECRET

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Or use this online generator: https://generate-secret.vercel.app/32

## Step 6: Test the Implementation

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/login` or `/register`
3. Click the "Continue with Google" button
4. You should be redirected to Google's OAuth consent screen
5. After authorization, you'll be redirected back to your app

## Production Deployment

For production deployment:

1. Update `NEXTAUTH_URL` in your production environment variables
2. Add your production domain to the authorized redirect URIs in Google Cloud Console
3. Make sure your domain is properly configured in the OAuth consent screen

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" error**
   - Ensure the redirect URI in Google Cloud Console matches exactly
   - Format: `https://yourdomain.com/api/auth/callback/google`

2. **"access_blocked" error**
   - Your app is in testing mode and the user isn't added as a test user
   - Either add the user as a test user or publish your app

3. **NEXTAUTH_SECRET error**
   - Make sure you've set the `NEXTAUTH_SECRET` environment variable
   - Generate a new secret using the command above

4. **Cookie/Session issues**
   - Ensure `NEXTAUTH_URL` matches your actual domain
   - Check that cookies are enabled in the browser

### Development vs Production

- **Development**: Use `http://localhost:3000` for NEXTAUTH_URL
- **Production**: Use your actual domain with HTTPS

## Security Notes

1. Never commit your `.env` file to version control
2. Use different Google OAuth credentials for development and production
3. Regularly rotate your `NEXTAUTH_SECRET` and Google OAuth credentials
4. Monitor your Google Cloud Console for unusual activity

## Features Implemented

✅ Google OAuth Sign In
✅ Google OAuth Sign Up  
✅ User profile creation from Google data
✅ Email verification bypass for Google users
✅ Integration with existing user system
✅ Admin notifications for new Google registrations
✅ Session management
✅ Automatic redirect after authentication

## Database Integration

The implementation automatically:
- Creates user records in your MongoDB database
- Marks Google users as email verified
- Initializes default user preferences
- Sends admin notifications for new registrations
- Links Google accounts to existing users if email matches

Your Google OAuth authentication is now fully operational! 