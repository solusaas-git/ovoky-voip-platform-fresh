'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from '@/lib/i18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminSmsProviders } from './AdminSmsProviders';
import { AdminSmsBlacklist } from './AdminSmsBlacklist';
import { AdminSmsStats } from './AdminSmsStats';
import { AdminSmsSettings } from './AdminSmsSettings';
import { AdminSmsSenderIds } from './AdminSmsSenderIds';
import { AdminSmsHistory } from './AdminSmsHistory';
import { AdminSmsQueueMonitor } from './AdminSmsQueueMonitor';
import { AdminSmsSimulation } from './AdminSmsSimulation';
import { AdminSmsBilling } from './AdminSmsBilling';
import { 
  Settings, 
  Users, 
  BarChart3, 
  Shield, 
  MessageSquare,
  Database,
  History,
  Activity,
  TestTube,
  CreditCard
} from 'lucide-react';

export function AdminSmsManagement() {
  const { t } = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('providers');

  // Valid tab values
  const validTabs = ['providers', 'sender-ids', 'blacklist', 'stats', 'billing', 'history', 'settings', 'queue', 'simulation'];

  // Initialize tab from URL on component mount
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else if (tabFromUrl && !validTabs.includes(tabFromUrl)) {
      // If invalid tab in URL, redirect to default tab
      const params = new URLSearchParams(searchParams);
      params.set('tab', 'providers');
      router.replace(`/admin/sms?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, router]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Update URL with the new tab parameter
    const params = new URLSearchParams(searchParams);
    params.set('tab', value);
    router.replace(`/admin/sms?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="providers" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">{t('admin.sms.tabs.providers')}</span>
          </TabsTrigger>
          <TabsTrigger value="sender-ids" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">{t('admin.sms.tabs.senderIds')}</span>
          </TabsTrigger>
          <TabsTrigger value="blacklist" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">{t('admin.sms.tabs.blacklist')}</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('admin.sms.tabs.stats')}</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">{t('admin.sms.tabs.history')}</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">{t('admin.sms.tabs.settings')}</span>
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">{t('admin.sms.tabs.queue')}</span>
          </TabsTrigger>
          <TabsTrigger value="simulation" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            <span className="hidden sm:inline">{t('admin.sms.tabs.simulation')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-6">
          <AdminSmsProviders />
        </TabsContent>

        <TabsContent value="sender-ids" className="space-y-6">
          <AdminSmsSenderIds />
        </TabsContent>

        <TabsContent value="blacklist" className="space-y-6">
          <AdminSmsBlacklist />
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <AdminSmsStats />
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <AdminSmsBilling />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <AdminSmsHistory />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <AdminSmsSettings />
        </TabsContent>

        <TabsContent value="queue" className="space-y-6">
          <AdminSmsQueueMonitor />
        </TabsContent>

        <TabsContent value="simulation" className="space-y-6">
          <AdminSmsSimulation />
        </TabsContent>
      </Tabs>
    </div>
  );
} 