'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { SmsRateManagement } from '@/components/rates/SmsRateManagement';
import { useParams } from 'next/navigation';

export default function SmsRateManagementPage() {
  const params = useParams();
  const rateDeckId = params.id as string;

  return (
    <MainLayout>
      <PageLayout
        title="SMS Rate Management"
        description="Manage individual SMS rates within this rate deck"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Rates', href: '/rates' },
          { label: 'SMS Rate Decks', href: '/rates?tab=sms' },
          { label: 'Manage Rates' }
        ]}
      >
        <SmsRateManagement rateDeckId={rateDeckId} />
      </PageLayout>
    </MainLayout>
  );
} 