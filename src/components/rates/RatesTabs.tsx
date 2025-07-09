'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from '@/lib/i18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccountRates } from './AccountRates';
import { NumberRates } from './NumberRates';
import { SmsRates } from './SmsRates';
import { Phone, Hash, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useBranding } from '@/hooks/useBranding';

export function RatesTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslations();
  
  // Get current tab from URL or default to 'calls'
  const getCurrentTab = () => {
    try {
      const tabFromUrl = searchParams.get('tab');
      const validTabs = ['calls', 'numbers', 'sms'];
      return validTabs.includes(tabFromUrl || '') ? tabFromUrl! : 'calls';
    } catch {
      return 'calls';
    }
  };

  const [activeTab, setActiveTab] = useState(() => getCurrentTab());

  // Sync state with URL changes (browser back/forward)
  useEffect(() => {
    const urlTab = getCurrentTab();
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams.get('tab')]);

  // Update URL when tab changes
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.replace(`/rates?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger 
            value="calls" 
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Phone className="h-4 w-4" />
            {t('rates.tabs.calls')}
          </TabsTrigger>
          <TabsTrigger 
            value="numbers" 
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Hash className="h-4 w-4" />
            {t('rates.tabs.numbers')}
          </TabsTrigger>
          <TabsTrigger 
            value="sms" 
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <MessageSquare className="h-4 w-4" />
            {t('rates.tabs.sms')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calls" className="space-y-6">
          <AccountRates />
        </TabsContent>

        <TabsContent value="numbers" className="space-y-6">
          <NumberRates />
        </TabsContent>

        <TabsContent value="sms" className="space-y-6">
          <SmsRates />
        </TabsContent>
      </Tabs>
    </div>
  );
} 