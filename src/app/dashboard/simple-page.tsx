'use client';

export default function SimpleDashboardPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="max-w-lg w-full p-8 bg-card border rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-4">Simple Dashboard</h1>
        <p className="mb-4">This is a simplified dashboard page.</p>
        <p>If you can see this, navigation is working correctly.</p>
      </div>
    </div>
  );
} 