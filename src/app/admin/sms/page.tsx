'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { AdminSmsManagement } from '@/components/admin/sms/AdminSmsManagement';
import { useTranslations } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AdminSmsPage() {
  const { t } = useTranslations();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  
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
      <PageLayout
        title={t('admin.sms.title')}
        description={t('admin.sms.description')}
        breadcrumbs={[
          { label: t('admin.breadcrumbs.admin'), href: '/admin' },
          { label: t('admin.sms.title') }
        ]}
      >
        <AdminSmsManagement />
      </PageLayout>
    </MainLayout>
  );
} 