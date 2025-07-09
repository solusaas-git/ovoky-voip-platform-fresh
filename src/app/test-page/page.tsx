'use client';

export default function TestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-md rounded-lg border bg-card p-8 shadow-lg">
        <h1 className="mb-4 text-2xl font-bold">Test Page</h1>
        <p className="mb-4">This is a test page to verify navigation.</p>
        <button 
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          onClick={() => {
            console.log('Manual navigation to dashboard');
            window.location.href = '/dashboard';
          }}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
} 