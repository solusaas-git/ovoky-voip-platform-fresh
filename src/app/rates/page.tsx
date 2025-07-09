'use client';

import { useTranslations } from '@/lib/i18n';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { RatesTabs } from '@/components/rates/RatesTabs';

export default function RatesPage() {
  const { t } = useTranslations();

  return (
    <MainLayout>
      <PageLayout
        title={t('rates.page.title')}
        description={t('rates.page.description')}
        breadcrumbs={[
          { label: t('rates.page.breadcrumbs.dashboard'), href: '/dashboard' },
          { label: t('rates.page.breadcrumbs.rates') }
        ]}
      >
        <RatesTabs />
      </PageLayout>
    </MainLayout>
  );
} 