'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from '@/lib/i18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Users, FileText, Send, Settings, History } from 'lucide-react';
import { SendSms } from './SendSms';
import { SmsCampaigns } from './SmsCampaigns';
import { SmsContacts } from './SmsContacts';
import { SmsTemplates } from './SmsTemplates';
import { SmsSettings } from './SmsSettings';
import { SmsHistory } from './SmsHistory';

const VALID_TABS = ['send', 'campaigns', 'contacts', 'templates', 'history', 'settings'];
const DEFAULT_TAB = 'send';

export function SmsTabs() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get tab from URL or use default
  const urlTab = searchParams.get('tab');
  const initialTab = VALID_TABS.includes(urlTab || '') ? urlTab! : DEFAULT_TAB;
  const [activeTab, setActiveTab] = useState(initialTab);

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    router.replace(`/sms?${params.toString()}`, { scroll: false });
  };

  // Sync state with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    const validTab = VALID_TABS.includes(urlTab || '') ? urlTab! : DEFAULT_TAB;
    if (validTab !== activeTab) {
      setActiveTab(validTab);
    }
  }, [searchParams, activeTab]);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="send" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">{t('sms.tabs.send')}</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">{t('sms.tabs.campaigns')}</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{t('sms.tabs.contacts')}</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t('sms.tabs.templates')}</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">{t('sms.tabs.history')}</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">{t('sms.tabs.settings')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-6">
          <SendSms />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <SmsCampaigns />
        </TabsContent>

        <TabsContent value="contacts" className="space-y-6">
          <SmsContacts />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <SmsTemplates />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <SmsHistory />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <SmsSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
} 