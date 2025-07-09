'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { SippyApiSettings } from '@/components/settings/SippyApiSettings';
import { SmtpSettings } from '@/components/settings/SmtpSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { BrandingSettings } from '@/components/settings/BrandingSettings';
import { SchedulerSettings } from '@/components/settings/SchedulerSettings';
import { KpiMetricsSettings } from '@/components/admin/KpiMetricsSettings';
import { PaymentGatewaySettings } from '@/components/settings/PaymentGatewaySettings';
import { SupportSettings } from '@/components/settings/SupportSettings';
import { DataSettings } from '@/components/settings/DataSettings';
import { GeneralSettings } from '@/components/settings/GeneralSettings';

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  
  // Get tab from URL or default to 'general'
  const tabFromUrl = searchParams.get('tab') || 'general';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  
  // Update URL when tab changes
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newTab);
    router.replace(url.toString(), { scroll: false });
  };

  // Update activeTab when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const urlTab = searchParams.get('tab') || 'general';
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams, activeTab]);
  
  // Redirect non-admin users
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Only render content for admin users
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure system-wide settings and integrations.
          </p>
        </div>
        
        <Card className="p-6">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="mb-6">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="sippy-api">Sippy API</TabsTrigger>
              <TabsTrigger value="smtp">SMTP</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="payment-gateways">Payment Gateways</TabsTrigger>
              <TabsTrigger value="kpi-metrics">KPI Metrics</TabsTrigger>
              <TabsTrigger value="support">Support</TabsTrigger>
              <TabsTrigger value="data">Data</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="mt-0">
              <GeneralSettings />
            </TabsContent>
            
            <TabsContent value="sippy-api" className="mt-0">
              <SippyApiSettings />
            </TabsContent>
            
            <TabsContent value="smtp" className="mt-0">
              <SmtpSettings />
            </TabsContent>
            
            <TabsContent value="notifications" className="mt-0">
              <NotificationSettings />
            </TabsContent>
            
            <TabsContent value="scheduler" className="mt-0">
              <SchedulerSettings />
            </TabsContent>
            
            <TabsContent value="branding" className="mt-0">
              <BrandingSettings />
            </TabsContent>
            
            <TabsContent value="payment-gateways" className="mt-0">
              <PaymentGatewaySettings />
            </TabsContent>
            
            <TabsContent value="kpi-metrics" className="mt-0">
              <KpiMetricsSettings />
            </TabsContent>
            
            <TabsContent value="support" className="mt-0">
              <SupportSettings />
            </TabsContent>
            
            <TabsContent value="data" className="mt-0">
              <DataSettings />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </MainLayout>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
} 