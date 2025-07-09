'use client';

import { LoginForm } from '@/components/auth/LoginForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { SimpleLoadingScreen } from '@/components/SimpleLoadingScreen';
import { useBranding } from '@/lib/BrandingContext';
import { useTranslations } from '@/lib/i18n';

export default function LoginPage() {
  const { settings, isLoading } = useBranding();
  const { t, isLoading: translationsLoading } = useTranslations();
  
  // Show loading screen until both branding and translations are ready
  if (isLoading || translationsLoading) {
    return <SimpleLoadingScreen />;
  }
  
  // Use actual branding settings
  const companyName = settings.companyName || 'Sippy Communications';

  return (
    <AuthLayout
      title={t('auth.login.title')}
      subtitle={t('auth.login.description')}
      inverted={true}
    >
      <LoginForm />
    </AuthLayout>
  );
} 