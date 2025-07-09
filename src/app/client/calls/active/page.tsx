'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { ActiveCalls } from '@/components/calls/ActiveCalls';
import { useBranding } from '@/hooks/useBranding';

export default function ActiveCallsPage() {
  const { getGradientStyle, features } = useBranding();

  return (
    <MainLayout>
      <div 
        className="min-h-screen"
        style={features.gradientBackground ? getGradientStyle() : { backgroundColor: '#f8fafc' }}
      >
        <div className="max-w-7xl mx-auto p-6">
          <ActiveCalls />
        </div>
      </div>
    </MainLayout>
  );
} 