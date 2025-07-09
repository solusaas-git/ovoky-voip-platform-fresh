import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ToastTestPanel from '@/components/notifications/ToastTestPanel';

export const metadata: Metadata = {
  title: 'Toast Notifications Demo | OVO',
  description: 'Test the sophisticated toast notification system',
};

export default function TestToastsPage() {
  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    redirect('/');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800 text-sm font-medium">
          🚧 Development Only: This page is only available in development mode for testing notifications.
        </p>
      </div>
      <ToastTestPanel />
    </div>
  );
} 