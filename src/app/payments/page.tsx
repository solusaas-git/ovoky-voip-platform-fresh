'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { AccountPayments } from '@/components/payments/AccountPayments';


export default function PaymentsPage() {
  return (
    <MainLayout>
      <PageLayout
        title="Payment Management"
        description="View payment history and manage account balance"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Payments' }
        ]}
      >
        <AccountPayments />
      </PageLayout>
    </MainLayout>
  );
} 