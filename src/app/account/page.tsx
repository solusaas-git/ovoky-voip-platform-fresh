'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { UserProfileDetails } from '@/components/account/UserProfileDetails';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslations } from '@/lib/i18n';

export default function AccountPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslations();
  
  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('account.page.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('account.page.description')}
          </p>
        </div>

        <UserProfileDetails user={user} />
      </div>
    </MainLayout>
  );
} 