'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { useAuth } from '@/lib/AuthContext';
import { NotificationLogs } from '@/components/admin/NotificationLogs';
import { Loader2 } from 'lucide-react';

export default function AdminNotificationsPage() {
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
        title="Notification Logs"
        description="Monitor and review email notification delivery status and logs"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Notification Logs', href: '/admin/notifications' },
        ]}
      >
        <NotificationLogs />
      </PageLayout>
    </MainLayout>
  );
} 