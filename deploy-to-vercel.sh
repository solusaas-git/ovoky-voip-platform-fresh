#!/bin/bash

# OVOKY - Vercel Deployment Script
echo "🚀 OVOKY Vercel Deployment Script"
echo "=================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
echo "🔐 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo "Please login to Vercel:"
    vercel login
fi

# Build the project
echo "🔨 Building project for Vercel..."
npm run build:vercel

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Configure environment variables in Vercel dashboard"
echo "2. Add custom domain (ovoky.io) in Vercel settings"
echo "3. Update DNS records as instructed by Vercel"
echo ""
echo "📖 For detailed instructions, see VERCEL_DEPLOYMENT.md" 