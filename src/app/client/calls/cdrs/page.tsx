'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { CdrReports } from '@/components/calls/CdrReports';

export default function CdrReportsPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <CdrReports />
      </div>
    </MainLayout>
  );
} 