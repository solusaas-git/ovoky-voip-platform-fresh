'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { useAuth } from '@/lib/AuthContext';
import TicketList from '@/components/tickets/TicketList';
import CreateTicketForm from '@/components/tickets/CreateTicketForm';
import { AdminTicketManagement } from '@/components/admin/AdminTicketManagement';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';

export default function TicketsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const isAdmin = user?.role === 'admin';

  const handleCreateTicket = () => {
    setShowCreateForm(true);
  };

  const handleTicketCreated = (ticketId: string) => {
    setShowCreateForm(false);
    router.push(`/support/tickets/${ticketId}`);
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
  };

  // Admin users see the full admin interface, regular users see the create form when requested
  if (showCreateForm && !isAdmin) {
    return (
      <MainLayout>
        <PageLayout
          title="Create Support Ticket"
          description="Submit a new support request with detailed information about your issue"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Support Tickets', href: '/support/tickets' },
            { label: 'Create Ticket' }
          ]}
          headerActions={
            <Button
              variant="outline"
              onClick={handleCancelCreate}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Tickets
            </Button>
          }
        >
          <CreateTicketForm
            onSuccess={handleTicketCreated}
            onCancel={handleCancelCreate}
          />
        </PageLayout>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageLayout
        title={isAdmin ? "Support Ticket Management" : "Support Tickets"}
        description={isAdmin 
          ? "Manage all support tickets across the platform with advanced admin tools"
          : "View and manage your support tickets to get help with any issues"
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Support Tickets' }
        ]}
        headerActions={
          !isAdmin ? (
            <Button
              onClick={handleCreateTicket}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Ticket
            </Button>
          ) : undefined
        }
      >
        {isAdmin ? (
          <AdminTicketManagement />
        ) : (
          <TicketList
            showCreateButton={false}
            onCreateTicket={handleCreateTicket}
          />
        )}
      </PageLayout>
    </MainLayout>
  );
} 