'use client';

import React from 'react';
import { use } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { useAuth } from '@/lib/AuthContext';
import TicketDetail from '@/components/tickets/TicketDetail';
import { AdminTicketDetail } from '@/components/admin/AdminTicketDetail';

interface TicketPageProps {
  params: Promise<{ id: string }>;
}

export default function TicketPage({ params }: TicketPageProps) {
  const { id } = use(params);
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'admin';
  
  return (
    <MainLayout>
      <PageLayout
        title={isAdmin ? "Ticket Management" : "Support Ticket"}
        description={isAdmin 
          ? "Manage individual support ticket with advanced admin tools"
          : "View ticket details and conversation history"
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Support Tickets', href: '/support/tickets' },
          { label: 'Ticket Details' }
        ]}
      >
        {isAdmin ? (
          <AdminTicketDetail ticketId={id} />
        ) : (
          <TicketDetail ticketId={id} />
        )}
      </PageLayout>
    </MainLayout>
  );
} 