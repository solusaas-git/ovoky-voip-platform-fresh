'use client';

import { useTranslations } from '@/lib/i18n';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { SmsTabs } from '@/components/sms/SmsTabs';

export default function SmsPage() {
  const { t } = useTranslations();

  return (
    <MainLayout>
      <PageLayout
        title={t('sms.page.title')}
        description={t('sms.page.description')}
        breadcrumbs={[
          { label: t('sms.page.breadcrumbs.dashboard'), href: '/dashboard' },
          { label: t('sms.page.breadcrumbs.sms') }
        ]}
      >
        <SmsTabs />
      </PageLayout>
    </MainLayout>
  );
} 