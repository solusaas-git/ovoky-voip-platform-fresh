'use client';

import { useTranslations } from '@/lib/i18n';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { ActiveCalls } from '@/components/calls/ActiveCalls';

export default function CallsPage() {
  const { t } = useTranslations();

  return (
    <MainLayout>
      <PageLayout
        title={t('calls.page.title')}
        description={t('calls.page.description')}
        breadcrumbs={[
          { label: t('calls.page.breadcrumbs.dashboard'), href: '/dashboard' },
          { label: t('calls.page.breadcrumbs.activeCalls') }
        ]}
      >
        <ActiveCalls />
      </PageLayout>
    </MainLayout>
  );
} 