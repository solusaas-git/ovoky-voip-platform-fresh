'use client';

import React from 'react';
import { AlertTriangle, Mail, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';

interface AccountSuspendedDialogProps {
  suspensionReason?: string;
  suspendedAt?: string;
  onClose?: () => void;
}

export function AccountSuspendedDialog({ 
  suspensionReason, 
  suspendedAt,
  onClose 
}: AccountSuspendedDialogProps) {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      if (onClose) onClose();
      router.push('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      // Force redirect even if logout fails
      router.push('/login');
    }
  };

  const handleContactSupport = () => {
    // You can customize this to open a support ticket or email
    window.location.href = 'mailto:support@yourcompany.com?subject=Account Suspension Appeal';
  };

  const formatSuspensionDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <CardTitle className="text-red-600">Account Suspended</CardTitle>
          <CardDescription>
            Your account access has been temporarily suspended
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Your account has been suspended and you cannot access the system.</strong>
              {suspendedAt && (
                <div className="mt-2 text-sm">
                  Suspended on: {formatSuspensionDate(suspendedAt)}
                </div>
              )}
            </AlertDescription>
          </Alert>

          {suspensionReason && (
            <div className="space-y-2">
              <h4 className="font-medium text-slate-900 dark:text-slate-100">Reason:</h4>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md border">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {suspensionReason}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="font-medium text-slate-900 dark:text-slate-100">What you can do:</h4>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-blue-500" />
                <span>Contact our support team to appeal this suspension</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-orange-500" />
                <span>Review our terms of service and acceptable use policy</span>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          <Button 
            onClick={handleContactSupport}
            className="w-full"
            variant="outline"
          >
            <Mail className="mr-2 h-4 w-4" />
            Contact Support
          </Button>
          
          <Button 
            onClick={handleLogout}
            className="w-full"
            variant="destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 