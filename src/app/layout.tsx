import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AuthProvider } from '@/lib/AuthContext';
import { BrandingProvider } from '@/lib/BrandingContext';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { NotificationPermissionProvider } from '@/components/notifications/NotificationPermissionProvider';
import { Toaster } from '@/components/ui/sonner';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

// Dynamic metadata will be handled by individual pages using branding context
export const metadata: Metadata = {
  title: "OVOKY - Enterprise Voice & SMS Communication Platform",
  description: "Enterprise-grade voice calls, SMS messaging, and DID numbers with global coverage, competitive rates, and carrier-grade reliability for businesses worldwide.",
  keywords: "VoIP, voice calls, SMS, DID numbers, telecommunications, enterprise communication, business phone, API",
  authors: [{ name: "OVOKY" }],
  creator: "OVOKY",
  publisher: "OVOKY",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://ovoky.io',
    title: 'Sippy Communications - Powerful Communication Management Platform',
    description: 'Enterprise-grade voice calls, SMS messaging, and DID numbers with global coverage, competitive rates, and carrier-grade reliability for businesses worldwide.',
    siteName: 'OVOKY',
    images: [
      {
        url: '/favicon.ico',
        width: 32,
        height: 32,
        alt: 'OVOKY Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sippy Communications - Powerful Communication Management Platform',
    description: 'Enterprise-grade voice calls, SMS messaging, and DID numbers with global coverage, competitive rates, and carrier-grade reliability for businesses worldwide.',
    images: ['/favicon.ico'],
  },
  icons: {
    icon: "/favicon.ico", // This will be updated dynamically by BrandingProvider
  },
  manifest: '/manifest.json',
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <SessionProvider>
          <BrandingProvider>
            <AuthProvider>
              <ThemeProvider>
                <NotificationProvider>
                  <NotificationPermissionProvider>
                {children}
                  </NotificationPermissionProvider>
                <Toaster />
                </NotificationProvider>
              </ThemeProvider>
            </AuthProvider>
          </BrandingProvider>
        </SessionProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
