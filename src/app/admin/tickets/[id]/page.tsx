'use client';

import React, { useEffect } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { useAuth } from '@/lib/AuthContext';
import { AdminTicketDetail } from '@/components/admin/AdminTicketDetail';
import { Loader2 } from 'lucide-react';

interface AdminTicketPageProps {
  params: Promise<{ id: string }>;
}

export default function AdminTicketPage({ params }: AdminTicketPageProps) {
  const { id } = use(params);
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
        title="Ticket Management"
        description="Manage individual support ticket with advanced admin tools"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Support Tickets', href: '/support/tickets' },
          { label: 'Ticket Details' }
        ]}
      >
        <AdminTicketDetail ticketId={id} />
      </PageLayout>
    </MainLayout>
  );
} 