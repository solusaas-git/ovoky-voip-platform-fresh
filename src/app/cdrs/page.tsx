'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { CdrReports } from '@/components/calls/CdrReports';
import { useTranslations } from '@/lib/i18n';

export default function CdrsPage() {
  const { t, isLoading } = useTranslations();
  const [isReady, setIsReady] = useState(false);

  // Wait for translations to be ready
  useEffect(() => {
    if (!isLoading) {
      // Add a small delay to ensure translations are fully loaded
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Don't render until translations are ready
  if (!isReady) {
    return (
      <MainLayout>
        <PageLayout
          title="CDR Reports"
          description="Loading page content..."
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'CDR Reports' }
          ]}
        >
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </PageLayout>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageLayout
        title={t('cdrs.page.title')}
        description={t('cdrs.page.description')}
        breadcrumbs={[
          { label: t('cdrs.page.breadcrumbs.dashboard'), href: '/dashboard' },
          { label: t('cdrs.page.breadcrumbs.cdrReports') }
        ]}
      >
        <CdrReports />
      </PageLayout>
    </MainLayout>
  );
} 