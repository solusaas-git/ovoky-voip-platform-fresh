'use client';

import { SignupForm } from '@/components/auth/SignupForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { SimpleLoadingScreen } from '@/components/SimpleLoadingScreen';
import { useBranding } from '@/lib/BrandingContext';
import { useTranslations } from '@/lib/i18n';

export default function RegisterPage() {
  const { settings, isLoading } = useBranding();
  const { t, isLoading: translationsLoading } = useTranslations();
  
  // Show loading screen until both branding and translations are ready
  if (isLoading || translationsLoading) {
    return <SimpleLoadingScreen />;
  }
  
  // Use actual branding settings
  const companyName = settings.companyName || 'OVOKY';

  return (
    <AuthLayout
      title={t('auth.register.title')}
      subtitle={t('auth.register.description')}
    >
      <SignupForm />
    </AuthLayout>
  );
} 