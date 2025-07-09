'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { NumberRateManagement } from '@/components/rates/NumberRateManagement';
import { useParams } from 'next/navigation';

export default function NumberRateManagementPage() {
  const params = useParams();
  const rateDeckId = params.id as string;

  return (
    <MainLayout>
      <PageLayout
        title="Number Rate Management"
        description="Manage individual number rates within this rate deck"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Rates', href: '/rates' },
          { label: 'Number Rate Decks', href: '/rates?tab=numbers' },
          { label: 'Manage Rates' }
        ]}
      >
        <NumberRateManagement rateDeckId={rateDeckId} />
      </PageLayout>
    </MainLayout>
  );
} 